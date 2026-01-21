import { useState, useEffect, useRef } from "react";

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = "Processing your request..." }: LoadingSpinnerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const startTime = Date.now();
    startTimeRef.current = startTime;

    // Start from 0 - this is the initial state already
    const interval = setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      role="status"
      aria-live="polite"
      aria-label="Loading response"
    >
      <div className="flex flex-col items-center space-y-4">
        {/* Spinner animation */}
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 rounded-full bg-blue-100"></div>
          </div>
        </div>

        {/* Loading message */}
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700">{message}</p>
          <p className="mt-1 text-sm text-gray-500">
            Elapsed time: <span className="font-mono">{formatTime(elapsedTime)}</span>
          </p>
        </div>

        {/* Progress indicator dots */}
        <div className="flex space-x-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.3s]"></span>
          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.15s]"></span>
          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-600"></span>
        </div>

        {/* Helpful message for long waits */}
        {elapsedTime >= 30 && (
          <p className="text-sm text-amber-600">
            Taking longer than expected. Large images or complex prompts may require more processing time.
          </p>
        )}
      </div>
    </div>
  );
}
