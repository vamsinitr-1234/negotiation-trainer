/**
 * Session store — uses Upstash Redis when UPSTASH_REDIS_REST_URL +
 * UPSTASH_REDIS_REST_TOKEN are set (production / Vercel), otherwise falls
 * back to an in-memory Map (local dev, zero config required).
 */
import type { PlayerSession } from "./types";

// ─── In-memory fallback ──────────────────────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __sessionStore: Map<string, PlayerSession> | undefined;
}
const memStore: Map<string, PlayerSession> =
  global.__sessionStore ?? new Map();
if (!global.__sessionStore) global.__sessionStore = memStore;

// ─── Redis helpers ────────────────────────────────────────────────────────────
const S = (id: string) => `neg:session:${id}`;   // per-session key
const IDX = "neg:sessions";                        // set of all session IDs
const TTL = 60 * 60 * 24;                          // 24 h expiry on each session

function buildRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Redis } = require("@upstash/redis");
  return new Redis({ url, token }) as import("@upstash/redis").Redis;
}

// Singleton so we don't reconstruct on every request in dev HMR
let _redis: import("@upstash/redis").Redis | null | undefined;
function redis() {
  if (_redis !== undefined) return _redis;
  _redis = buildRedis();
  return _redis;
}

// ─── Public API (all async) ───────────────────────────────────────────────────

export async function getAllSessions(): Promise<PlayerSession[]> {
  const r = redis();
  if (!r) {
    return Array.from(memStore.values()).sort((a, b) => b.startTime - a.startTime);
  }
  const ids = await r.smembers(IDX) as string[];
  if (!ids.length) return [];
  const rows = await Promise.all(ids.map((id) => r.get<PlayerSession>(S(id))));
  return rows
    .filter((s): s is PlayerSession => s !== null)
    .sort((a, b) => b.startTime - a.startTime);
}

export async function getSessionsByScenario(title: string): Promise<PlayerSession[]> {
  const all = await getAllSessions();
  return all.filter((s) => s.scenarioTitle.toLowerCase() === title.toLowerCase());
}

export async function upsertSession(session: PlayerSession): Promise<void> {
  const r = redis();
  if (!r) {
    memStore.set(session.sessionId, session);
    return;
  }
  await r.set(S(session.sessionId), session, { ex: TTL });
  await r.sadd(IDX, session.sessionId);
}

export async function getSession(id: string): Promise<PlayerSession | undefined> {
  const r = redis();
  if (!r) return memStore.get(id);
  const s = await r.get<PlayerSession>(S(id));
  return s ?? undefined;
}

export async function deleteSession(id: string): Promise<boolean> {
  const r = redis();
  if (!r) return memStore.delete(id);
  const n = await r.del(S(id));
  await r.srem(IDX, id);
  return n > 0;
}

export async function clearAllSessions(): Promise<void> {
  const r = redis();
  if (!r) {
    memStore.clear();
    return;
  }
  const ids = await r.smembers(IDX) as string[];
  if (ids.length) await Promise.all(ids.map((id) => r.del(S(id))));
  await r.del(IDX);
}
