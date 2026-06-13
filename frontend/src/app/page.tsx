export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Moda CRM</h1>
      <p className="text-gray-500 mb-8">D2C Intelligence Platform</p>
      <div className="flex gap-4">
        <a href="/campaigns/new" className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          Create Campaign
        </a>
      </div>
    </main>
  );
}
