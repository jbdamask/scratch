import { useRef, useEffect } from "react";
import { useSession } from "../hooks/useSession";
import { HistoryItem } from "./HistoryItem";
import { ExportButton } from "./ExportButton";
import type { HistoryExchange } from "../types/session";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onEditExchange?: (exchange: HistoryExchange) => void;
}

export function Sidebar({ isOpen, onClose, onEditExchange }: SidebarProps) {
  const { exchanges, selectedExchangeId, selectExchange } = useSession();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus close button when sidebar opens on mobile
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  const handleSelectExchange = (id: string) => {
    selectExchange(id);
    // Close sidebar on mobile when selecting an item
    onClose();
  };

  const handleEditExchange = (exchange: HistoryExchange) => {
    onEditExchange?.(exchange);
    // Close sidebar on mobile when editing
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 bottom-0 left-0 z-30 w-64 bg-slate-50 border-r border-slate-200
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        aria-label="Session history"
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                Session History
              </h2>
              <div className="flex items-center gap-2">
                <ExportButton exchanges={exchanges} />
                {/* Close button for mobile */}
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onClose}
                  className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Close sidebar"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            {exchanges.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                {exchanges.length} exchange{exchanges.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {exchanges.length === 0 ? (
              <div className="text-sm text-slate-500 italic py-4 text-center">
                No conversations yet. Start by entering a prompt!
              </div>
            ) : (
              <ul className="space-y-2" role="list" aria-label="Conversation history">
                {exchanges.map((exchange) => (
                  <li key={exchange.id}>
                    <HistoryItem
                      exchange={exchange}
                      isSelected={exchange.id === selectedExchangeId}
                      onSelect={handleSelectExchange}
                      onEdit={handleEditExchange}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
