import { useState, useRef, useEffect } from "react";
import type { HistoryExchange, ConversationTurn } from "../types/session";

interface ExportButtonProps {
  exchanges: HistoryExchange[];
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function generateFilename(extension: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `qwen3-vl-conversation-${year}${month}${day}-${hours}${minutes}${seconds}.${extension}`;
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatTurnToText(turn: ConversationTurn): string {
  const role = turn.role === "user" ? "User" : "Assistant";
  const time = formatTimestamp(turn.timestamp);
  let text = `[${time}] ${role}:\n${turn.content}`;
  if (turn.imageUrl) {
    text += `\n(Image: ${turn.imageUrl})`;
  }
  return text;
}

function exchangeToText(exchange: HistoryExchange): string {
  const lines: string[] = [];
  lines.push(`=== Conversation started at ${formatTimestamp(exchange.timestamp)} ===\n`);

  if (exchange.conversationHistory.length > 0) {
    // Use conversation history for multi-turn conversations
    for (const turn of exchange.conversationHistory) {
      lines.push(formatTurnToText(turn));
      lines.push("");
    }
  } else {
    // Fallback for exchanges without conversation history
    lines.push(`[${formatTimestamp(exchange.timestamp)}] User:`);
    lines.push(exchange.prompt);
    if (exchange.imageUrl) {
      lines.push(`(Image: ${exchange.imageUrl})`);
    }
    lines.push("");
    lines.push(`[${formatTimestamp(exchange.timestamp)}] Assistant:`);
    lines.push(exchange.response);
    lines.push("");
  }

  return lines.join("\n");
}

function exportAsJson(exchanges: HistoryExchange[]): void {
  const data = {
    exportedAt: new Date().toISOString(),
    applicationName: "Qwen3-VL Showcase",
    totalExchanges: exchanges.length,
    conversations: exchanges.map((exchange) => ({
      id: exchange.id,
      startedAt: new Date(exchange.timestamp).toISOString(),
      initialPrompt: exchange.prompt,
      initialResponse: exchange.response,
      imageUrl: exchange.imageUrl,
      conversationHistory: exchange.conversationHistory.map((turn) => ({
        role: turn.role,
        content: turn.content,
        imageUrl: turn.imageUrl,
        timestamp: new Date(turn.timestamp).toISOString(),
      })),
    })),
  };

  const content = JSON.stringify(data, null, 2);
  downloadFile(content, generateFilename("json"), "application/json");
}

function exportAsText(exchanges: HistoryExchange[]): void {
  const header = [
    "Qwen3-VL Showcase - Conversation Transcript",
    `Exported at: ${new Date().toLocaleString()}`,
    `Total conversations: ${exchanges.length}`,
    "",
    "=" .repeat(60),
    "",
  ].join("\n");

  const content = header + exchanges.map(exchangeToText).join("\n" + "-".repeat(60) + "\n\n");
  downloadFile(content, generateFilename("txt"), "text/plain");
}

export function ExportButton({ exchanges }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on escape key and handle arrow key navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % 2);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + 2) % 2);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  // Focus the menu item when focusedIndex changes
  useEffect(() => {
    if (isOpen && menuItemRefs.current[focusedIndex]) {
      menuItemRefs.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  // Toggle handler that resets focus index when opening
  const handleToggle = () => {
    if (!isOpen) {
      setFocusedIndex(0);
    }
    setIsOpen(!isOpen);
  };

  const handleExportJson = () => {
    exportAsJson(exchanges);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleExportText = () => {
    exportAsText(exchanges);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const isDisabled = exchanges.length === 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={isDisabled}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md
          transition-colors
          ${
            isDisabled
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          }
        `}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Export conversation history"
      >
        {/* Download icon */}
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
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Export
        {/* Chevron icon */}
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-50"
          role="menu"
          aria-orientation="vertical"
          aria-label="Export format options"
        >
          <button
            ref={(el) => { menuItemRefs.current[0] = el; }}
            type="button"
            onClick={handleExportJson}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            role="menuitem"
            tabIndex={focusedIndex === 0 ? 0 : -1}
          >
            {/* JSON icon */}
            <svg
              className="w-4 h-4 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            Export as JSON
          </button>
          <button
            ref={(el) => { menuItemRefs.current[1] = el; }}
            type="button"
            onClick={handleExportText}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            role="menuitem"
            tabIndex={focusedIndex === 1 ? 0 : -1}
          >
            {/* Text icon */}
            <svg
              className="w-4 h-4 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export as Text
          </button>
        </div>
      )}
    </div>
  );
}
