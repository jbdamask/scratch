import type { HistoryExchange } from "../types/session";

interface HistoryItemProps {
  exchange: HistoryExchange;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (exchange: HistoryExchange) => void;
}

export function HistoryItem({ exchange, isSelected, onSelect, onEdit }: HistoryItemProps) {
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onSelect
    onEdit(exchange);
  };
  // Truncate prompt for preview (max 50 chars)
  const truncatedPrompt =
    exchange.prompt.length > 50
      ? exchange.prompt.slice(0, 50) + "..."
      : exchange.prompt;

  // Format timestamp
  const formattedTime = new Date(exchange.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedDate = new Date(exchange.timestamp).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return (
    <button
      type="button"
      onClick={() => onSelect(exchange.id)}
      className={`
        w-full text-left p-3 rounded-lg transition-colors duration-150
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        ${
          isSelected
            ? "bg-indigo-100 border border-indigo-300"
            : "bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
        }
      `}
      aria-pressed={isSelected}
      aria-label={`View exchange: ${truncatedPrompt}`}
    >
      <div className="flex items-start gap-2">
        {/* Image indicator */}
        {exchange.imageUrl && (
          <div className="flex-shrink-0 w-8 h-8 rounded bg-slate-200 overflow-hidden">
            <img
              src={exchange.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Prompt preview */}
          <p
            className={`text-sm font-medium truncate ${
              isSelected ? "text-indigo-900" : "text-slate-800"
            }`}
          >
            {truncatedPrompt}
          </p>

          {/* Timestamp and Edit Button */}
          <div className="flex items-center justify-between mt-1">
            <p
              className={`text-xs ${
                isSelected ? "text-indigo-600" : "text-slate-500"
              }`}
            >
              {formattedDate} at {formattedTime}
            </p>
            <button
              type="button"
              onClick={handleEditClick}
              className={`p-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                isSelected
                  ? "text-indigo-600 hover:text-indigo-800 hover:bg-indigo-200"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              }`}
              aria-label={`Edit prompt: ${truncatedPrompt}`}
              title="Edit and resubmit"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </button>
  );
}
