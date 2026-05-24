"use client";

import { useState } from "react";

export type Provider = "groq" | "gemini" | "anthropic" | "openai";

export const PROVIDERS: {
  id: Provider;
  label: string;
  free: boolean;
  model: string;
  url: string;
}[] = [
  { id: "groq",      label: "Groq",      free: true,  model: "Llama 3.3 70B",    url: "https://console.groq.com" },
  { id: "gemini",    label: "Gemini",    free: true,  model: "Gemini 2.0 Flash", url: "https://aistudio.google.com/apikey" },
  { id: "anthropic", label: "Anthropic", free: false, model: "Claude 3.5 Haiku", url: "https://console.anthropic.com" },
  { id: "openai",    label: "OpenAI",    free: false, model: "GPT-4o Mini",      url: "https://platform.openai.com/api-keys" },
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
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      {/* Provider buttons */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">AI Provider</p>
        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => onProviderChange(p.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                provider === p.id
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              {p.label}
              {p.free && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  provider === p.id ? "bg-green-400 text-green-900" : "bg-green-100 text-green-700"
                }`}>
                  FREE
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* API key input */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-gray-500">
            {selected.label} API Key
            <span className="ml-2 text-gray-400 font-normal">({selected.model})</span>
          </p>
          <a
            href={selected.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            Get free key →
          </a>
        </div>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder={`Paste your ${selected.label} API key`}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm pr-16 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Your key is never stored — used only for this request.
        </p>
      </div>
    </div>
  );
}
