import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import type { Scenario, ChatMessage } from "@/lib/types";

const MOCK_SUGGESTIONS = [
  ["That's a strong opening position. Help me understand what's driving that price.",
   "I appreciate the context. We were expecting movement of at least 8% given market conditions.",
   "Volume commitment is something we can discuss — what would that unlock for you on price?",
   "We have an alternative we're evaluating. What's the best you can do to keep our business?"],
  ["I can work with a volume commitment if the price reflects it.",
   "Net 45 is workable. What concession can you offer on the unit price in return?",
   "Let me put a counter on the table: what if we agree on 8 weeks lead time in exchange for a better rate?",
   "I need to bring something back to my stakeholders. What's the one thing that moves the needle for you?"],
];

export async function POST(req: NextRequest) {
  try {
    const {
      scenario,
      messages,
      humanRole,
    }: { scenario: Scenario; messages: ChatMessage[]; humanRole: "buyer" | "seller" } =
      await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY ?? "";

    if (apiKey === "mock") {
      const idx = messages.length > 4 ? 1 : 0;
      return Response.json({ suggestions: MOCK_SUGGESTIONS[idx] });
    }

    const myBrief = humanRole === "buyer" ? scenario.buyerBrief : scenario.sellerBrief;
    const lastAiMessage = [...messages].reverse().find((m) => m.role !== humanRole);
    const recentTranscript = messages
      .slice(-6)
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const prompt = `You are coaching a ${humanRole} (${myBrief.role}) in a supply chain negotiation.

SCENARIO: ${scenario.title}
THEIR MDO: ${myBrief.mdoValue} | LDO: ${myBrief.ldoValue} | BATNA: ${myBrief.batna}
THEIR PRIORITIES: ${myBrief.priorities}

RECENT CONVERSATION:
${recentTranscript}

LAST MESSAGE FROM OPPONENT:
${lastAiMessage?.content ?? ""}

Generate exactly 4 short response options the ${humanRole} could say next. Each should be a different tactic or angle:
1. A probing / information-gathering response
2. A positional counter-offer or anchor
3. A trade / concession offer
4. A pressure or BATNA signal

Return ONLY a JSON array of 4 strings. No markdown, no explanation. Each string max 20 words.
Example: ["Option 1", "Option 2", "Option 3", "Option 4"]`;

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "[]";
    const clean = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const suggestions: string[] = JSON.parse(clean);
    return Response.json({ suggestions });
  } catch (err) {
    console.error("[suggest] error:", err);
    return Response.json({ suggestions: [] });
  }
}
