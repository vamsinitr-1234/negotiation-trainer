import { getAnthropicKey } from "@/lib/apiKey";
export async function GET() {
  const key = getAnthropicKey();
  return Response.json({
    keyLength: key.length,
    keyPrefix: key.length > 12 ? key.substring(0, 12) : null,
    isMock: !key || key === "mock",
  });
}
