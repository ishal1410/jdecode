"use client";

import { useState } from "react";
import ApiKeyInput, { Provider } from "./ApiKeyInput";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Keyword = {
  canonical_form: string;
  importance_label: "Critical" | "Important" | "Preferred" | "Nice to have";
  category: string;
  frequency: number;
  synonyms: string[];
};

type AnalysisResult = {
  job_info: {
    title: string; company: string; location: string;
    employment_type: string; experience_years: number;
    education: string | null; remote_friendly: boolean; salary_range: string | null;
  };
  ats_result: {
    ranked_keywords: Keyword[];
    critical_count: number; important_count: number; total_keywords: number;
  };
  red_flags: string[];
};

const IMPORTANCE: Record<string, { bg: string; text: string; dot: string }> = {
  "Critical":       { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500" },
  "Important":      { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  "Preferred":      { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500" },
  "Nice to have":   { bg: "bg-slate-50",  text: "text-slate-500",  dot: "bg-slate-300" },
};

export default function KeywordTable() {
  const [inputType, setInputType] = useState<"url" | "text">("url");
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<Provider>("groq");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function analyze() {
    if (!input.trim()) { setError("Paste a job URL or description."); return; }
    if (!apiKey.trim()) { setError("Add your API key above."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`${API}/api/v1/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [inputType]: input.trim(), provider, api_key: apiKey.trim() }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed"); }
      setResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoading(false); }
  }

  const grouped = result ? {
    "Critical":     result.ats_result.ranked_keywords.filter(k => k.importance_label === "Critical"),
    "Important":    result.ats_result.ranked_keywords.filter(k => k.importance_label === "Important"),
    "Preferred":    result.ats_result.ranked_keywords.filter(k => k.importance_label === "Preferred"),
    "Nice to have": result.ats_result.ranked_keywords.filter(k => k.importance_label === "Nice to have"),
  } : null;

  return (
    <div className="space-y-4">
      {/* Input card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <ApiKeyInput provider={provider} apiKey={apiKey} onProviderChange={setProvider} onApiKeyChange={setApiKey} />

        {/* Job input */}
        <div className="space-y-3">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
            {(["url", "text"] as const).map((t) => (
              <button key={t} onClick={() => setInputType(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  inputType === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}>
                {t === "url" ? "Job URL" : "Paste Text"}
              </button>
            ))}
          </div>

          {inputType === "url" ? (
            <input type="url" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="https://greenhouse.io/jobs/... or any job posting URL"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 placeholder:text-slate-300" />
          ) : (
            <textarea value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Paste the full job description here..." rows={6}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 resize-none placeholder:text-slate-300" />
          )}
        </div>

        <button onClick={analyze} disabled={loading || !input.trim() || !apiKey.trim()}
          className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold text-sm hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
          {loading
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing...</span>
            : "🔍 Decode ATS Keywords"}
        </button>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            <span>⚠</span><span>{error}</span>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4 fade-up">
          {/* Job info */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{result.job_info.title || "Job Posting"}</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  {[result.job_info.company, result.job_info.location, result.job_info.employment_type].filter(Boolean).join(" · ")}
                  {result.job_info.experience_years > 0 && ` · ${result.job_info.experience_years}+ yrs`}
                </p>
              </div>
              {result.job_info.salary_range && (
                <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full whitespace-nowrap">
                  {result.job_info.salary_range}
                </span>
              )}
            </div>

            <div className="flex gap-6 mt-4 pt-4 border-t border-slate-100">
              {[
                { label: "Critical",  value: result.ats_result.critical_count,  color: "text-red-600" },
                { label: "Important", value: result.ats_result.important_count, color: "text-orange-500" },
                { label: "Total",     value: result.ats_result.total_keywords,  color: "text-slate-700" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Red flags */}
          {result.red_flags.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-amber-800 mb-2">⚠ Red flags detected</p>
              <ul className="space-y-1">
                {result.red_flags.map((f, i) => <li key={i} className="text-sm text-amber-700 flex gap-2"><span>·</span><span>{f}</span></li>)}
              </ul>
            </div>
          )}

          {/* Keywords grouped by importance */}
          {grouped && Object.entries(grouped).map(([label, keywords]) =>
            keywords.length === 0 ? null : (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className={`flex items-center gap-2 px-5 py-3 border-b border-slate-100 ${IMPORTANCE[label].bg}`}>
                  <span className={`w-2 h-2 rounded-full ${IMPORTANCE[label].dot}`} />
                  <h3 className={`text-sm font-bold ${IMPORTANCE[label].text}`}>{label}</h3>
                  <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-white/60 ${IMPORTANCE[label].text}`}>
                    {keywords.length}
                  </span>
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {keywords.map((kw, i) => (
                    <div key={i} className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium cursor-default ${IMPORTANCE[label].bg} ${IMPORTANCE[label].text} border-current/20`}>
                      {kw.canonical_form}
                      {kw.frequency > 1 && <span className="text-xs opacity-60">×{kw.frequency}</span>}
                      {kw.synonyms.length > 0 && (
                        <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10 shadow-xl">
                          Also: {kw.synonyms.slice(0, 4).join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
