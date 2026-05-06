/**
 * Reads the Anthropic API key, falling back to parsing .env.local directly.
 * Needed because the shell environment may export ANTHROPIC_API_KEY=""
 * (empty string), which takes precedence over .env.local in Next.js.
 */
import fs from "fs";
import path from "path";

export function getAnthropicKey(): string {
  const fromEnv = process.env.ANTHROPIC_API_KEY;

  // If the env var is genuinely set and non-empty, use it
  if (fromEnv && fromEnv.trim() !== "") return fromEnv.trim();

  // Fall back: parse .env.local directly
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const content = fs.readFileSync(envPath, "utf8");
    const match = content.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  } catch {
    // file missing or unreadable — handled by caller
  }

  // Return whatever was in process.env (might be "" or undefined → "")
  return fromEnv ?? "";
}
