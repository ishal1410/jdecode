"use client";

import { useState } from "react";
import KeywordTable from "./KeywordTable";
import GapAnalysis from "./GapAnalysis";

type Tab = "analyze" | "gap";

export default function Decoder() {
  const [tab, setTab] = useState<Tab>("analyze");

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-fit">
        {([
          { id: "analyze", label: "Analyze Job",       icon: "🔍" },
          { id: "gap",     label: "Check My Resume",   icon: "📄" },
        ] as { id: Tab; label: string; icon: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "analyze" ? <KeywordTable /> : <GapAnalysis />}
    </div>
  );
}
