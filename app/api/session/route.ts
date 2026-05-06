import { NextRequest } from "next/server";
import { getAllSessions, getSessionsByScenario, upsertSession, clearAllSessions } from "@/lib/sessionStore";
import type { PlayerSession } from "@/lib/types";

// GET /api/session  or  GET /api/session?scenario=<title>
export async function GET(req: NextRequest) {
  const scenario = req.nextUrl.searchParams.get("scenario");
  const sessions = scenario
    ? await getSessionsByScenario(scenario)
    : await getAllSessions();
  return Response.json(sessions);
}

// POST /api/session  — create a new session
export async function POST(req: NextRequest) {
  const body: PlayerSession = await req.json();
  await upsertSession(body);
  return Response.json({ ok: true });
}

// DELETE /api/session  — wipe all sessions
export async function DELETE() {
  await clearAllSessions();
  return Response.json({ ok: true });
}
