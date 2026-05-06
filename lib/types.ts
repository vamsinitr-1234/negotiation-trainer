export interface ScenarioBrief {
  role: string;
  objective: string;
  mdoValue: string;
  ldoValue: string;
  batna: string;
  priorities: string;
  constraints: string;
}

export interface Scenario {
  title: string;
  context: string;
  product: string;
  currency: string;
  unit: string;
  buyerBrief: ScenarioBrief;
  sellerBrief: ScenarioBrief;
  variables: string;
  difficulty: "easy" | "medium" | "hard";
  timeLimit?: number; // minutes, 0 = no limit
}

export interface PlayerSession {
  sessionId: string;
  playerName: string;
  scenarioTitle: string;
  scenarioEncoded: string;
  role: "buyer" | "seller" | "observer";
  startTime: number;
  endTime?: number;
  timeLimit: number; // seconds
  moves: number;
  liveScore: number;
  finalScore?: number;
  outcome?: "deal" | "walk_away" | "timeout" | "no_deal";
  status: "active" | "completed";
}

export interface ChatMessage {
  role: "buyer" | "seller";
  content: string;
}

export interface DebriefResult {
  overallScore: number;
  outcomeScore: number;
  tacticsScore: number;
  processScore: number;
  outcome: "deal" | "no_deal" | "walk_away";
  finalValue: string;
  valueCapture: string;
  strengths: string[];
  improvements: string[];
  coachingSummary: string;
  keyMoments: { round: number; observation: string }[];
}
