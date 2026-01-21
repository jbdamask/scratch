interface PresetPrompt {
  id: string;
  title: string;
  description: string;
  prompt: string;
  imageUrl: string;
  category: "description" | "ocr" | "spatial" | "qa" | "analysis";
}

const presets: PresetPrompt[] = [
  {
    id: "object-description",
    title: "Object Description",
    description: "Describe objects and details in a photograph",
    prompt: "Describe all the objects you can see in this image. Include colors, sizes, and positions.",
    imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800",
    category: "description",
  },
  {
    id: "text-extraction",
    title: "Text Extraction (OCR)",
    description: "Read and extract text from a document or sign",
    prompt: "Read all the text visible in this image and transcribe it accurately.",
    imageUrl: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800",
    category: "ocr",
  },
  {
    id: "spatial-reasoning",
    title: "Spatial Reasoning",
    description: "Understand object positions and relationships",
    prompt: "Describe the spatial arrangement of objects in this image. What is on the left, right, top, bottom? What is in front or behind other objects?",
    imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800",
    category: "spatial",
  },
  {
    id: "visual-qa",
    title: "Visual Q&A",
    description: "Answer specific questions about an image",
    prompt: "How many people are in this image? What are they doing? What time of day does it appear to be?",
    imageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800",
    category: "qa",
  },
  {
    id: "chart-analysis",
    title: "Chart Analysis",
    description: "Interpret data visualizations and charts",
    prompt: "Analyze this chart or graph. What type of visualization is it? What trends or patterns do you observe? What conclusions can be drawn?",
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
    category: "analysis",
  },
  {
    id: "scene-understanding",
    title: "Scene Understanding",
    description: "Comprehend complex scenes and activities",
    prompt: "Describe the scene in this image. What is happening? What is the setting or location? What mood or atmosphere does it convey?",
    imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
    category: "description",
  },
];

const categoryColors: Record<PresetPrompt["category"], string> = {
  description: "bg-blue-100 text-blue-700",
  ocr: "bg-green-100 text-green-700",
  spatial: "bg-purple-100 text-purple-700",
  qa: "bg-amber-100 text-amber-700",
  analysis: "bg-rose-100 text-rose-700",
};

const categoryLabels: Record<PresetPrompt["category"], string> = {
  description: "Description",
  ocr: "OCR",
  spatial: "Spatial",
  qa: "Q&A",
  analysis: "Analysis",
};

interface PresetPromptsProps {
  onSelectPreset: (prompt: string, imageUrl: string) => void;
  disabled?: boolean;
}

export function PresetPrompts({ onSelectPreset, disabled = false }: PresetPromptsProps) {
  const handlePresetClick = (preset: PresetPrompt) => {
    if (!disabled) {
      onSelectPreset(preset.prompt, preset.imageUrl);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Try an Example</h2>
        <p className="text-sm text-gray-500 mt-1">
          Click a preset to populate the input fields and try Qwen3-VL instantly
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handlePresetClick(preset)}
            disabled={disabled}
            className={`group text-left rounded-lg border border-gray-200 overflow-hidden transition-all ${
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            }`}
            aria-label={`Use preset: ${preset.title}`}
          >
            {/* Image thumbnail */}
            <div className="relative h-32 bg-gray-100 overflow-hidden">
              <img
                src={preset.imageUrl}
                alt={`Sample image for ${preset.title}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <span
                className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-medium rounded ${categoryColors[preset.category]}`}
              >
                {categoryLabels[preset.category]}
              </span>
            </div>

            {/* Content */}
            <div className="p-3">
              <h3 className="font-medium text-gray-800 mb-1">{preset.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{preset.description}</p>
              <div className="mt-2 text-xs text-indigo-600 font-medium group-hover:text-indigo-700">
                Click to try →
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
