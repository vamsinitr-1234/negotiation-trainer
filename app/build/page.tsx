"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { encodeScenario } from "@/lib/scenario";
import { saveScenario } from "@/lib/savedScenarios";
import { NegotiationGlossary } from "@/components/NegotiationGlossary";
import type { Scenario } from "@/lib/types";

const EXAMPLES = [
  "Annual price review for packaging materials. We buy 500 tonnes/year of corrugated cardboard from a single supplier. Prices went up 15% last year and we need to claw some back. Supplier knows we have no easy alternative.",
  "Renegotiate a 3PL logistics contract. Current provider has been with us 5 years, costs have crept up 20%. We're moving to a new WMS and need the supplier to integrate. They know we'd struggle to switch mid-year.",
  "Spot buy of 10,000 units of electronic components urgently needed for a production line stoppage. We need delivery in 2 weeks. Only 2 suppliers can deliver that fast.",
  "Negotiate a new IT software licence renewal. Vendor has increased list price 30%. We use the tool daily and switching costs are high, but we've seen a competitor product at half the price.",
];

type Phase = "input" | "loading" | "review";

export default function BuildPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("input");
  const [description, setDescription] = useState("");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleBuild() {
    if (!description.trim()) return;
    setPhase("loading");
    setError("");
    try {
      const res = await fetch("/api/build-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setScenario(data);
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("input");
    }
  }

  function updateScenario(path: string[], value: string) {
    if (!scenario) return;
    const updated = structuredClone(scenario);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj: any = updated;
    for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
    obj[path[path.length - 1]] = value;
    setScenario(updated);
  }

  function generateLink() {
    if (!scenario) return;
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

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Build with AI</h1>
              <p className="text-sm text-slate-400 mt-0.5">Describe your scenario in plain English — Claude fills in the brief</p>
            </div>
          </div>
          {phase === "review" && (
            <button
              onClick={() => { setPhase("input"); setGenerated(""); setSaved(false); }}
              className="text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-xl transition-colors"
            >
              Start over
            </button>
          )}
        </div>

        {/* Input phase */}
        {phase === "input" && (
          <div className="space-y-6">
            <NegotiationGlossary />
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
              <label className="text-xs text-slate-400 uppercase tracking-widest">
                Describe your negotiation scenario
              </label>
              <textarea
                className="w-full bg-slate-900 border border-slate-600 focus:border-indigo-500 text-slate-100 placeholder:text-slate-600 rounded-xl px-4 py-3 text-sm outline-none transition-colors resize-none h-40"
                placeholder="e.g. Annual price renegotiation for steel coils. We buy 2,000 tonnes/year from a supplier in Germany. Prices have risen 12% and we need to push back. We have one alternative supplier but switching would take 3 months..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                onClick={handleBuild}
                disabled={!description.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
              >
                Build Scenario with AI →
              </button>
            </div>

            {/* Examples */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-widest px-1">Try an example</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setDescription(ex)}
                    className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl p-4 text-left text-sm text-slate-400 hover:text-slate-300 transition-all line-clamp-3"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading phase */}
        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-slate-400 text-sm">Claude is building your scenario...</p>
            <p className="text-slate-600 text-xs">Generating briefs, MDO/LDO, BATNA and variables</p>
          </div>
        )}

        {/* Review phase */}
        {phase === "review" && scenario && (
          <div className="space-y-5">

            {/* Scenario header */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  AI Generated — review and edit before saving
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EditField label="Title" value={scenario.title} onChange={(v) => updateScenario(["title"], v)} />
                <EditField label="Product / Service" value={scenario.product} onChange={(v) => updateScenario(["product"], v)} />
              </div>
              <EditField label="Context" value={scenario.context} multiline onChange={(v) => updateScenario(["context"], v)} />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <EditField label="Currency" value={scenario.currency} onChange={(v) => updateScenario(["currency"], v)} />
                <EditField label="Unit" value={scenario.unit} onChange={(v) => updateScenario(["unit"], v)} />
                <div className="md:col-span-2">
                  <EditField label="Difficulty">
                    <select
                      value={scenario.difficulty}
                      onChange={(e) => updateScenario(["difficulty"], e.target.value)}
                      className={selectCls}
                    >
                      <option value="easy">Easy — Cooperative AI</option>
                      <option value="medium">Medium — Professional AI</option>
                      <option value="hard">Hard — Assertive AI</option>
                    </select>
                  </EditField>
                </div>
              </div>
              <EditField label="Negotiation Variables" value={scenario.variables} onChange={(v) => updateScenario(["variables"], v)} />

              {/* Game Timer */}
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 flex items-center gap-5">
                <div className="text-2xl shrink-0">⏱</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-400">Game Timer</p>
                  <p className="text-xs text-slate-400 mt-0.5">Set a countdown players must finish within. Leave at 0 for no time limit.</p>
                </div>
                <div className="shrink-0 w-36">
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min={0}
                      max={60}
                      placeholder="0"
                      value={scenario.timeLimit ?? 0}
                      onChange={(e) => updateScenario(["timeLimit"], e.target.value)}
                      className="w-full bg-slate-900 border border-amber-500/50 focus:border-amber-400 text-slate-100 placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm outline-none text-center font-mono text-lg"
                    />
                    <span className="absolute right-3 text-xs text-slate-500 pointer-events-none">min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Briefs */}
            <NegotiationGlossary compact />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <BriefCard
                title="Buyer Brief"
                color="indigo"
                brief={scenario.buyerBrief}
                currency={scenario.currency}
                unit={scenario.unit}
                onChange={(k, v) => updateScenario(["buyerBrief", k], v)}
              />
              <BriefCard
                title="Seller Brief"
                color="amber"
                brief={scenario.sellerBrief}
                currency={scenario.currency}
                unit={scenario.unit}
                onChange={(k, v) => updateScenario(["sellerBrief", k], v)}
              />
            </div>

            {/* ZOPA indicator */}
            <ZopaIndicator scenario={scenario} />

            {/* Generate */}
            <div className="flex flex-col items-center gap-4 pb-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={generateLink}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
                >
                  Generate &amp; Save
                </button>
                {saved && (
                  <span className="text-emerald-400 text-sm">✓ Saved to library</span>
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
        )}
      </div>
    </div>
  );
}

/* ── ZOPA indicator ── */
function ZopaIndicator({ scenario }: { scenario: Scenario }) {
  const buyerLDO = parseFloat(scenario.buyerBrief.ldoValue);
  const sellerLDO = parseFloat(scenario.sellerBrief.ldoValue);
  const buyerMDO = parseFloat(scenario.buyerBrief.mdoValue);
  const sellerMDO = parseFloat(scenario.sellerBrief.mdoValue);

  if (isNaN(buyerLDO) || isNaN(sellerLDO)) return null;

  const hasZopa = buyerLDO >= sellerLDO;

  return (
    <div className={`rounded-2xl p-4 border text-sm ${hasZopa ? "bg-emerald-900/20 border-emerald-600/40" : "bg-red-900/20 border-red-600/40"}`}>
      <p className={`font-semibold text-xs uppercase tracking-widest mb-1 ${hasZopa ? "text-emerald-400" : "text-red-400"}`}>
        Zone of Possible Agreement (ZOPA)
      </p>
      {hasZopa ? (
        <p className="text-slate-300">
          There is a <span className="text-emerald-400 font-semibold">ZOPA of {scenario.currency} {(buyerLDO - sellerLDO).toFixed(0)}</span> between the seller&apos;s LDO ({scenario.currency} {sellerLDO}) and the buyer&apos;s LDO ({scenario.currency} {buyerLDO}).
          {!isNaN(buyerMDO) && !isNaN(sellerMDO) && ` Full value range: ${scenario.currency} ${Math.min(buyerMDO, sellerMDO)} – ${Math.max(buyerMDO, sellerMDO)}.`}
        </p>
      ) : (
        <p className="text-slate-300">
          <span className="text-red-400 font-semibold">No ZOPA detected.</span> The buyer&apos;s LDO ({scenario.currency} {buyerLDO}) is below the seller&apos;s LDO ({scenario.currency} {sellerLDO}). Consider adjusting the briefs or this will likely end in a walk-away.
        </p>
      )}
    </div>
  );
}

/* ── Brief card ── */
function BriefCard({
  title, color, brief, currency, unit, onChange,
}: {
  title: string;
  color: "indigo" | "amber";
  brief: Scenario["buyerBrief"];
  currency: string;
  unit: string;
  onChange: (key: string, value: string) => void;
}) {
  const border = color === "indigo" ? "border-indigo-500/30" : "border-amber-500/30";
  const accent = color === "indigo" ? "text-indigo-400" : "text-amber-400";

  return (
    <div className={`bg-slate-800 border ${border} rounded-2xl p-5 space-y-3`}>
      <h3 className={`text-xs font-semibold uppercase tracking-widest ${accent}`}>
        {title} <span className="text-slate-500 font-normal normal-case">(confidential)</span>
      </h3>
      <EditField label="Role" value={brief.role} onChange={(v) => onChange("role", v)} />
      <EditField label="Objective" value={brief.objective} multiline onChange={(v) => onChange("objective", v)} />
      <div className="grid grid-cols-2 gap-3">
        <EditField
          label={`MDO — Most Desired Outcome (${currency}/${unit})`}
          hint="Opening anchor — best realistic result."
          value={brief.mdoValue}
          onChange={(v) => onChange("mdoValue", v)}
        />
        <EditField
          label={`LDO — Least Desirable Outcome (${currency}/${unit})`}
          hint="Hard walk-away point — worst you will accept."
          value={brief.ldoValue}
          onChange={(v) => onChange("ldoValue", v)}
        />
      </div>
      <EditField
        label="BATNA — Best Alternative to a Negotiated Agreement"
        hint="Plan B if talks fail entirely — defines your true leverage."
        value={brief.batna}
        onChange={(v) => onChange("batna", v)}
      />
      <EditField label="Other Priorities" value={brief.priorities} onChange={(v) => onChange("priorities", v)} />
      <EditField label="Constraints" value={brief.constraints} multiline onChange={(v) => onChange("constraints", v)} />
    </div>
  );
}

/* ── Editable field ── */
function EditField({
  label,
  hint,
  value,
  multiline,
  onChange,
  children,
}: {
  label: string;
  hint?: string;
  value?: string;
  multiline?: boolean;
  onChange?: (v: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-500">{label}</label>
      {hint && <p className="text-xs text-slate-600 italic -mt-0.5">{hint}</p>}
      {children ?? (
        multiline ? (
          <textarea
            className={`${inputCls} resize-none h-16`}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
          />
        ) : (
          <input
            className={inputCls}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
          />
        )
      )}
    </div>
  );
}

const inputCls =
  "w-full bg-slate-900 border border-slate-600 focus:border-indigo-500 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none transition-colors";
const selectCls =
  "w-full bg-slate-900 border border-slate-600 focus:border-indigo-500 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none transition-colors";
