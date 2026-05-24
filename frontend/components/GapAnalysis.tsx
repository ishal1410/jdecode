"use client";

import { useState, useRef } from "react";
import ApiKeyInput, { Provider } from "./ApiKeyInput";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Keyword = {
  canonical_form: string;
  importance_label: "Critical" | "Important" | "Preferred" | "Nice to have";
  category: string;
  in_resume: boolean;
};

type GapResult = {
  job_info: { title: string; company: string };
  match_score: number;
  matched_keywords: Keyword[];
  missing_keywords: Keyword[];
  critical_missing: Keyword[];
  red_flags: string[];
  summary: { total: number; matched: number; missing: number; critical_missing: number };
};

const BADGE: Record<string, string> = {
  "Critical":     "bg-red-100 text-red-700",
  "Important":    "bg-orange-100 text-orange-700",
  "Preferred":    "bg-blue-100 text-blue-700",
  "Nice to have": "bg-slate-100 text-slate-500",
};

export default function GapAnalysis() {
  const [inputType, setInputType] = useState<"url" | "text">("url");
  const [jobInput, setJobInput] = useState("");
  const [provider, setProvider] = useState<Provider>("groq");
  const [apiKey, setApiKey] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GapResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function analyze() {
    if (!file)            { setError("Upload your resume first."); return; }
    if (!jobInput.trim()) { setError("Provide a job URL or paste the description."); return; }
    if (!apiKey.trim())   { setError("Add your API key above."); return; }

    setLoading(true); setError(""); setResult(null);
    const form = new FormData();
    form.append("file", file);
    form.append("provider", provider);
    form.append("api_key", apiKey.trim());
    if (inputType === "url") form.append("url", jobInput.trim());
    else form.append("text", jobInput.trim());

    try {
      const res = await fetch(`${API}/api/v1/gap-analysis`, { method: "POST", body: form });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed"); }
      setResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoading(false); }
  }

  const score = result?.match_score ?? 0;
  const scoreColor = score >= 75 ? "text-emerald-600" : score >= 50 ? "text-orange-500" : "text-red-600";
  const barColor   = score >= 75 ? "bg-emerald-500"  : score >= 50 ? "bg-orange-400"   : "bg-red-500";

  const allKeywords = result
    ? [...result.matched_keywords, ...result.missing_keywords].sort((a, b) => {
        const order = ["Critical", "Important", "Preferred", "Nice to have"];
        return order.indexOf(a.importance_label) - order.indexOf(b.importance_label);
      })
    : [];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <ApiKeyInput provider={provider} apiKey={apiKey} onProviderChange={setProvider} onApiKeyChange={setApiKey} />

        {/* Job input */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">Job Posting</p>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
            {(["url", "text"] as const).map((t) => (
              <button key={t} onClick={() => setInputType(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${inputType === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
                {t === "url" ? "URL" : "Paste Text"}
              </button>
            ))}
          </div>
          {inputType === "url" ? (
            <input type="url" value={jobInput} onChange={(e) => setJobInput(e.target.value)}
              placeholder="https://greenhouse.io/jobs/..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 placeholder:text-slate-300" />
          ) : (
            <textarea value={jobInput} onChange={(e) => setJobInput(e.target.value)}
              placeholder="Paste the full job description..." rows={5}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 resize-none placeholder:text-slate-300" />
          )}
        </div>

        {/* Resume upload */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Your Resume</p>
          <div onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              file ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
            }`}>
            {file ? (
              <div className="flex items-center justify-center gap-2 text-emerald-700">
                <span className="text-lg">✓</span>
                <span className="text-sm font-semibold">{file.name}</span>
              </div>
            ) : (
              <>
                <p className="text-2xl mb-1">📄</p>
                <p className="text-sm font-medium text-slate-600">Click to upload PDF or DOCX</p>
                <p className="text-xs text-slate-400 mt-1">Max 5MB · never stored on our servers</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>

        <button onClick={analyze} disabled={loading || !file || !apiKey.trim()}
          className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold text-sm hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
          {loading
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing...</span>
            : "📊 Check My Resume"}
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
          {/* Score card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-900">{result.job_info.title || "Job Posting"}
                  {result.job_info.company && <span className="text-slate-400 font-normal text-sm"> · {result.job_info.company}</span>}
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  {result.summary.matched} of {result.summary.total} keywords found in your resume
                  {result.summary.critical_missing > 0 &&
                    <span className="text-red-600 font-semibold"> · {result.summary.critical_missing} critical missing</span>}
                </p>
              </div>
              <div className="text-right ml-4">
                <span className={`text-4xl font-extrabold ${scoreColor}`}>{score}%</span>
                <p className="text-xs text-slate-400">match</p>
              </div>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${score}%` }} />
            </div>
          </div>

          {/* Critical missing */}
          {result.critical_missing.length > 0 && (
            <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-red-50 border-b border-red-100">
                <h3 className="font-bold text-red-800 text-sm">Critical keywords missing</h3>
                <p className="text-xs text-red-400 mt-0.5">Add these first — highest chance of ATS rejection</p>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {result.critical_missing.map((kw, i) => (
                  <span key={i} className="px-3 py-1.5 bg-red-50 text-red-700 text-sm font-semibold rounded-lg border border-red-200">
                    {kw.canonical_form}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Full table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Full keyword breakdown</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3">Keyword</th>
                  <th className="text-left px-5 py-3">Importance</th>
                  <th className="text-left px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allKeywords.map((kw, i) => (
                  <tr key={i} className={kw.in_resume ? "bg-emerald-50/40" : ""}>
                    <td className="px-5 py-3 font-semibold text-slate-800">{kw.canonical_form}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${BADGE[kw.importance_label]}`}>
                        {kw.importance_label}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-sm">
                      {kw.in_resume
                        ? <span className="text-emerald-600 flex items-center gap-1"><span>✓</span> Found</span>
                        : <span className="text-red-500 flex items-center gap-1"><span>✗</span> Missing</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.red_flags.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-amber-800 mb-2">⚠ Red flags in this posting</p>
              {result.red_flags.map((f, i) => <p key={i} className="text-sm text-amber-700 flex gap-2"><span>·</span><span>{f}</span></p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
