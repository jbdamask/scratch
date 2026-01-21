import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import type { HistoryExchange } from "../types/session";

interface MainLayoutProps {
  children: ReactNode;
  onEditExchange?: (exchange: HistoryExchange) => void;
}

export function MainLayout({ children, onEditExchange }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuToggle = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Close sidebar with Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && sidebarOpen) {
        handleSidebarClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen, handleSidebarClose]);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      <Header onMenuToggle={handleMenuToggle} />

      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} onEditExchange={onEditExchange} />

        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8" tabIndex={-1}>
          <div className="max-w-4xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
