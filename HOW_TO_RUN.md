# How to run JDecode

## 1. Add your API key

Create a file called `.env` inside the `jdecode/` folder:

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```

Get your key at: https://console.anthropic.com/

## 2. Start the backend (Terminal 1)

```bash
cd jdecode
.venv\Scripts\uvicorn backend.main:app --reload
```

API runs at http://localhost:8000
Interactive docs at http://localhost:8000/docs

## 3. Start the frontend (Terminal 2)

```bash
cd jdecode/frontend
npm run dev
```

App runs at http://localhost:3000

## 4. Test it

Paste any job posting URL from LinkedIn, Indeed, Greenhouse, or Lever into the app.
Or paste raw job description text directly.

For gap analysis, upload your resume as PDF or DOCX.

## Install (first time only)

```bash
cd jdecode
py -3 -m venv .venv
.venv\Scripts\pip install --only-binary :all: -r backend\requirements.txt
.venv\Scripts\playwright install chromium

cd frontend
npm install
```
