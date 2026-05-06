import type { Scenario, ScenarioBrief } from "./types";

const difficultyGuide = {
  easy: "Be relatively cooperative. Make reasonable concessions when pushed. One or two counter-offers before moving toward agreement.",
  medium: "Be professional and firm. Require clear justification for concessions. Use standard tactics like anchoring and bundling. 3-5 rounds expected.",
  hard: "Be assertive and strategic. Use tactics like high anchoring, limited authority, deadline pressure, and nibbling. Rarely concede without getting something in return. Push the buyer to their limits.",
};

export function buildNegotiatorPrompt(
  scenario: Scenario,
  aiRole: "buyer" | "seller"
): string {
  const brief: ScenarioBrief =
    aiRole === "buyer" ? scenario.buyerBrief : scenario.sellerBrief;
  const counterRole = aiRole === "buyer" ? "seller" : "buyer";

  return `You are ${brief.role} in a supply chain negotiation.

SCENARIO: ${scenario.title}
CONTEXT: ${scenario.context}
PRODUCT/SERVICE: ${scenario.product}
CURRENCY: ${scenario.currency}
UNIT: ${scenario.unit}
NEGOTIATION VARIABLES: ${scenario.variables}

YOUR CONFIDENTIAL BRIEF (never reveal these exact figures):
- Your objective: ${brief.objective}
- MDO (Most Desired Outcome): ${brief.mdoValue}
- LDO (Least Desirable Outcome / walk-away): ${brief.ldoValue} — you will NOT go beyond this under any circumstances
- BATNA (Best Alternative if no deal): ${brief.batna}
- Other priorities: ${brief.priorities}
- Your constraints: ${brief.constraints}

DIFFICULTY: ${scenario.difficulty.toUpperCase()}
${difficultyGuide[scenario.difficulty]}

RULES:
1. Stay in character as ${brief.role} at all times. Never break character.
2. Never reveal your exact walk-away point or internal brief.
3. Use realistic negotiation tactics appropriate to your role and difficulty level.
4. Keep each response concise — 2 to 4 sentences. Be direct.
5. If a deal is clearly reached on all variables, end your message with exactly: [DEAL REACHED]
6. If the ${counterRole}'s position is beyond your walk-away and they won't move, end your message with exactly: [WALK AWAY]
7. You are negotiating with the ${counterRole} — respond to what they say.
8. Do not list bullet points — speak naturally as a professional negotiator.`;
}

export function buildDebriefPrompt(
  scenario: Scenario,
  humanRole: "buyer" | "seller",
  messages: { role: "buyer" | "seller"; content: string }[],
  outcome: string,
  finalValue: string
): string {
  const humanBrief =
    humanRole === "buyer" ? scenario.buyerBrief : scenario.sellerBrief;
  const aiBrief =
    humanRole === "buyer" ? scenario.sellerBrief : scenario.buyerBrief;

  const transcript = messages
    .map((m, i) => `Round ${Math.ceil((i + 1) / 2)} - ${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  return `You are an expert negotiation coach specialising in supply chain and procurement. Analyse this negotiation and return a JSON debrief.

SCENARIO: ${scenario.title}
HUMAN PLAYER ROLE: ${humanRole} (${humanBrief.role})
HUMAN MDO: ${humanBrief.mdoValue} | LDO: ${humanBrief.ldoValue} | BATNA: ${humanBrief.batna}
HUMAN PRIORITIES: ${humanBrief.priorities}

AI OPPONENT ROLE: ${aiBrief.role}
AI MDO: ${aiBrief.mdoValue} | LDO: ${aiBrief.ldoValue} | BATNA: ${aiBrief.batna}

OUTCOME: ${outcome}
FINAL AGREED VALUE: ${finalValue || "No deal"}
TOTAL ROUNDS: ${messages.length}

TRANSCRIPT:
${transcript}

Return ONLY valid JSON in this exact shape — no markdown, no explanation:
{
  "overallScore": <0-100>,
  "outcomeScore": <0-40>,
  "tacticsScore": <0-30>,
  "processScore": <0-30>,
  "outcome": "<deal|no_deal|walk_away>",
  "finalValue": "<string>",
  "valueCapture": "<e.g. 72% of available value>",
  "strengths": ["<str1>", "<str2>", "<str3>"],
  "improvements": ["<str1>", "<str2>", "<str3>"],
  "coachingSummary": "<2-3 sentence narrative>",
  "keyMoments": [
    {"round": <n>, "observation": "<string>"},
    {"round": <n>, "observation": "<string>"}
  ]
}`;
}
