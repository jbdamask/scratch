import { useState, useMemo, useCallback, useEffect } from "react";
import { MainLayout } from "./components/MainLayout";
import { WelcomeSection } from "./components/WelcomeSection";
import { CapabilitiesSection } from "./components/CapabilitiesSection";
import { UseCasesSection } from "./components/UseCasesSection";
import { CodeExamplesPanel } from "./components/CodeExamplesPanel";
import { PresetPrompts } from "./components/PresetPrompts";
import { TextPromptInput } from "./components/TextPromptInput";
import { ImageInput } from "./components/ImageInput";
import { InputPreviewPanel } from "./components/InputPreviewPanel";
import { ResponseDisplay } from "./components/ResponseDisplay";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ErrorMessage, ValidationError } from "./components/ErrorMessage";
import { ConversationThread } from "./components/ConversationThread";
import { FollowUpInput } from "./components/FollowUpInput";
import { generateCompletion } from "./utils/api";
import { useSession } from "./hooks/useSession";
import type { HistoryExchange } from "./types/session";

function App() {
  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Response state for displaying model output
  const [response, setResponse] = useState<string | null>(null);
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState<string | null>(null);
  const [lastSubmittedImageUrl, setLastSubmittedImageUrl] = useState<string | null>(null);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // For editing a previous prompt - use a key to force ImageInput remount
  const [imageInputKey, setImageInputKey] = useState(0);
  const [imageInputInitialUrl, setImageInputInitialUrl] = useState<string | null>(null);

  // Session context for history management
  const { addExchange, addFollowUpToExchange, selectedExchangeId, getExchangeById, selectExchange } = useSession();

  // Get the selected exchange from history
  const selectedExchange = selectedExchangeId ? getExchangeById(selectedExchangeId) : null;

  // Display values - either from selected exchange or current state
  const displayResponse = selectedExchange?.response ?? response;
  const displayPrompt = selectedExchange?.prompt ?? lastSubmittedPrompt;
  const displayImageUrl = selectedExchange?.imageUrl ?? lastSubmittedImageUrl;

  // Clear selection when user starts typing a new prompt
  useEffect(() => {
    if (prompt.trim() && selectedExchangeId) {
      selectExchange(null);
    }
  }, [prompt, selectedExchangeId, selectExchange]);

  // Create a preview URL for the submitted image file
  const responseImageUrl = useMemo(() => {
    // Use imageUrl if available, otherwise create object URL for file
    if (displayImageUrl) {
      return displayImageUrl;
    }
    return null;
  }, [displayImageUrl]);

  const handlePromptChange = (newPrompt: string) => {
    setPrompt(newPrompt);
  };

  // Validate inputs before submission
  const validateInputs = useCallback((): string[] => {
    const errors: string[] = [];

    if (!prompt.trim()) {
      errors.push("Please enter a text prompt");
    }

    if (prompt.length > 4000) {
      errors.push("Prompt exceeds maximum length of 4000 characters");
    }

    return errors;
  }, [prompt]);

  const handlePromptSubmit = useCallback(async (submittedPrompt: string) => {
    // Validate inputs first
    const errors = validateInputs();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Clear previous errors and start loading
    setValidationErrors([]);
    setError(null);
    setIsLoading(true);

    // Store the submitted prompt and image for the response display
    setLastSubmittedPrompt(submittedPrompt);

    // Store image URL for response display context
    let currentImageUrl: string | null = null;
    if (imageFile) {
      currentImageUrl = URL.createObjectURL(imageFile);
      setLastSubmittedImageUrl(currentImageUrl);
    } else if (imageUrl) {
      currentImageUrl = imageUrl;
      setLastSubmittedImageUrl(imageUrl);
    } else {
      setLastSubmittedImageUrl(null);
    }

    try {
      // Prepare image data for API call
      let imageData: { type: "file"; file: File } | { type: "url"; url: string } | undefined;
      if (imageFile) {
        imageData = { type: "file", file: imageFile };
      } else if (imageUrl) {
        imageData = { type: "url", url: imageUrl };
      }

      // Call the API
      const result = await generateCompletion(submittedPrompt, imageData);
      setResponse(result.content);

      // Add to session history
      addExchange({
        prompt: submittedPrompt,
        response: result.content,
        imageUrl: currentImageUrl,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      setResponse(null);
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, imageUrl, validateInputs, addExchange]);

  const handleRetry = useCallback(() => {
    if (lastSubmittedPrompt) {
      handlePromptSubmit(lastSubmittedPrompt);
    }
  }, [lastSubmittedPrompt, handlePromptSubmit]);

  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  // Handle follow-up prompts that continue the conversation
  const handleFollowUpSubmit = useCallback(async (followUpPrompt: string) => {
    if (!selectedExchange) return;

    setError(null);
    setIsLoading(true);

    try {
      // Call the API with conversation history for context
      const result = await generateCompletion(
        followUpPrompt,
        undefined, // No new image for follow-ups
        selectedExchange.conversationHistory
      );

      // Add the follow-up to the existing exchange
      addFollowUpToExchange(selectedExchange.id, followUpPrompt, result.content);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedExchange, addFollowUpToExchange]);

  const handleImageChange = (data: { file: File | null; url: string | null }) => {
    setImageFile(data.file);
    setImageUrl(data.url);

    if (data.file) {
      console.log("Image file uploaded:", data.file.name);
    } else if (data.url) {
      console.log("Image URL provided:", data.url);
    } else {
      console.log("Image cleared");
    }
  };

  // Handle editing a previous exchange - populate inputs with previous prompt/image
  const handleEditExchange = useCallback((exchange: HistoryExchange) => {
    // Populate the prompt input with the previous prompt
    setPrompt(exchange.prompt);

    // Clear any selected exchange so we're in "new" mode
    selectExchange(null);

    // Clear previous response state
    setResponse(null);
    setLastSubmittedPrompt(null);
    setLastSubmittedImageUrl(null);
    setError(null);
    setValidationErrors([]);

    // If the exchange had an image URL (not a blob URL), set it for editing
    // Blob URLs from file uploads won't work (they're temporary), but regular URLs will
    if (exchange.imageUrl && !exchange.imageUrl.startsWith("blob:")) {
      setImageInputInitialUrl(exchange.imageUrl);
    } else {
      // Clear any previous initial URL
      setImageInputInitialUrl(null);
    }
    // Increment key to force remount of ImageInput with new initial state
    setImageInputKey((prev) => prev + 1);
    // Clear the current image state as well
    setImageFile(null);
    setImageUrl(null);
  }, [selectExchange]);

  // Handle selecting a preset prompt - populate inputs with preset values
  const handleSelectPreset = useCallback((presetPrompt: string, presetImageUrl: string) => {
    // Populate the prompt input
    setPrompt(presetPrompt);

    // Clear any selected exchange so we're in "new" mode
    selectExchange(null);

    // Clear previous response state
    setResponse(null);
    setLastSubmittedPrompt(null);
    setLastSubmittedImageUrl(null);
    setError(null);
    setValidationErrors([]);

    // Set the preset image URL
    setImageInputInitialUrl(presetImageUrl);
    // Increment key to force remount of ImageInput with new initial state
    setImageInputKey((prev) => prev + 1);
    // Clear the current image state as well
    setImageFile(null);
    setImageUrl(null);
  }, [selectExchange]);

  return (
    <MainLayout onEditExchange={handleEditExchange}>
      <div className="space-y-6">
        <WelcomeSection />
        <CapabilitiesSection />
        <UseCasesSection />
        <PresetPrompts
          onSelectPreset={handleSelectPreset}
          disabled={isLoading}
        />
        <CodeExamplesPanel />
        <ImageInput
          key={imageInputKey}
          onImageChange={handleImageChange}
          initialUrl={imageInputInitialUrl}
        />
        <TextPromptInput
          onSubmit={handlePromptSubmit}
          onChange={handlePromptChange}
          value={prompt}
        />
        <InputPreviewPanel
          prompt={prompt}
          imageFile={imageFile}
          imageUrl={imageUrl}
        />

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <ValidationError errors={validationErrors} />
        )}

        {/* Loading state */}
        {isLoading && (
          <LoadingSpinner message="Qwen3-VL is analyzing your input..." />
        )}

        {/* Error state */}
        {error && !isLoading && (
          <ErrorMessage
            title="API Error"
            message={error}
            onRetry={handleRetry}
            onDismiss={handleDismissError}
          />
        )}

        {/* Conversation display - show multi-turn thread for selected exchange */}
        {selectedExchange && selectedExchange.conversationHistory.length > 0 && !isLoading && (
          <section
            className="rounded-xl shadow-md border border-gray-200 bg-white overflow-hidden"
            aria-label="Conversation"
          >
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <span className="text-sm font-semibold text-gray-800">
                  Conversation ({selectedExchange.conversationHistory.length / 2} exchange{selectedExchange.conversationHistory.length > 2 ? 's' : ''})
                </span>
              </div>
            </div>
            <div className="p-6">
              <ConversationThread
                turns={selectedExchange.conversationHistory}
                initialImageUrl={selectedExchange.imageUrl}
              />
              <FollowUpInput
                onSubmit={handleFollowUpSubmit}
                disabled={isLoading}
                placeholder="Ask a follow-up question about this conversation..."
              />
            </div>
          </section>
        )}

        {/* Response display - show for current (non-selected) response only */}
        {displayResponse && !isLoading && !selectedExchange && (
          <ResponseDisplay
            response={displayResponse}
            promptPreview={displayPrompt ?? undefined}
            imagePreviewUrl={responseImageUrl}
          />
        )}
      </div>
    </MainLayout>
  );
}

export default App;
