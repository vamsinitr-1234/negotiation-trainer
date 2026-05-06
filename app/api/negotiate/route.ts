import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { buildNegotiatorPrompt } from "@/lib/prompts";
import { getAnthropicKey } from "@/lib/apiKey";
import type { Scenario, ChatMessage } from "@/lib/types";

const MOCK_RESPONSES = [
  "We appreciate your interest. Our current price is $5.20 per unit based on market conditions and our cost structure. We're open to discussing terms, but we'd need to understand your volume commitments before moving on price.",
  "I understand your position, but $4.00 is quite aggressive given current raw material costs. We could consider $4.90 if you're willing to commit to 50,000 units annually and move to Net 30 payment terms.",
  "That's still a stretch for us. If you can move to $4.60 with a 12-month contract and quarterly releases, we can make that work. We'd also need to keep lead times at 8 weeks.",
  "We're getting closer. A firm commitment of 60,000 units at $4.50 with Net 45 — that's the best I can offer without going to my VP.",
  "I appreciate the movement. $4.40 with those terms is at the edge of what I'm authorised to approve. I can agree if we sign before end of quarter. [DEAL REACHED]",
];

export async function POST(req: NextRequest) {
  try {
    const {
      scenario,
      messages,
      aiRole,
    }: { scenario: Scenario; messages: ChatMessage[]; aiRole: "buyer" | "seller" } =
      await req.json();

    const apiKey = getAnthropicKey();

    // Mock mode
    if (!apiKey || apiKey === "mock") {
      const idx = Math.min(messages.length, MOCK_RESPONSES.length - 1);
      return new Response(MOCK_RESPONSES[idx], {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const anthropic = new Anthropic({ apiKey });
    const systemPrompt = buildNegotiatorPrompt(scenario, aiRole);

    // Anthropic requires at least one user message.
    // When the list is empty the AI opens the negotiation — seed it.
    const anthropicMessages: Anthropic.MessageParam[] =
      messages.length === 0
        ? [{ role: "user", content: "Please open the negotiation with your first statement." }]
        : messages.map((m) => ({
            role: m.role === aiRole ? "assistant" : "user",
            content: m.content,
          }));

    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 350,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(new TextEncoder().encode(chunk.delta.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[negotiate] error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
