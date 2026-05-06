"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { PlayerSession } from "@/lib/types";

function medal(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function formatTime(session: PlayerSession): string {
  if (!session.endTime) return "—";
  const sec = Math.round((session.endTime - session.startTime) / 1000);
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

function outcomeColor(outcome?: string) {
  if (outcome === "deal") return "text-emerald-400";
  if (outcome === "walk_away") return "text-red-400";
  if (outcome === "timeout") return "text-amber-400";
  return "text-slate-400";
}

function ScoreboardContent() {
  const params = useSearchParams();
  const scenarioTitle = params.get("scenario") ?? "";
  const encodedScenario = params.get("encoded") ?? "";

  const [sessions, setSessions] = useState<PlayerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  async function load() {
    try {
      const res = await fetch(`/api/session?scenario=${encodeURIComponent(scenarioTitle)}`);
      const data: PlayerSession[] = await res.json();
      // Rank: completed sessions first, sorted by finalScore desc, then by time asc
      const sorted = data
        .filter((s) => s.status === "completed" && s.finalScore != null)
        .sort((a, b) => {
          const scoreDiff = (b.finalScore ?? 0) - (a.finalScore ?? 0);
          if (scoreDiff !== 0) return scoreDiff;
          // Tie-break by time (faster = better)
          const aTime = (a.endTime ?? 0) - a.startTime;
          const bTime = (b.endTime ?? 0) - b.startTime;
          return aTime - bTime;
        });
      setSessions(sorted);
      setLastUpdated(new Date());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioTitle]);

  const topScore = sessions[0]?.finalScore ?? 0;
  const avgScore = sessions.length
    ? Math.round(sessions.reduce((a, s) => a + (s.finalScore ?? 0), 0) / sessions.length)
    : 0;

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {encodedScenario && (
              <Link href={`/play/${encodedScenario}`} className="text-slate-400 hover:text-white text-sm transition-colors">
                ← Play again
              </Link>
            )}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest">Scoreboard</p>
              <h1 className="text-2xl font-bold text-white">{scenarioTitle || "Negotiation Results"}</h1>
              <p className="text-xs text-slate-600 mt-0.5">Updates every 8s · {lastUpdated.toLocaleTimeString()}</p>
            </div>
          </div>
          <Link href="/admin" className="text-xs text-slate-500 hover:text-white border border-slate-700 px-3 py-2 rounded-lg transition-colors">
            Admin →
          </Link>
        </div>

        {/* Summary stats */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Players", value: sessions.length },
              { label: "Top Score", value: topScore, color: "text-emerald-400" },
              { label: "Avg Score", value: avgScore },
            ].map((s) => (
              <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-center">
                <p className={`text-3xl font-black ${s.color ?? "text-white"}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 text-slate-500">Loading results…</div>
        )}

        {/* Empty */}
        {!loading && sessions.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <p className="text-slate-400 text-lg">No completed games yet.</p>
            <p className="text-slate-600 text-sm">Results will appear here once players finish their negotiation.</p>
            {encodedScenario && (
              <Link href={`/play/${encodedScenario}`} className="inline-block mt-4 text-indigo-400 hover:underline text-sm">
                Be the first to play →
              </Link>
            )}
          </div>
        )}

        {/* Leaderboard */}
        {sessions.length > 0 && (
          <div className="space-y-3">
            {sessions.map((s, i) => {
              const rank = i + 1;
              const isTop = rank === 1;
              const scoreColor = (s.finalScore ?? 0) >= 70 ? "text-emerald-400" : (s.finalScore ?? 0) >= 45 ? "text-amber-400" : "text-red-400";

              return (
                <div
                  key={s.sessionId}
                  className={`flex items-center gap-4 rounded-2xl p-4 border transition-all ${isTop ? "bg-amber-500/5 border-amber-500/30" : "bg-slate-800 border-slate-700"}`}
                >
                  {/* Rank */}
                  <div className="w-10 text-center text-xl shrink-0">
                    {medal(rank)}
                  </div>

                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{s.playerName}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className={`text-xs capitalize ${s.role === "buyer" ? "text-indigo-400" : "text-amber-400"}`}>{s.role}</span>
                      <span className={`text-xs ${outcomeColor(s.outcome)} capitalize`}>{s.outcome?.replace("_", " ")}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center shrink-0">
                    <div>
                      <p className={`text-xl font-black ${scoreColor}`}>{s.finalScore}</p>
                      <p className="text-xs text-slate-500">Score</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-white font-mono">{formatTime(s)}</p>
                      <p className="text-xs text-slate-500">Time</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-white">{s.moves}</p>
                      <p className="text-xs text-slate-500">Moves</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScoreboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>}>
      <ScoreboardContent />
    </Suspense>
  );
}
