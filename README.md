# JDecode — ATS Keyword Decoder

Paste any job URL. Get a ranked list of exactly which keywords your resume needs to pass ATS screening.

![Python](https://img.shields.io/badge/Python-3.10+-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-green) ![Next.js](https://img.shields.io/badge/Next.js-black) ![License](https://img.shields.io/badge/license-MIT-orange)

## What it does

- Paste a job URL (LinkedIn, Indeed, Greenhouse, Lever, Workday) or raw text
- Get every ATS keyword ranked: **Critical / Important / Preferred / Nice to have**
- Synonym resolution — "ML" and "Machine Learning" map to the same keyword
- Red flag detector — spots impossible requirements, vague pay, unpaid work
- Resume gap analysis — upload your PDF/DOCX, see your exact match score

## Stack

| Layer | Tech |
|---|---|
| Backend | Python, FastAPI, Playwright |
| AI extraction | Claude API (Anthropic) |
| Frontend | Next.js, Tailwind CSS |
| Resume parsing | PyMuPDF, python-docx |

## Setup

**1. Clone the repo**
```bash
git clone https://github.com/ishal1410/jdecode.git
cd jdecode
```

**2. Backend**
```bash
py -3 -m venv .venv
.venv\Scripts\pip install --only-binary :all: -r backend\requirements.txt
.venv\Scripts\playwright install chromium
```

**3. Add your API key**

Copy `.env.example` to `.env` and add your key:
```
ANTHROPIC_API_KEY=sk-ant-...
```
Get a free key with $5 credits at [console.anthropic.com](https://console.anthropic.com) — enough for ~1,600 analyses.

**4. Frontend**
```bash
cd frontend
npm install
```

## Run

```bash
# Terminal 1 — backend
.venv\Scripts\uvicorn backend.main:app --reload

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## License

MIT
