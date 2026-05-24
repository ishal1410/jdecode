import Decoder from "@/components/Decoder";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-baseline gap-3">
          <span className="text-2xl font-bold text-gray-900">JDecode</span>
          <span className="text-sm text-gray-500">
            Decode any job posting. Know exactly which keywords your resume needs.
          </span>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Decoder />
      </div>
    </main>
  );
}
