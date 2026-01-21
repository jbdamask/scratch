const useCases = [
  {
    title: "Document Analysis",
    description:
      "Upload invoices, receipts, or forms and extract key information automatically.",
    example: '"What is the total amount on this receipt?"',
  },
  {
    title: "Image Description",
    description:
      "Get detailed descriptions of photographs, diagrams, or artwork.",
    example: '"Describe what\'s happening in this image in detail."',
  },
  {
    title: "Code Screenshot Analysis",
    description:
      "Understand code from screenshots, identify bugs, or explain functionality.",
    example: '"What does this code do and are there any issues?"',
  },
  {
    title: "Chart & Graph Interpretation",
    description:
      "Analyze data visualizations and extract insights from charts and graphs.",
    example: '"What trends does this chart show?"',
  },
];

export function UseCasesSection() {
  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        Common Use Cases
      </h2>
      <div className="space-y-4">
        {useCases.map((useCase) => (
          <div
            key={useCase.title}
            className="p-4 rounded-lg bg-slate-50 border border-slate-100"
          >
            <h3 className="font-semibold text-slate-800 mb-2">{useCase.title}</h3>
            <p className="text-sm text-slate-600 mb-2">{useCase.description}</p>
            <div className="bg-slate-100 rounded px-3 py-2">
              <code className="text-sm text-indigo-700">{useCase.example}</code>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
