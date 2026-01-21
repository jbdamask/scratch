export function WelcomeSection() {
  return (
    <section className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg p-8 text-white">
      <div className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          Qwen3-VL-8B-Instruct
        </h1>
        <p className="text-lg text-indigo-100 mb-6">
          Experience the power of vision-language AI. Qwen3-VL is a
          state-of-the-art multimodal model that understands both images and
          text, enabling natural conversations about visual content.
        </p>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
            8B Parameters
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
            Vision + Language
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
            Instruction Following
          </span>
        </div>
      </div>
    </section>
  );
}
