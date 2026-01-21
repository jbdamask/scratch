import { useState } from "react";

interface TextPromptInputProps {
  onSubmit?: (prompt: string) => void;
  onChange?: (prompt: string) => void;
  value?: string;
  disabled?: boolean;
  maxLength?: number;
}

export function TextPromptInput({
  onSubmit,
  onChange,
  value,
  disabled = false,
  maxLength = 4000,
}: TextPromptInputProps) {
  const [internalPrompt, setInternalPrompt] = useState("");

  // Support both controlled and uncontrolled modes
  const prompt = value !== undefined ? value : internalPrompt;
  const setPrompt = (newValue: string) => {
    if (value === undefined) {
      setInternalPrompt(newValue);
    }
    onChange?.(newValue);
  };

  const characterCount = prompt.length;
  const isOverLimit = characterCount > maxLength;
  const isEmpty = prompt.trim().length === 0;
  const canSubmit = !isEmpty && !isOverLimit && !disabled;

  const handleSubmit = () => {
    if (canSubmit && onSubmit) {
      onSubmit(prompt);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Enter Your Prompt
      </h2>

      <div className="space-y-4">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Describe what you want to know about the image... (e.g., 'What objects are in this image?' or 'Describe the scene in detail')"
            className={`w-full h-32 px-4 py-3 rounded-lg border text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 transition-colors ${
              isOverLimit
                ? "border-red-400 focus:ring-red-400 focus:border-red-400"
                : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
            } ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
            aria-label="Text prompt input"
            aria-describedby="character-count"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span
              id="character-count"
              className={`text-sm ${
                isOverLimit ? "text-red-500 font-medium" : "text-gray-500"
              }`}
            >
              {characterCount.toLocaleString()} / {maxLength.toLocaleString()}{" "}
              characters
            </span>
            {isOverLimit && (
              <span className="text-sm text-red-500">
                Prompt exceeds maximum length
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:inline">
              Ctrl+Enter to submit
            </span>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                canSubmit
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
              aria-label="Submit prompt"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
