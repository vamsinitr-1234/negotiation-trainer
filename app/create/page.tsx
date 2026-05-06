"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { encodeScenario } from "@/lib/scenario";
import { saveScenario } from "@/lib/savedScenarios";
import { NegotiationGlossary } from "@/components/NegotiationGlossary";
import type { Scenario } from "@/lib/types";

const empty: Scenario = {
  title: "",
  context: "",
  product: "",
  currency: "USD",
  unit: "unit",
  variables: "Price per unit, Payment terms, Lead time, Minimum order quantity",
  difficulty: "medium",
  timeLimit: 0,
  buyerBrief: {
    role: "Category Manager",
    objective: "",
    mdoValue: "",
    ldoValue: "",
    batna: "",
    priorities: "",
    constraints: "",
  },
  sellerBrief: {
    role: "Account Manager",
    objective: "",
    mdoValue: "",
    ldoValue: "",
    batna: "",
    priorities: "",
    constraints: "",
  },
};

export default function CreatePage() {
  const router = useRouter();
  const [scenario, setScenario] = useState<Scenario>(empty);
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  function setTop(key: keyof Scenario, value: string) {
    setScenario((s) => ({ ...s, [key]: value }));
  }

  function setBrief(
    side: "buyerBrief" | "sellerBrief",
    key: string,
    value: string
  ) {
    setScenario((s) => ({ ...s, [side]: { ...s[side], [key]: value } }));
  }

  function generate() {
    const encoded = encodeScenario(scenario);
    const url = `${window.location.origin}/play/${encoded}`;
    setGenerated(url);
    saveScenario(scenario);
    setSaved(true);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isValid =
    scenario.title &&
    scenario.context &&
    scenario.product &&
    scenario.buyerBrief.objective &&
    scenario.buyerBrief.ldoValue &&
    scenario.sellerBrief.objective &&
    scenario.sellerBrief.ldoValue;

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-white">Create Negotiation Scenario</h1>
          </div>
          <button
            onClick={() => router.push("/library")}
            className="text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-xl transition-colors"
          >
            Saved Scenarios →
          </button>
        </div>

        <div className="space-y-6">
          {/* Terminology reference */}
          <NegotiationGlossary />

          {/* Scenario Overview */}
          <Section title="Scenario Overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Scenario Title" required>
                <input
                  className={input}
                  placeholder="e.g. Annual Price Review — Electronic Components"
                  value={scenario.title}
                  onChange={(e) => setTop("title", e.target.value)}
                />
              </Field>
              <Field label="Product / Service" required>
                <input
                  className={input}
                  placeholder="e.g. PCB assemblies, 3PL logistics, Raw steel coils"
                  value={scenario.product}
                  onChange={(e) => setTop("product", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Background Context (shown to all players)" required>
              <textarea
                className={`${input} h-24 resize-none`}
                placeholder="Describe the situation both parties know: market conditions, relationship history, urgency, volumes, etc."
                value={scenario.context}
                onChange={(e) => setTop("context", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Currency">
                <input
                  className={input}
                  placeholder="USD"
                  value={scenario.currency}
                  onChange={(e) => setTop("currency", e.target.value)}
                />
              </Field>
              <Field label="Unit of measure">
                <input
                  className={input}
                  placeholder="unit / tonne / pallet / month"
                  value={scenario.unit}
                  onChange={(e) => setTop("unit", e.target.value)}
                />
              </Field>
              <Field label="Difficulty">
                <select
                  className={input}
                  value={scenario.difficulty}
                  onChange={(e) =>
                    setTop("difficulty", e.target.value as Scenario["difficulty"])
                  }
                >
                  <option value="easy">Easy — Cooperative AI</option>
                  <option value="medium">Medium — Professional AI</option>
                  <option value="hard">Hard — Assertive AI</option>
                </select>
              </Field>
            </div>

            {/* Game Timer — prominent own row */}
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 flex items-center gap-5">
              <div className="text-2xl shrink-0">⏱</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-400">Game Timer</p>
                <p className="text-xs text-slate-400 mt-0.5">Set a countdown players must finish within. Leave at 0 for no time limit.</p>
              </div>
              <div className="shrink-0 w-36">
                <div className="relative flex items-center">
                  <input
                    className="w-full bg-slate-900 border border-amber-500/50 focus:border-amber-400 text-slate-100 placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm outline-none text-center font-mono text-lg"
                    type="number"
                    min={0}
                    max={60}
                    placeholder="0"
                    value={scenario.timeLimit ?? 0}
                    onChange={(e) => setTop("timeLimit", e.target.value)}
                  />
                  <span className="absolute right-3 text-xs text-slate-500 pointer-events-none">min</span>
                </div>
              </div>
            </div>
            <Field label="Negotiation Variables (comma-separated)">
              <input
                className={input}
                placeholder="Price per unit, Payment terms, Lead time, MOQ"
                value={scenario.variables}
                onChange={(e) => setTop("variables", e.target.value)}
              />
            </Field>
          </Section>

          {/* Briefs side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BriefSection
              title="Buyer Brief"
              color="indigo"
              brief={scenario.buyerBrief}
              onChange={(k, v) => setBrief("buyerBrief", k, v)}
              currency={scenario.currency}
              unit={scenario.unit}
            />
            <BriefSection
              title="Seller Brief"
              color="amber"
              brief={scenario.sellerBrief}
              onChange={(k, v) => setBrief("sellerBrief", k, v)}
              currency={scenario.currency}
              unit={scenario.unit}
            />
          </div>

          {/* Generate */}
          <div className="flex flex-col items-center gap-4 pt-2">
            <div className="flex items-center gap-3">
              <button
                onClick={generate}
                disabled={!isValid}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition-colors"
              >
                Generate &amp; Save
              </button>
              {saved && (
                <span className="text-emerald-400 text-sm flex items-center gap-1">
                  ✓ Saved to library
                </span>
              )}
            </div>

            {generated && (
              <div className="w-full bg-slate-800 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                <input
                  readOnly
                  value={generated}
                  className="flex-1 bg-transparent text-emerald-400 text-sm font-mono truncate outline-none"
                />
                <button
                  onClick={copyLink}
                  className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
        {title}
      </h2>
      {children}
    </div>
  );
}

function BriefSection({
  title,
  color,
  brief,
  onChange,
  currency,
  unit,
}: {
  title: string;
  color: "indigo" | "amber";
  brief: Scenario["buyerBrief"];
  onChange: (key: string, value: string) => void;
  currency: string;
  unit: string;
}) {
  const accent =
    color === "indigo"
      ? "text-indigo-400 border-indigo-500/30"
      : "text-amber-400 border-amber-500/30";

  return (
    <div className={`bg-slate-800 border ${accent} rounded-2xl p-6 space-y-4`}>
      <h2 className={`text-sm font-semibold uppercase tracking-widest ${accent.split(" ")[0]}`}>
        {title}
        <span className="text-slate-500 font-normal ml-1">(confidential — only shown to that player)</span>
      </h2>
      <Field label="Role / Title" required>
        <input
          className={input}
          placeholder="e.g. Category Manager"
          value={brief.role}
          onChange={(e) => onChange("role", e.target.value)}
        />
      </Field>
      <Field label="Objective" required>
        <textarea
          className={`${input} h-20 resize-none`}
          placeholder="What does this party want to achieve in this negotiation?"
          value={brief.objective}
          onChange={(e) => onChange("objective", e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`MDO — Most Desired Outcome (${currency}/${unit})`} hint="Your opening anchor — the best deal you realistically expect to achieve.">
          <input
            className={input}
            placeholder="Best realistic outcome"
            value={brief.mdoValue}
            onChange={(e) => onChange("mdoValue", e.target.value)}
          />
        </Field>
        <Field label={`LDO — Least Desirable Outcome (${currency}/${unit})`} hint="Your hard walk-away point — never accept a deal worse than this." required>
          <input
            className={input}
            placeholder="Worst acceptable — walk-away point"
            value={brief.ldoValue}
            onChange={(e) => onChange("ldoValue", e.target.value)}
          />
        </Field>
      </div>
      <Field label="BATNA — Best Alternative to a Negotiated Agreement" hint="What you will do if talks break down entirely. A stronger BATNA gives more leverage.">
        <input
          className={input}
          placeholder="e.g. Qualify alternative supplier in Vietnam, extend current contract 6 months"
          value={brief.batna}
          onChange={(e) => onChange("batna", e.target.value)}
        />
      </Field>
      <Field label="Other Priorities">
        <input
          className={input}
          placeholder="Payment terms, lead time, quality clauses..."
          value={brief.priorities}
          onChange={(e) => onChange("priorities", e.target.value)}
        />
      </Field>
      <Field label="Constraints / Background Info">
        <input
          className={input}
          placeholder="Budget freeze, sole-source situation, relationship risk..."
          value={brief.constraints}
          onChange={(e) => onChange("constraints", e.target.value)}
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-slate-400">
        {label}
        {required && <span className="text-indigo-400 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-slate-500 italic -mt-0.5">{hint}</p>}
      {children}
    </div>
  );
}

const input =
  "w-full bg-slate-900 border border-slate-600 focus:border-indigo-500 text-slate-100 placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm outline-none transition-colors";
