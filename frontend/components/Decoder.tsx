"use client";

import { useState } from "react";
import KeywordTable from "./KeywordTable";
import GapAnalysis from "./GapAnalysis";

type Tab = "analyze" | "gap";

export default function Decoder() {
  const [tab, setTab] = useState<Tab>("analyze");

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("analyze")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "analyze"
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Analyze Job
        </button>
        <button
          onClick={() => setTab("gap")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "gap"
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Check My Resume
        </button>
      </div>

      {tab === "analyze" ? <KeywordTable /> : <GapAnalysis />}
    </div>
  );
}
