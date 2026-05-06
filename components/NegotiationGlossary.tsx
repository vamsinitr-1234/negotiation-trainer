/**
 * NegotiationGlossary
 * Reusable reference panel explaining MDO, LDO and BATNA.
 * Used on the Create, Build and Play pages.
 */

const TERMS = [
  {
    abbr: "MDO",
    full: "Most Desired Outcome",
    color: "emerald",
    icon: "↑",
    description:
      "The best realistic result you could achieve. Use this as your opening anchor — start here and concede downward only when necessary.",
  },
  {
    abbr: "LDO",
    full: "Least Desirable Outcome",
    color: "red",
    icon: "↓",
    description:
      "Your absolute walk-away point — the minimum you will accept before it is better to have no deal at all. Never reveal this to the other party.",
  },
  {
    abbr: "BATNA",
    full: "Best Alternative to a Negotiated Agreement",
    color: "amber",
    icon: "⇄",
    description:
      "What you will do if the negotiation fails entirely. A strong BATNA gives you leverage; a weak one makes you vulnerable. Know yours before you start.",
  },
];

const colorMap: Record<string, { bg: string; border: string; abbr: string; icon: string }> = {
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    abbr: "text-emerald-400",
    icon: "text-emerald-400",
  },
  red: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    abbr: "text-red-400",
    icon: "text-red-400",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    abbr: "text-amber-400",
    icon: "text-amber-400",
  },
};

export function NegotiationGlossary({ compact = false }: { compact?: boolean }) {
  if (compact) {
    // Inline single-row strip — used inside brief panels
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {TERMS.map((t) => {
          const c = colorMap[t.color];
          return (
            <div
              key={t.abbr}
              className={`${c.bg} ${c.border} border rounded-xl px-3 py-2.5 space-y-0.5`}
            >
              <p className="text-xs font-bold tracking-wide">
                <span className={c.abbr}>{t.abbr}</span>
                <span className="text-slate-400 font-normal"> — {t.full}</span>
              </p>
              <p className="text-xs text-slate-400 leading-snug">{t.description}</p>
            </div>
          );
        })}
      </div>
    );
  }

  // Full standalone card — used at top of create/build pages
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-3">
      <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
        Negotiation Terms Reference
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TERMS.map((t) => {
          const c = colorMap[t.color];
          return (
            <div
              key={t.abbr}
              className={`${c.bg} ${c.border} border rounded-xl p-4 space-y-1.5`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-lg font-black leading-none ${c.icon}`}>{t.icon}</span>
                <div>
                  <span className={`text-sm font-black ${c.abbr}`}>{t.abbr}</span>
                  <p className="text-xs text-slate-300 font-medium leading-tight">{t.full}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{t.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
