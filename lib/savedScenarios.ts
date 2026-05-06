import type { Scenario } from "./types";
import { encodeScenario } from "./scenario";

export interface SavedScenario {
  id: string;
  title: string;
  product: string;
  difficulty: string;
  createdAt: string;
  encoded: string;
}

const KEY = "negotiation_saved_scenarios";

export function getSavedScenarios(): SavedScenario[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveScenario(scenario: Scenario): SavedScenario {
  const encoded = encodeScenario(scenario);
  const entry: SavedScenario = {
    id: crypto.randomUUID(),
    title: scenario.title,
    product: scenario.product,
    difficulty: scenario.difficulty,
    createdAt: new Date().toISOString(),
    encoded,
  };
  const existing = getSavedScenarios();
  localStorage.setItem(KEY, JSON.stringify([entry, ...existing]));
  return entry;
}

export function deleteScenario(id: string): void {
  const existing = getSavedScenarios();
  localStorage.setItem(KEY, JSON.stringify(existing.filter((s) => s.id !== id)));
}
