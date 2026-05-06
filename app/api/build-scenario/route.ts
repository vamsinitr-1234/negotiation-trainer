import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { getAnthropicKey } from "@/lib/apiKey";
import type { Scenario } from "@/lib/types";

const SYSTEM = `You are a supply chain negotiation training designer. Given a plain-language description, extract or infer all the details needed to build a structured negotiation scenario for procurement and sourcing professionals.

Return ONLY valid JSON — no markdown, no explanation — matching this exact shape:
{
  "title": "<concise scenario title>",
  "context": "<2-3 sentence background both parties know: market conditions, relationship, volumes, urgency>",
  "product": "<product or service being negotiated>",
  "currency": "<3-letter currency code, default USD>",
  "unit": "<unit of measure: unit / tonne / pallet / container / month / etc>",
  "variables": "<comma-separated negotiation variables, e.g. Price per unit, Payment terms, Lead time, MOQ>",
  "difficulty": "<easy | medium | hard>",
  "buyerBrief": {
    "role": "<buyer job title>",
    "objective": "<what the buyer wants to achieve>",
    "mdoValue": "<buyer's most desired outcome — best realistic number>",
    "ldoValue": "<buyer's least desirable outcome — worst acceptable number, i.e. walk-away>",
    "batna": "<buyer's best alternative if no deal is reached>",
    "priorities": "<non-price priorities: payment terms, lead time, quality, warranty, etc.>",
    "constraints": "<buyer's internal constraints or background information>  "
  },
  "sellerBrief": {
    "role": "<seller job title>",
    "objective": "<what the seller wants to achieve>",
    "mdoValue": "<seller's most desired outcome — best realistic number>",
    "ldoValue": "<seller's least desirable outcome — worst acceptable number, i.e. walk-away>",
    "batna": "<seller's best alternative if no deal is reached>",
    "priorities": "<non-price priorities: volume commitment, payment terms, contract length, etc.>",
    "constraints": "<seller's internal constraints or background information>"
  }
}

Rules:
- MDO and LDO must be numbers only (no currency symbols or units — those are in separate fields)
- Buyer's MDO should be lower than seller's MDO (buyer wants cheaper, seller wants more)
- The overlap between buyer LDO and seller LDO is the zone of possible agreement
- If the user doesn't specify exact numbers, infer realistic ones based on the product and context
- If difficulty is not specified, default to medium
- Make the scenario feel realistic and challenging for supply chain professionals`;

export async function POST(req: NextRequest) {
  const { description }: { description: string } = await req.json();

  const apiKey = getAnthropicKey();

  if (!apiKey || apiKey === "mock") {
    // Return a sample scenario for mock mode
    const mock: Scenario = {
      title: "Annual Laptop Procurement Review",
      context: "A mid-sized technology firm is renegotiating its annual laptop supply contract. The buyer has been with the current supplier for 3 years and volumes have grown 20% YoY. Market prices have softened slightly due to component oversupply.",
      product: "Business laptops",
      currency: "USD",
      unit: "unit",
      variables: "Price per unit, Payment terms, Lead time, Warranty period, Volume commitment",
      difficulty: "medium",
      buyerBrief: {
        role: "Category Manager – IT Hardware",
        objective: "Reduce unit cost and extend warranty coverage for the upcoming 12-month contract",
        mdoValue: "950",
        ldoValue: "980",
        batna: "Qualify a secondary supplier from Taiwan — feasible but requires 3-month lead time",
        priorities: "Extend warranty from 24 to 36 months, maintain 4-week lead time",
        constraints: "Budget has been cut 8% vs last year; switching suppliers would require IT sign-off",
      },
      sellerBrief: {
        role: "Key Account Manager",
        objective: "Retain the account at current margin and secure a volume commitment for the year",
        mdoValue: "1020",
        ldoValue: "975",
        batna: "Re-allocate inventory to spot market at higher prices",
        priorities: "Lock in 12-month volume commitment of at least 500 units, Net 30 payment terms",
        constraints: "Has 400 units in stock that need to move this quarter; margin floor is $975",
      },
    };
    return Response.json(mock);
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM,
      messages: [{ role: "user", content: description }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const clean = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    const scenario: Scenario = JSON.parse(clean);
    return Response.json(scenario);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[build-scenario] error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
