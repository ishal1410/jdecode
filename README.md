# JDecode — ATS Keyword Decoder

> 75% of resumes never reach a human — ATS filters them first.

Paste any job posting. Get a ranked list of exactly which keywords your resume is missing. Upload your resume and see your match score instantly.

**Live → [jdecode.vercel.app](https://jdecode.vercel.app)**

![Python](https://img.shields.io/badge/Python-3.11+-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green) ![Next.js](https://img.shields.io/badge/Next.js-16-black) ![License](https://img.shields.io/badge/license-MIT-orange)

---

## Features

- **ATS keyword extraction** — every keyword ranked Critical / Important / Preferred / Nice to have
- **Resume gap analysis** — upload PDF or DOCX, get a match score and see exactly what's missing
- **Synonym resolution** — "ML" and "Machine Learning" count as the same keyword
- **Red flag detector** — spots impossible requirements, vague pay, unpaid work signals
- **6 AI providers** — Groq, Gemini, Cerebras, OpenRouter (all free), Anthropic, OpenAI
- **BYOK** — bring your own API key, nothing stored on the server, zero cost to run

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, Tailwind CSS, TypeScript |
| Backend | Python, FastAPI |
| AI | Groq / Gemini / Cerebras / OpenRouter / Anthropic / OpenAI |
| Resume parsing | PyMuPDF, python-docx |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Run locally

**1. Clone**
```bash
git clone https://github.com/ishal1410/jdecode.git
cd jdecode
```

**2. Backend**
```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --port 8000
```

**3. Frontend**
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

No API key needed on the server — users bring their own.

---

## Free API keys

| Provider | Model | Get key |
|---|---|---|
| Cerebras | Llama 3.1 8B | [cloud.cerebras.ai](https://cloud.cerebras.ai) |
| Groq | Llama 3.3 70B | [console.groq.com](https://console.groq.com) |
| Gemini | Gemini 2.0 Flash | [aistudio.google.com](https://aistudio.google.com/apikey) |

---

## License

MIT
