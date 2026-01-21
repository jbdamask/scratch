import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface ResponseDisplayProps {
  response: string;
  promptPreview?: string;
  imagePreviewUrl?: string | null;
}

export function ResponseDisplay({
  response,
  promptPreview,
  imagePreviewUrl,
}: ResponseDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  return (
    <section
      className="rounded-xl shadow-md border border-gray-200 bg-white overflow-hidden"
      aria-label="Model response"
    >
      {/* Prompt reference header */}
      {(promptPreview || imagePreviewUrl) && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            In response to
          </p>
          <div className="flex items-start gap-4">
            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt="Input image thumbnail"
                className="w-16 h-16 rounded-md border border-gray-200 object-cover flex-shrink-0"
              />
            )}
            {promptPreview && (
              <p className="text-sm text-gray-700 italic line-clamp-2">
                "{promptPreview.length > 150 ? `${promptPreview.substring(0, 150)}...` : promptPreview}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Response content */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
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
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-800">
              Qwen3-VL Response
            </span>
          </div>
          <button
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              copied
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
            }`}
            aria-label={copied ? "Copied to clipboard" : "Copy response to clipboard"}
          >
            {copied ? (
              <>
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
                Copied!
              </>
            ) : (
              <>
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>

        {/* Markdown rendered response */}
        <div className="prose prose-gray max-w-none">
          <ReactMarkdown
            components={{
              // Custom styling for code blocks
              pre: ({ children }) => (
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
                  {children}
                </pre>
              ),
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm">
                    {children}
                  </code>
                ) : (
                  <code className={className}>{children}</code>
                );
              },
              // Styled links
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-indigo-600 hover:text-indigo-800 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              // Styled lists
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-1 my-2">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-1 my-2">
                  {children}
                </ol>
              ),
              // Styled paragraphs
              p: ({ children }) => (
                <p className="text-gray-700 leading-relaxed mb-3 last:mb-0">
                  {children}
                </p>
              ),
              // Styled headings
              h1: ({ children }) => (
                <h1 className="text-xl font-bold text-gray-800 mt-4 mb-2">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold text-gray-800 mt-3 mb-2">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold text-gray-800 mt-2 mb-1">
                  {children}
                </h3>
              ),
              // Styled blockquotes
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-indigo-300 pl-4 italic text-gray-600 my-3">
                  {children}
                </blockquote>
              ),
            }}
          >
            {response}
          </ReactMarkdown>
        </div>
      </div>
    </section>
  );
}
