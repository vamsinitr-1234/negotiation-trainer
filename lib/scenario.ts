import type { Scenario } from "./types";

export function encodeScenario(scenario: Scenario): string {
  const json = JSON.stringify(scenario);
  // Encode UTF-8 string to base64url — works in both browser and Node.js
  const base64 = btoa(
    encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
  );
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function decodeScenario(encoded: string): Scenario {
  // Restore standard base64 padding and characters
  const padded = encoded + "=".repeat((4 - (encoded.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    Array.from(atob(base64))
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(json);
}
