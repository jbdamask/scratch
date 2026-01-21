import { useState, useRef, useCallback, useEffect } from "react";

type InputMode = "file" | "url";

interface ImageInputProps {
  onImageChange?: (data: { file: File | null; url: string | null }) => void;
  disabled?: boolean;
  initialUrl?: string | null;
}

const ACCEPTED_FORMATS = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Basic URL validation regex
const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export function ImageInput({
  onImageChange,
  disabled = false,
  initialUrl,
}: ImageInputProps) {
  // If initialUrl is provided, start in URL mode with that value
  const [mode, setMode] = useState<InputMode>(initialUrl ? "url" : "file");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState(initialUrl ?? "");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlPreviewValid, setUrlPreviewValid] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return "Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File is too large. Maximum size is 10MB.";
    }
    return null;
  };

  const validateUrl = (url: string): string | null => {
    if (!url.trim()) {
      return null; // Empty is not an error, just not valid
    }
    if (!URL_REGEX.test(url)) {
      return "Please enter a valid URL starting with http:// or https://";
    }
    return null;
  };

  const handleFile = useCallback(
    (newFile: File) => {
      const validationError = validateFile(newFile);
      if (validationError) {
        setFileError(validationError);
        return;
      }

      setFileError(null);
      setFile(newFile);

      // Create preview URL
      const objectUrl = URL.createObjectURL(newFile);
      setFilePreview(objectUrl);

      onImageChange?.({ file: newFile, url: null });
    },
    [onImageChange]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  const handleClearFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setFile(null);
    setFilePreview(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onImageChange?.({ file: null, url: null });
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle URL input changes
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setImageUrl(url);
    setUrlPreviewValid(false);

    const error = validateUrl(url);
    setUrlError(error);

    if (!url.trim()) {
      onImageChange?.({ file: null, url: null });
    }
  };

  // When URL image loads successfully
  const handleUrlImageLoad = () => {
    setUrlPreviewValid(true);
    setUrlError(null);
    onImageChange?.({ file: null, url: imageUrl });
  };

  // When URL image fails to load
  const handleUrlImageError = () => {
    setUrlPreviewValid(false);
    if (imageUrl.trim() && !urlError) {
      setUrlError("Could not load image from this URL");
    }
  };

  const handleClearUrl = () => {
    setImageUrl("");
    setUrlError(null);
    setUrlPreviewValid(false);
    onImageChange?.({ file: null, url: null });
  };

  // Handle mode change
  const handleModeChange = (newMode: InputMode) => {
    if (newMode === mode) return;

    // Clear current state when switching modes
    if (mode === "file" && file) {
      handleClearFile();
    } else if (mode === "url" && imageUrl) {
      handleClearUrl();
    }

    setMode(newMode);
  };

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  return (
    <section className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Image</h2>

      {/* Mode Toggle */}
      <div
        className="flex rounded-lg border border-gray-200 p-1 mb-4 bg-gray-50"
        role="tablist"
        aria-label="Image input mode"
      >
        <button
          role="tab"
          aria-selected={mode === "file"}
          aria-controls="file-upload-panel"
          onClick={() => handleModeChange("file")}
          disabled={disabled}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            mode === "file"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          Upload File
        </button>
        <button
          role="tab"
          aria-selected={mode === "url"}
          aria-controls="url-input-panel"
          onClick={() => handleModeChange("url")}
          disabled={disabled}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            mode === "url"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          From URL
        </button>
      </div>

      {/* File Upload Panel */}
      {mode === "file" && (
        <div id="file-upload-panel" role="tabpanel" aria-labelledby="file-tab">
          {!file ? (
            <div
              onClick={handleClick}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50"
                  : disabled
                    ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                    : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
              }`}
              role="button"
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !disabled) {
                  e.preventDefault();
                  handleClick();
                }
              }}
              aria-label="Upload image area. Click or drag and drop an image file."
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileInput}
                disabled={disabled}
                className="hidden"
                aria-hidden="true"
              />

              <div className="space-y-3">
                <div
                  className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
                    isDragging ? "bg-indigo-100" : "bg-gray-100"
                  }`}
                >
                  <svg
                    className={`w-6 h-6 ${isDragging ? "text-indigo-600" : "text-gray-400"}`}
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
                </div>

                <div>
                  <p className="text-gray-600">
                    <span className="text-indigo-600 font-medium">
                      Click to upload
                    </span>{" "}
                    or drag and drop
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    JPG, PNG, GIF, or WebP (max 10MB)
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative inline-block">
                <img
                  src={filePreview!}
                  alt="Uploaded image preview"
                  className="max-w-full max-h-64 rounded-lg border border-gray-200 object-contain"
                />
                <button
                  onClick={handleClearFile}
                  disabled={disabled}
                  className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors ${
                    disabled
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  }`}
                  aria-label="Remove uploaded image"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <p className="font-medium truncate max-w-xs">{file.name}</p>
                  <p className="text-gray-400">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={handleClearFile}
                  disabled={disabled}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    disabled
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                  }`}
                  aria-label="Clear uploaded image"
                >
                  Clear Image
                </button>
              </div>
            </div>
          )}

          {fileError && (
            <div
              className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
              role="alert"
            >
              {fileError}
            </div>
          )}
        </div>
      )}

      {/* URL Input Panel */}
      {mode === "url" && (
        <div id="url-input-panel" role="tabpanel" aria-labelledby="url-tab">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="image-url-input"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Image URL
              </label>
              <div className="flex gap-2">
                <input
                  id="image-url-input"
                  type="url"
                  value={imageUrl}
                  onChange={handleUrlChange}
                  disabled={disabled}
                  placeholder="https://example.com/image.jpg"
                  className={`flex-1 px-4 py-2 border rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    urlError
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300 bg-white"
                  } ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  aria-describedby={urlError ? "url-error" : undefined}
                  aria-invalid={!!urlError}
                />
                {imageUrl && (
                  <button
                    onClick={handleClearUrl}
                    disabled={disabled}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      disabled
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                    }`}
                    aria-label="Clear URL"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Enter a direct link to an image (JPG, PNG, GIF, or WebP)
              </p>
            </div>

            {urlError && (
              <div
                id="url-error"
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
                role="alert"
              >
                {urlError}
              </div>
            )}

            {/* URL Image Preview */}
            {imageUrl && !urlError && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Preview</p>
                <div className="relative inline-block">
                  <img
                    src={imageUrl}
                    alt="URL image preview"
                    className={`max-w-full max-h-64 rounded-lg border object-contain ${
                      urlPreviewValid ? "border-green-300" : "border-gray-200"
                    }`}
                    onLoad={handleUrlImageLoad}
                    onError={handleUrlImageError}
                  />
                  {urlPreviewValid && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
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
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
