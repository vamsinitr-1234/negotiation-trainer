import { NextRequest } from "next/server";
import { getSession, upsertSession, deleteSession } from "@/lib/sessionStore";

// PATCH /api/session/[sessionId]  — update fields on an existing session
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const existing = await getSession(sessionId);
  if (!existing) return Response.json({ error: "Session not found" }, { status: 404 });
  const patch = await req.json();
  await upsertSession({ ...existing, ...patch });
  return Response.json({ ok: true });
}

// GET /api/session/[sessionId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(session);
}

// DELETE /api/session/[sessionId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const deleted = await deleteSession(sessionId);
  if (!deleted) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
