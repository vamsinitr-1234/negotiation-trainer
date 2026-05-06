"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSavedScenarios, deleteScenario, type SavedScenario } from "@/lib/savedScenarios";

export default function LibraryPage() {
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setScenarios(getSavedScenarios());
  }, []);

  function handleDelete(id: string) {
    deleteScenario(id);
    setScenarios(getSavedScenarios());
  }

  async function handleCopy(encoded: string, id: string) {
    const url = `${window.location.origin}/play/${encoded}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const difficultyColor: Record<string, string> = {
    easy: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    medium: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    hard: "text-red-400 bg-red-500/10 border-red-500/30",
  };

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white text-sm transition-colors">
              ← Back
            </Link>
            <h1 className="text-2xl font-bold text-white">Saved Scenarios</h1>
          </div>
          <Link
            href="/create"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            + New Scenario
          </Link>
        </div>

        {scenarios.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="text-lg">No saved scenarios yet.</p>
            <p className="text-sm mt-2">
              Create one from the{" "}
              <Link href="/create" className="text-indigo-400 hover:underline">
                scenario creator
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {scenarios.map((s) => (
              <div
                key={s.id}
                className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-white font-semibold truncate">{s.title}</h2>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border capitalize shrink-0 ${
                        difficultyColor[s.difficulty] ?? "text-slate-400"
                      }`}
                    >
                      {s.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 truncate">{s.product}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {new Date(s.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/play/${s.encoded}`}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Play
                  </Link>
                  <button
                    onClick={() => handleCopy(s.encoded, s.id)}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {copiedId === s.id ? "Copied!" : "Copy Link"}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-slate-600 hover:text-red-400 text-sm px-2 py-1.5 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
