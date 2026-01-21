import { useState } from "react";

interface CodeExampleProps {
  language: string;
  title: string;
  code: string;
}

function CodeExample({ language, title, code }: CodeExampleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-gray-100 px-4 py-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
            {language}
          </span>
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
        <button
          onClick={handleCopy}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
            copied
              ? "bg-green-100 text-green-700"
              : "bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-gray-200"
          }`}
          aria-label={copied ? "Copied to clipboard" : `Copy ${language} code`}
        >
          {copied ? (
            <>
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Copied!
            </>
          ) : (
            <>
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
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const pythonExample = `import requests
import base64

# API endpoint
API_URL = "https://your-api-endpoint.com/api/generate"

# Option 1: Using an image URL
def analyze_image_url(prompt: str, image_url: str) -> str:
    response = requests.post(
        API_URL,
        json={
            "prompt": prompt,
            "image": {
                "type": "url",
                "url": image_url
            }
        }
    )
    response.raise_for_status()
    return response.json()["content"]

# Option 2: Using a local image file
def analyze_image_file(prompt: str, image_path: str) -> str:
    with open(image_path, "rb") as f:
        image_base64 = base64.b64encode(f.read()).decode("utf-8")

    response = requests.post(
        API_URL,
        json={
            "prompt": prompt,
            "image": {
                "type": "file",
                "data": f"data:image/jpeg;base64,{image_base64}"
            }
        }
    )
    response.raise_for_status()
    return response.json()["content"]

# Example usage
result = analyze_image_url(
    prompt="Describe what you see in this image.",
    image_url="https://example.com/image.jpg"
)
print(result)`;

const typescriptExample = `// TypeScript/JavaScript example using fetch

interface ImageInput {
  type: "url" | "file";
  url?: string;
  data?: string;
}

interface GenerateRequest {
  prompt: string;
  image?: ImageInput;
}

interface GenerateResponse {
  id: string;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

const API_URL = "/api/generate";

// Option 1: Using an image URL
async function analyzeImageUrl(
  prompt: string,
  imageUrl: string
): Promise<string> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      image: { type: "url", url: imageUrl }
    } satisfies GenerateRequest)
  });

  if (!response.ok) {
    throw new Error(\`API error: \${response.status}\`);
  }

  const data: GenerateResponse = await response.json();
  return data.content;
}

// Option 2: Using a File object (browser)
async function analyzeImageFile(
  prompt: string,
  file: File
): Promise<string> {
  const base64 = await fileToBase64(file);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      image: { type: "file", data: base64 }
    } satisfies GenerateRequest)
  });

  if (!response.ok) {
    throw new Error(\`API error: \${response.status}\`);
  }

  const data: GenerateResponse = await response.json();
  return data.content;
}

// Helper: Convert File to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Example usage
const result = await analyzeImageUrl(
  "Describe what you see in this image.",
  "https://example.com/image.jpg"
);
console.log(result);`;

export function CodeExamplesPanel() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section
      className="rounded-xl shadow-md border border-gray-200 bg-white overflow-hidden"
      aria-label="Code examples"
    >
      {/* Collapsible header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="code-examples-content"
      >
        <div className="flex items-center gap-3">
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
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
          <div className="text-left">
            <h2 className="text-base font-semibold text-gray-800">
              Integration Examples
            </h2>
            <p className="text-sm text-gray-500">
              Copy-ready code for Python and JavaScript/TypeScript
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div id="code-examples-content" className="p-6 space-y-6">
          <p className="text-sm text-gray-600">
            Use these examples to integrate Qwen3-VL into your own applications.
            Both examples show how to send images via URL or as base64-encoded
            files.
          </p>

          <CodeExample
            language="Python"
            title="Using requests library"
            code={pythonExample}
          />

          <CodeExample
            language="TypeScript"
            title="Using fetch API"
            code={typescriptExample}
          />

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm">
                <p className="font-medium text-amber-800">Note</p>
                <p className="text-amber-700 mt-1">
                  Remember to set the <code className="bg-amber-100 px-1 py-0.5 rounded text-xs">QWEN_API_KEY</code> environment
                  variable on your server. Never expose API keys in client-side code.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
