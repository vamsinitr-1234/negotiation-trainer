import Link from "next/link";


export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div>
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-sm px-4 py-1.5 rounded-full mb-6">
            Supply Chain Negotiation Simulator
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Negotiation Trainer
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-md mx-auto">
            Practice real-world procurement and supplier negotiations against an AI opponent. Get scored and coached after every session.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <Link
            href="/build"
            className="group bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-left transition-all"
          >
            <div className="text-2xl mb-3">✦</div>
            <h2 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
              Build with AI
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Describe your scenario in plain English — Claude builds the full brief automatically.
            </p>
          </Link>

          <Link
            href="/create"
            className="group bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-left transition-all"
          >
            <div className="text-2xl mb-3">+</div>
            <h2 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
              Manual Create
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Fill in the full scenario brief yourself with complete control over every field.
            </p>
          </Link>

          <Link
            href="/library"
            className="group bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-left transition-all"
          >
            <div className="text-2xl mb-3">☰</div>
            <h2 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
              Scenario Library
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              View, copy links, and manage all your saved negotiation scenarios.
            </p>
          </Link>

          <Link
            href="/admin"
            className="group bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-red-500/50 rounded-2xl p-6 text-left transition-all"
          >
            <div className="text-2xl mb-3">⚙</div>
            <h2 className="text-lg font-semibold text-white group-hover:text-red-400 transition-colors">
              Admin
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Live dashboard — see every player's moves, time, and score in real time.
            </p>
          </Link>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-left">
            <div className="text-2xl mb-3">→</div>
            <h2 className="text-lg font-semibold text-white">Join a Game</h2>
            <p className="text-sm text-slate-400 mt-1 mb-4">
              Have a link from your trainer? Open it directly to start your negotiation.
            </p>
            <p className="text-xs text-slate-500 italic">Open the shared link in your browser</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4">
          {[
            { label: "Modes", value: "Human vs AI · AI vs AI" },
            { label: "Scoring", value: "Outcome · Tactics · Process" },
            { label: "Debrief", value: "Coaching after every game" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-xs text-slate-500 uppercase tracking-widest">{item.label}</p>
              <p className="text-sm text-slate-300 mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
