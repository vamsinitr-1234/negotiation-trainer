import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { getAnthropicKey } from "@/lib/apiKey";
import type { Scenario, ChatMessage } from "@/lib/types";

export interface CoachData {
  tip: string;
  alert: string;
  liveScore: {
    overall: number;
    position: number;
    tactics: number;
    process: number;
  };
  detectedTactics: string[];
  nextMoves: string[];
}

const MOCK: CoachData = {
  tip: "The supplier signalled flexibility on payment terms — that's a lever you haven't used yet. Try bundling a payment term concession against a price reduction.",
  alert: "You conceded on lead time without extracting anything in return. Avoid giving something for nothing.",
  liveScore: { overall: 61, position: 22, tactics: 20, process: 19 },
  detectedTactics: ["Opening anchor", "Probing question"],
  nextMoves: ["Signal your BATNA credibly", "Ask what would need to be true for them to move on price"],
};

export async function POST(req: NextRequest) {
  try {
    const {
      scenario,
      messages,
      humanRole,
    }: { scenario: Scenario; messages: ChatMessage[]; humanRole: "buyer" | "seller" } =
      await req.json();

    const apiKey = getAnthropicKey();
    if (!apiKey || apiKey === "mock") {
      await new Promise((r) => setTimeout(r, 600));
      return Response.json(MOCK);
    }

    const myBrief = humanRole === "buyer" ? scenario.buyerBrief : scenario.sellerBrief;
    const oppBrief = humanRole === "buyer" ? scenario.sellerBrief : scenario.buyerBrief;

    const transcript = messages
      .map((m, i) => `[${Math.ceil((i + 1) / 2)}] ${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    const prompt = `You are a real-time negotiation coach for a supply chain training exercise. Analyse the conversation so far and return a live coaching update.

SCENARIO: ${scenario.title}
HUMAN IS: ${humanRole} — ${myBrief.role}
HUMAN MDO: ${myBrief.mdoValue} | LDO: ${myBrief.ldoValue} | BATNA: ${myBrief.batna}
OPPONENT MDO: ${oppBrief.mdoValue} | LDO: ${oppBrief.ldoValue}

TRANSCRIPT SO FAR:
${transcript}

Return ONLY valid JSON — no markdown, no explanation:
{
  "tip": "<1-2 sentence coaching advice for their NEXT move — specific and actionable>",
  "alert": "<1 sentence warning about a mistake or risk in their recent moves, or empty string if none>",
  "liveScore": {
    "overall": <0-100 estimate based on performance so far>,
    "position": <0-40 how well their current position is vs MDO/LDO>,
    "tactics": <0-30 quality of tactics used so far>,
    "process": <0-30 quality of process: probing, pacing, concession management>
  },
  "detectedTactics": ["<tactic name>", ...],
  "nextMoves": ["<short suggested next move>", "<short suggested next move>"]
}`;

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
    const clean = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const data: CoachData = JSON.parse(clean);
    return Response.json(data);
  } catch (err) {
    console.error("[coach] error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
