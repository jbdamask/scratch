import ReactMarkdown from "react-markdown";
import type { ConversationTurn } from "../types/session";

interface ConversationThreadProps {
  turns: ConversationTurn[];
  initialImageUrl?: string | null;
}

export function ConversationThread({ turns, initialImageUrl }: ConversationThreadProps) {
  if (turns.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4" role="log" aria-label="Conversation thread">
      {turns.map((turn, index) => (
        <div
          key={`${turn.timestamp}-${index}`}
          className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-xl px-4 py-3 ${
              turn.role === 'user'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-800 border border-gray-200'
            }`}
          >
            {/* Show image for user messages if present (only for first user message with image) */}
            {turn.role === 'user' && turn.imageUrl && (
              <div className="mb-2">
                <img
                  src={turn.imageUrl}
                  alt="User provided image"
                  className="max-w-full h-auto max-h-32 rounded-lg"
                />
              </div>
            )}
            {/* Show initial image on first user message if no imageUrl but we have initialImageUrl */}
            {turn.role === 'user' && !turn.imageUrl && index === 0 && initialImageUrl && (
              <div className="mb-2">
                <img
                  src={initialImageUrl}
                  alt="User provided image"
                  className="max-w-full h-auto max-h-32 rounded-lg"
                />
              </div>
            )}

            {/* Role indicator */}
            <div className={`text-xs font-medium mb-1 ${
              turn.role === 'user' ? 'text-indigo-200' : 'text-gray-500'
            }`}>
              {turn.role === 'user' ? 'You' : 'Qwen3-VL'}
            </div>

            {/* Message content */}
            {turn.role === 'assistant' ? (
              <div className="prose prose-sm max-w-none prose-gray">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="text-gray-800 leading-relaxed mb-2 last:mb-0 text-sm">
                        {children}
                      </p>
                    ),
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs">
                          {children}
                        </code>
                      ) : (
                        <code className={className}>{children}</code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="bg-gray-800 text-gray-100 rounded-lg p-3 overflow-x-auto text-xs my-2">
                        {children}
                      </pre>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-0.5 my-1 text-sm">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-0.5 my-1 text-sm">
                        {children}
                      </ol>
                    ),
                  }}
                >
                  {turn.content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className={`text-sm ${turn.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
                {turn.content}
              </p>
            )}

            {/* Timestamp */}
            <div className={`text-xs mt-2 ${
              turn.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
            }`}>
              {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
