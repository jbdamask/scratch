const capabilities = [
  {
    icon: "🔍",
    title: "Visual Reasoning",
    description:
      "Analyze and interpret complex visual scenes, understanding relationships between objects and their context.",
  },
  {
    icon: "💬",
    title: "Visual Q&A",
    description:
      "Answer questions about images with detailed, accurate responses based on visual understanding.",
  },
  {
    icon: "📝",
    title: "Instruction Following",
    description:
      "Execute complex multi-step instructions that combine visual and textual understanding.",
  },
  {
    icon: "🔤",
    title: "OCR & Text Recognition",
    description:
      "Extract and understand text from images, documents, and screenshots with high accuracy.",
  },
];

export function CapabilitiesSection() {
  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        What Qwen3-VL Can Do
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {capabilities.map((capability) => (
          <div
            key={capability.title}
            className="p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl" role="img" aria-label={capability.title}>
                {capability.icon}
              </span>
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">
                  {capability.title}
                </h3>
                <p className="text-sm text-slate-600">{capability.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
