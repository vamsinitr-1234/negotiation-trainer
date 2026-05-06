"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { PlayerSession } from "@/lib/types";

function elapsed(s: PlayerSession): string {
  const ms = (s.endTime ?? Date.now()) - s.startTime;
  const sec = Math.floor(ms / 1000);
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

function outcomeLabel(s: PlayerSession) {
  if (s.status === "active") return { label: "Live", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
  if (s.outcome === "deal") return { label: "Deal", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
  if (s.outcome === "walk_away") return { label: "Walk Away", cls: "text-red-400 bg-red-500/10 border-red-500/30" };
  if (s.outcome === "timeout") return { label: "Timeout", cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
  return { label: "In Progress", cls: "text-slate-400 bg-slate-500/10 border-slate-500/30" };
}

export default function AdminPage() {
  const [sessions, setSessions] = useState<PlayerSession[]>([]);
  const [filter, setFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [confirmKillAll, setConfirmKillAll] = useState(false);

  async function loadSessions() {
    try {
      const res = await fetch("/api/session");
      const data = await res.json();
      setSessions(data);
      setLastUpdated(new Date());
    } catch { /* silent */ }
  }

  async function killSession(sessionId: string) {
    await fetch(`/api/session/${sessionId}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
  }

  async function killAllSessions() {
    await fetch("/api/session", { method: "DELETE" });
    setSessions([]);
    setConfirmKillAll(false);
    setFilter("all");
  }

  useEffect(() => {
    loadSessions();
    const iv = setInterval(loadSessions, 5000);
    return () => clearInterval(iv);
  }, []);

  const scenarios = Array.from(new Set(sessions.map((s) => s.scenarioTitle)));
  const filtered = filter === "all" ? sessions : sessions.filter((s) => s.scenarioTitle === filter);
  const active = filtered.filter((s) => s.status === "active").length;

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white text-sm transition-colors">← Home</Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Auto-refreshes every 5s · Last updated {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadSessions} className="text-sm text-slate-400 hover:text-white border border-slate-700 px-4 py-2 rounded-xl transition-colors">
              Refresh
            </button>
            {!confirmKillAll ? (
              <button
                onClick={() => setConfirmKillAll(true)}
                disabled={sessions.length === 0}
                className="text-sm text-red-400 hover:text-white hover:bg-red-900/40 border border-red-700/50 hover:border-red-600 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2 rounded-xl transition-colors"
              >
                Kill All Sessions
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-600 rounded-xl px-3 py-1.5">
                <span className="text-xs text-red-300">Wipe all {sessions.length} sessions?</span>
                <button onClick={killAllSessions} className="text-xs text-white bg-red-600 hover:bg-red-500 px-2 py-1 rounded-lg transition-colors">
                  Yes, wipe
                </button>
                <button onClick={() => setConfirmKillAll(false)} className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Players", value: filtered.length },
            { label: "Live Now", value: active, highlight: active > 0 },
            { label: "Completed", value: filtered.filter((s) => s.status === "completed").length },
            { label: "Avg Score", value: filtered.filter((s) => s.finalScore).length > 0 ? Math.round(filtered.filter((s) => s.finalScore).reduce((a, s) => a + (s.finalScore ?? 0), 0) / filtered.filter((s) => s.finalScore).length) : "—" },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-center">
              <p className={`text-3xl font-black ${stat.highlight ? "text-emerald-400" : "text-white"}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Scenario filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter === "all" ? "border-indigo-500 text-indigo-400 bg-indigo-500/10" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
          >
            All scenarios
          </button>
          {scenarios.map((sc) => (
            <button
              key={sc}
              onClick={() => setFilter(sc)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter === sc ? "border-indigo-500 text-indigo-400 bg-indigo-500/10" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
            >
              {sc}
            </button>
          ))}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-600">
            <p>No sessions yet. Share a game link with learners to see them here.</p>
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-500 uppercase tracking-widest">
                    <th className="text-left px-5 py-3">Player</th>
                    <th className="text-left px-5 py-3">Scenario</th>
                    <th className="text-left px-5 py-3">Role</th>
                    <th className="text-center px-5 py-3">Status</th>
                    <th className="text-center px-5 py-3">Moves</th>
                    <th className="text-center px-5 py-3">Time</th>
                    <th className="text-center px-5 py-3">Live Score</th>
                    <th className="text-center px-5 py-3">Final Score</th>
                    <th className="text-right px-5 py-3">Scoreboard</th>
                    <th className="text-right px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const { label, cls } = outcomeLabel(s);
                    return (
                      <tr key={s.sessionId} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                        <td className="px-5 py-3 font-medium text-white">{s.playerName}</td>
                        <td className="px-5 py-3 text-slate-400 max-w-[180px] truncate">{s.scenarioTitle}</td>
                        <td className="px-5 py-3">
                          <span className={`capitalize text-xs ${s.role === "buyer" ? "text-indigo-400" : s.role === "seller" ? "text-amber-400" : "text-slate-400"}`}>
                            {s.role}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
                        </td>
                        <td className="px-5 py-3 text-center text-slate-300">{s.moves}</td>
                        <td className="px-5 py-3 text-center font-mono text-slate-300">{elapsed(s)}</td>
                        <td className="px-5 py-3 text-center">
                          <LiveScoreBadge score={s.liveScore} />
                        </td>
                        <td className="px-5 py-3 text-center">
                          {s.finalScore != null ? (
                            <span className={`font-bold ${s.finalScore >= 70 ? "text-emerald-400" : s.finalScore >= 45 ? "text-amber-400" : "text-red-400"}`}>
                              {s.finalScore}
                            </span>
                          ) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/scoreboard?scenario=${encodeURIComponent(s.scenarioTitle)}&encoded=${s.scenarioEncoded}`}
                            className="text-xs text-indigo-400 hover:underline"
                          >
                            View →
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => killSession(s.sessionId)}
                            className="text-xs text-red-500 hover:text-red-300 hover:underline transition-colors"
                            title="Remove this session"
                          >
                            Kill
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LiveScoreBadge({ score }: { score: number }) {
  if (!score) return <span className="text-slate-600">—</span>;
  const color = score >= 70 ? "text-emerald-400" : score >= 45 ? "text-amber-400" : "text-red-400";
  return <span className={`font-semibold ${color}`}>{score}</span>;
}
