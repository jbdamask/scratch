import { useMemo, useEffect, useRef } from "react";

interface InputPreviewPanelProps {
  prompt: string;
  imageFile: File | null;
  imageUrl: string | null;
  maxPromptLength?: number;
}

export function InputPreviewPanel({
  prompt,
  imageFile,
  imageUrl,
  maxPromptLength = 4000,
}: InputPreviewPanelProps) {
  const hasPrompt = prompt.trim().length > 0;
  const isPromptOverLimit = prompt.length > maxPromptLength;
  const hasImage = imageFile !== null || (imageUrl !== null && imageUrl.trim().length > 0);
  const isReadyToSubmit = hasPrompt && !isPromptOverLimit && hasImage;

  // Track previous object URL for cleanup
  const previousUrlRef = useRef<string | null>(null);

  // Create object URL for file preview, memoized to avoid recreation
  const filePreviewUrl = useMemo(() => {
    if (imageFile) {
      return URL.createObjectURL(imageFile);
    }
    return null;
  }, [imageFile]);

  // Cleanup previous object URL when it changes
  useEffect(() => {
    const previousUrl = previousUrlRef.current;
    if (previousUrl && previousUrl !== filePreviewUrl) {
      URL.revokeObjectURL(previousUrl);
    }
    previousUrlRef.current = filePreviewUrl;

    // Cleanup on unmount
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  // Use file preview URL if available, otherwise use the URL prop
  const imagePreviewUrl = filePreviewUrl ?? imageUrl;

  const validationMessages: string[] = [];
  if (!hasImage) {
    validationMessages.push("Please add an image (upload a file or provide a URL)");
  }
  if (!hasPrompt) {
    validationMessages.push("Please enter a text prompt");
  }
  if (isPromptOverLimit) {
    validationMessages.push(`Prompt exceeds maximum length of ${maxPromptLength.toLocaleString()} characters`);
  }

  return (
    <section
      className={`rounded-xl shadow-md border p-6 transition-colors ${
        isReadyToSubmit
          ? "bg-green-50 border-green-300"
          : "bg-white border-gray-200"
      }`}
      aria-label="Input preview panel"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Input Preview</h2>
        {isReadyToSubmit ? (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Ready to submit
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Incomplete
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Image Preview */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Image</h3>
          {hasImage && imagePreviewUrl ? (
            <div className="relative">
              <img
                src={imagePreviewUrl}
                alt="Selected image preview"
                className="max-w-full max-h-48 rounded-lg border border-gray-200 object-contain"
              />
              {imageFile && (
                <p className="mt-2 text-xs text-gray-500 truncate">
                  {imageFile.name}
                </p>
              )}
              {imageUrl && !imageFile && (
                <p className="mt-2 text-xs text-gray-500 truncate" title={imageUrl}>
                  {imageUrl.length > 50 ? `${imageUrl.substring(0, 50)}...` : imageUrl}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
              <div className="text-center">
                <svg
                  className="mx-auto w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="mt-1 text-sm text-gray-500">No image selected</p>
              </div>
            </div>
          )}
        </div>

        {/* Text Prompt Preview */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Text Prompt</h3>
          {hasPrompt ? (
            <div
              className={`p-4 rounded-lg border ${
                isPromptOverLimit
                  ? "bg-red-50 border-red-300"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <p
                className={`text-sm whitespace-pre-wrap break-words ${
                  isPromptOverLimit ? "text-red-700" : "text-gray-700"
                }`}
              >
                {prompt.length > 500 ? `${prompt.substring(0, 500)}...` : prompt}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                {prompt.length.toLocaleString()} / {maxPromptLength.toLocaleString()} characters
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
              <div className="text-center">
                <svg
                  className="mx-auto w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                <p className="mt-1 text-sm text-gray-500">No prompt entered</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Validation Messages */}
      {validationMessages.length > 0 && (
        <div
          className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg"
          role="alert"
          aria-live="polite"
        >
          <div className="flex gap-2">
            <svg
              className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-amber-800">
                To submit, please complete the following:
              </h4>
              <ul className="mt-1 list-disc list-inside text-sm text-amber-700">
                {validationMessages.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
