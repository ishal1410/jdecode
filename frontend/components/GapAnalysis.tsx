"use client";

import { useState, useRef } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Keyword = {
  keyword: string;
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
  resume_info: { extracted_skills: string[]; years_experience: number | null; education: string | null };
  summary: { total: number; matched: number; missing: number; critical_missing: number };
};

const BADGE: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border border-red-200",
  Important: "bg-orange-100 text-orange-700 border border-orange-200",
  Preferred: "bg-blue-100 text-blue-700 border border-blue-200",
  "Nice to have": "bg-gray-100 text-gray-600 border border-gray-200",
};

export default function GapAnalysis() {
  const [url, setUrl] = useState("");
  const [inputType, setInputType] = useState<"url" | "text">("url");
  const [jobText, setJobText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GapResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function analyze() {
    if (!file) { setError("Upload your resume first."); return; }
    if (!url.trim() && !jobText.trim()) { setError("Provide a job URL or paste the job description."); return; }

    setLoading(true);
    setError("");
    setResult(null);

    const form = new FormData();
    form.append("file", file);
    if (inputType === "url" && url.trim()) form.append("url", url.trim());
    if (inputType === "text" && jobText.trim()) form.append("text", jobText.trim());

    try {
      const res = await fetch(`${API}/api/v1/gap-analysis`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Gap analysis failed");
      }
      setResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const scoreColor =
    !result ? "" :
    result.match_score >= 75 ? "text-green-600" :
    result.match_score >= 50 ? "text-orange-500" :
    "text-red-600";

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        {/* Job input */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Job Posting</label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setInputType("url")}
              className={`text-sm px-3 py-1 rounded-md font-medium ${
                inputType === "url" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              URL
            </button>
            <button
              onClick={() => setInputType("text")}
              className={`text-sm px-3 py-1 rounded-md font-medium ${
                inputType === "text" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Paste Text
            </button>
          </div>
          {inputType === "url" ? (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://linkedin.com/jobs/view/..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          ) : (
            <textarea
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder="Paste the full job description here..."
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          )}
        </div>

        {/* Resume upload */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Your Resume</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
          >
            {file ? (
              <p className="text-sm text-gray-700 font-medium">{file.name}</p>
            ) : (
              <>
                <p className="text-sm text-gray-500">Click to upload PDF or DOCX</p>
                <p className="text-xs text-gray-400 mt-1">Max 5MB — never stored on our servers</p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        <button
          onClick={analyze}
          disabled={loading || !file}
          className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium text-sm hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Analyzing…" : "Check My Resume"}
        </button>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Score card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900 text-lg">
                  {result.job_info.title || "Job Posting"}
                  {result.job_info.company && (
                    <span className="text-gray-500 font-normal text-base">
                      {" "}· {result.job_info.company}
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  You match {result.summary.matched} of {result.summary.total} ATS keywords
                  {result.summary.critical_missing > 0 && (
                    <span className="text-red-600 font-medium">
                      {" "}— {result.summary.critical_missing} critical ones missing
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-4xl font-bold ${scoreColor}`}>
                  {result.match_score}%
                </span>
                <p className="text-xs text-gray-400">match score</p>
              </div>
            </div>

            {/* Score bar */}
            <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  result.match_score >= 75 ? "bg-green-500" :
                  result.match_score >= 50 ? "bg-orange-400" :
                  "bg-red-500"
                }`}
                style={{ width: `${result.match_score}%` }}
              />
            </div>
          </div>

          {/* Critical missing */}
          {result.critical_missing.length > 0 && (
            <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-red-100 bg-red-50">
                <h3 className="font-semibold text-red-800">
                  Critical Keywords Missing from Your Resume
                </h3>
                <p className="text-xs text-red-600 mt-0.5">
                  Add these first — they have the highest chance of causing ATS rejection.
                </p>
              </div>
              <ul className="divide-y divide-gray-100">
                {result.critical_missing.map((kw, i) => (
                  <li key={i} className="px-5 py-3 flex items-center justify-between">
                    <span className="font-medium text-gray-900">{kw.canonical_form}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE[kw.importance_label]}`}>
                      {kw.importance_label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full keyword breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Full Keyword Breakdown</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Keyword</th>
                  <th className="text-left px-5 py-3">Importance</th>
                  <th className="text-left px-5 py-3">In Resume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...result.matched_keywords, ...result.missing_keywords]
                  .sort((a, b) => {
                    const order = ["Critical", "Important", "Preferred", "Nice to have"];
                    return order.indexOf(a.importance_label) - order.indexOf(b.importance_label);
                  })
                  .map((kw, i) => (
                    <tr key={i} className={kw.in_resume ? "bg-green-50/40" : ""}>
                      <td className="px-5 py-3 font-medium text-gray-900">{kw.canonical_form}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE[kw.importance_label]}`}>
                          {kw.importance_label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {kw.in_resume ? (
                          <span className="text-green-600 font-medium text-xs">✓ Found</span>
                        ) : (
                          <span className="text-red-500 text-xs">✗ Missing</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Red flags */}
          {result.red_flags.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-yellow-800 mb-2">⚠ Red flags in this posting</p>
              <ul className="space-y-1">
                {result.red_flags.map((flag, i) => (
                  <li key={i} className="text-sm text-yellow-700">· {flag}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
