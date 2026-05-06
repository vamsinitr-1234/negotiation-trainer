import type { PlayerSession } from "./types";

// Global singleton — persists across HMR in dev and within a single server process
declare global {
  // eslint-disable-next-line no-var
  var __sessionStore: Map<string, PlayerSession> | undefined;
}

export const sessionStore: Map<string, PlayerSession> =
  global.__sessionStore ?? new Map();

if (!global.__sessionStore) global.__sessionStore = sessionStore;

export function getAllSessions(): PlayerSession[] {
  return Array.from(sessionStore.values()).sort((a, b) => b.startTime - a.startTime);
}

export function getSessionsByScenario(scenarioTitle: string): PlayerSession[] {
  return getAllSessions().filter(
    (s) => s.scenarioTitle.toLowerCase() === scenarioTitle.toLowerCase()
  );
}

export function upsertSession(session: PlayerSession): void {
  sessionStore.set(session.sessionId, session);
}

export function getSession(id: string): PlayerSession | undefined {
  return sessionStore.get(id);
}

export function deleteSession(id: string): boolean {
  return sessionStore.delete(id);
}

export function clearAllSessions(): void {
  sessionStore.clear();
}
