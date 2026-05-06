import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { buildDebriefPrompt } from "@/lib/prompts";
import { getAnthropicKey } from "@/lib/apiKey";
import type { Scenario, ChatMessage } from "@/lib/types";

const MOCK_DEBRIEF = {
  overallScore: 72,
  outcomeScore: 28,
  tacticsScore: 22,
  processScore: 22,
  outcome: "deal",
  finalValue: "$4.40 / unit, Net 45, 60k units",
  valueCapture: "68% of available value captured",
  strengths: [
    "Strong opening anchor that set a favourable range",
    "Effectively used volume commitment as a trading lever",
    "Maintained composure when the supplier pushed back on payment terms",
  ],
  improvements: [
    "Could have probed supplier constraints earlier to find creative trades",
    "Conceded on lead time without extracting a counter-concession",
    "Walking away was never credibly signalled — the supplier sensed low BATNA",
  ],
  coachingSummary:
    "You negotiated a deal within your acceptable range, showing solid positional awareness. The main opportunity was to explore the supplier's cost drivers earlier — understanding their margin pressure on raw materials would have justified a stronger push below $4.40. Next time, signal your alternatives earlier to shift power dynamics.",
  keyMoments: [
    { round: 1, observation: "Good opening anchor at $4.00 — set the range in your favour" },
    { round: 3, observation: "Conceded lead time without asking for anything in return — a missed trade" },
    { round: 5, observation: "End-of-quarter urgency from supplier was a signal worth exploiting further" },
  ],
};

function stripJson(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const {
      scenario,
      messages,
      humanRole,
      outcome,
      finalValue,
    }: {
      scenario: Scenario;
      messages: ChatMessage[];
      humanRole: "buyer" | "seller";
      outcome: string;
      finalValue: string;
    } = await req.json();

    const apiKey = getAnthropicKey();

    if (!apiKey || apiKey === "mock") {
      await new Promise((r) => setTimeout(r, 1200));
      return Response.json({
        ...MOCK_DEBRIEF,
        outcome: outcome || "deal",
        finalValue: finalValue || MOCK_DEBRIEF.finalValue,
      });
    }

    const anthropic = new Anthropic({ apiKey });
    const prompt = buildDebriefPrompt(scenario, humanRole, messages, outcome, finalValue);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const clean = stripJson(raw);

    const debrief = JSON.parse(clean);
    return Response.json(debrief);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[debrief] error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
