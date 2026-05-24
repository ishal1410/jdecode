"use client";

import { useState } from "react";

export type Provider = "groq" | "gemini" | "openrouter" | "anthropic" | "openai";

export const PROVIDERS: {
  id: Provider;
  label: string;
  free: boolean;
  model: string;
  url: string;
  color: string;
}[] = [
  { id: "groq",       label: "Groq",       free: true,  model: "Llama 3.3 70B",    url: "https://console.groq.com",             color: "from-orange-500 to-red-500" },
  { id: "gemini",     label: "Gemini",     free: true,  model: "Gemini 2.0 Flash", url: "https://aistudio.google.com/apikey",   color: "from-blue-500 to-cyan-500" },
  { id: "openrouter", label: "OpenRouter", free: true,  model: "DeepSeek V4",      url: "https://openrouter.ai/keys",           color: "from-violet-500 to-purple-500" },
  { id: "anthropic",  label: "Anthropic",  free: false, model: "Claude 3.5 Haiku", url: "https://console.anthropic.com",        color: "from-amber-500 to-orange-500" },
  { id: "openai",     label: "OpenAI",     free: false, model: "GPT-4o Mini",      url: "https://platform.openai.com/api-keys", color: "from-emerald-500 to-teal-500" },
];

interface Props {
  provider: Provider;
  apiKey: string;
  onProviderChange: (p: Provider) => void;
  onApiKeyChange: (k: string) => void;
}

export default function ApiKeyInput({ provider, apiKey, onProviderChange, onApiKeyChange }: Props) {
  const [show, setShow] = useState(false);
  const selected = PROVIDERS.find((p) => p.id === provider)!;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      {/* Provider grid */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Choose AI Provider</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => onProviderChange(p.id)}
              className={`relative flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                provider === p.id
                  ? "border-slate-900 bg-white shadow-md text-slate-900"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              {p.free && (
                <span className="absolute -top-2 -right-2 text-xs bg-emerald-500 text-white font-bold px-1.5 py-0.5 rounded-full leading-none">
                  FREE
                </span>
              )}
              <span className="font-bold">{p.label}</span>
              <span className="text-xs text-slate-400 font-normal">{p.model}</span>
            </button>
          ))}
        </div>
      </div>

      {/* API key input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {selected.label} API Key
          </p>
          <a
            href={selected.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            {selected.free ? "Get free key →" : "Get key →"}
          </a>
        </div>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder={`Paste your ${selected.label} API key here`}
            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm pr-16 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-300"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          🔒 Never stored — used only for this request
        </p>
      </div>
    </div>
  );
}
