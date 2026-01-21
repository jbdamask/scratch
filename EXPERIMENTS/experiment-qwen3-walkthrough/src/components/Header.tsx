interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="bg-slate-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Toggle sidebar"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
            <h1 className="text-xl font-semibold tracking-tight">
              Qwen3-VL Showcase
            </h1>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-slate-400">
              Vision-Language Model Demo
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
