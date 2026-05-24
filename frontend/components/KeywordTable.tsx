"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Keyword = {
  keyword: string;
  canonical_form: string;
  score: number;
  section: string;
  category: string;
  frequency: number;
  synonyms: string[];
  importance_label: "Critical" | "Important" | "Preferred" | "Nice to have";
};

type AnalysisResult = {
  job_info: {
    title: string;
    company: string;
    location: string;
    employment_type: string;
    experience_years: number;
    education: string | null;
    remote_friendly: boolean;
    salary_range: string | null;
  };
  ats_result: {
    ranked_keywords: Keyword[];
    critical_count: number;
    important_count: number;
    total_keywords: number;
    top_categories: Record<string, number>;
  };
  red_flags: string[];
};

const BADGE: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border border-red-200",
  Important: "bg-orange-100 text-orange-700 border border-orange-200",
  Preferred: "bg-blue-100 text-blue-700 border border-blue-200",
  "Nice to have": "bg-gray-100 text-gray-600 border border-gray-200",
};

export default function KeywordTable() {
  const [input, setInput] = useState("");
  const [inputType, setInputType] = useState<"url" | "text">("url");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function analyze() {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    const body =
      inputType === "url"
        ? { url: input.trim() }
        : { text: input.trim() };

    try {
      const res = await fetch(`${API}/api/v1/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Analysis failed");
      }
      setResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setInputType("url")}
            className={`text-sm px-3 py-1 rounded-md font-medium ${
              inputType === "url"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Job URL
          </button>
          <button
            onClick={() => setInputType("text")}
            className={`text-sm px-3 py-1 rounded-md font-medium ${
              inputType === "text"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Paste Text
          </button>
        </div>

        {inputType === "url" ? (
          <input
            type="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://linkedin.com/jobs/view/..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        ) : (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={7}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />
        )}

        <button
          onClick={analyze}
          disabled={loading || !input.trim()}
          className="mt-4 w-full bg-gray-900 text-white py-3 rounded-lg font-medium text-sm hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Analyzing…" : "Decode ATS Keywords"}
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
            {error}
          </p>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Job info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 text-lg">
              {result.job_info.title || "Job Posting"}
            </h2>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
              {result.job_info.company && <span>{result.job_info.company}</span>}
              {result.job_info.location && <span>· {result.job_info.location}</span>}
              {result.job_info.employment_type && (
                <span>· {result.job_info.employment_type}</span>
              )}
              {result.job_info.experience_years > 0 && (
                <span>· {result.job_info.experience_years}+ yrs exp</span>
              )}
              {result.job_info.salary_range && (
                <span className="text-green-600 font-medium">
                  · {result.job_info.salary_range}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-4 mt-4">
              <Stat
                label="Critical"
                value={result.ats_result.critical_count}
                color="text-red-600"
              />
              <Stat
                label="Important"
                value={result.ats_result.important_count}
                color="text-orange-600"
              />
              <Stat
                label="Total keywords"
                value={result.ats_result.total_keywords}
                color="text-gray-700"
              />
            </div>
          </div>

          {/* Red flags */}
          {result.red_flags.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-yellow-800 mb-2">
                ⚠ Red flags detected
              </p>
              <ul className="space-y-1">
                {result.red_flags.map((flag, i) => (
                  <li key={i} className="text-sm text-yellow-700">
                    · {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Keyword table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">ATS Keywords — Ranked by Importance</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Add these to your resume in order of priority. Critical = must have to pass screening.
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">Keyword</th>
                  <th className="text-left px-5 py-3">Importance</th>
                  <th className="text-left px-5 py-3 hidden sm:table-cell">Category</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">Synonyms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.ats_result.ranked_keywords.map((kw, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {kw.canonical_form}
                      {kw.frequency > 1 && (
                        <span className="ml-2 text-xs text-gray-400">
                          ×{kw.frequency}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          BADGE[kw.importance_label]
                        }`}
                      >
                        {kw.importance_label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden sm:table-cell capitalize">
                      {kw.category.replace(/_/g, " ")}
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs hidden md:table-cell">
                      {kw.synonyms.slice(0, 3).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <span className={`text-xl font-bold ${color}`}>{value}</span>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
