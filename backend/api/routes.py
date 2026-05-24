from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional

from backend.scraper.job_scraper import JobScraper
from backend.extractor.jd_extractor import JDExtractor, PROVIDERS
from backend.ranker.ats_ranker import ATSRanker
from backend.resume.parser import extract_text, extract_skills

router = APIRouter()
scraper = JobScraper()
extractor = JDExtractor()
ranker = ATSRanker()

VALID_PROVIDERS = set(PROVIDERS.keys())


class AnalyzeRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None
    provider: str = "groq"
    api_key: str


def _validate(provider: str, api_key: str):
    if provider not in VALID_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown provider '{provider}'. Choose: {', '.join(VALID_PROVIDERS)}")
    if not api_key or len(api_key.strip()) < 8:
        raise HTTPException(status_code=400, detail="API key is missing or too short.")


async def _fetch_and_analyze(url: Optional[str], text: Optional[str], provider: str, api_key: str) -> dict:
    if not url and not text:
        raise HTTPException(status_code=400, detail="Provide a URL or job description text.")

    _validate(provider, api_key)

    scraped_meta = {}
    job_text = text or ""

    if url:
        try:
            scraped = await scraper.scrape(url)
            scraped_meta = scraped
            if scraped.get("description"):
                job_text = scraped["description"]
        except ValueError as e:
            if not text:
                raise HTTPException(status_code=422, detail=str(e))
        except Exception as e:
            if not text:
                raise HTTPException(status_code=422, detail=f"Could not scrape URL: {e}")

    if len(job_text.strip()) < 80:
        raise HTTPException(status_code=422, detail="Job description too short to analyze.")

    try:
        extracted = extractor.extract(job_text, provider, api_key.strip(), scraped_meta)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {e}")

    try:
        ranked = ranker.rank(extracted)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ranking failed: {e}")

    return {
        "job_info": {
            "title": extracted.job_title,
            "company": extracted.company,
            "location": extracted.location,
            "employment_type": extracted.employment_type,
            "experience_years": extracted.experience_years,
            "education": extracted.education,
            "remote_friendly": extracted.remote_friendly,
            "salary_range": extracted.salary_range,
        },
        "ats_result": ranked.model_dump(),
        "red_flags": extracted.red_flags,
    }


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/providers")
async def providers():
    return {
        "providers": [
            {"id": "groq",       "label": "Groq",       "free": True,  "model": "Llama 3.3 70B",    "url": "https://console.groq.com"},
            {"id": "gemini",     "label": "Gemini",     "free": True,  "model": "Gemini 2.0 Flash", "url": "https://aistudio.google.com/apikey"},
            {"id": "openrouter", "label": "OpenRouter", "free": True,  "model": "DeepSeek V4 Flash", "url": "https://openrouter.ai/keys"},
            {"id": "anthropic",  "label": "Anthropic",  "free": False, "model": "Claude 3.5 Haiku", "url": "https://console.anthropic.com"},
            {"id": "openai",     "label": "OpenAI",     "free": False, "model": "GPT-4o Mini",      "url": "https://platform.openai.com/api-keys"},
        ]
    }


@router.post("/analyze")
async def analyze_job(request: AnalyzeRequest):
    return await _fetch_and_analyze(request.url, request.text, request.provider, request.api_key)


@router.post("/gap-analysis")
async def gap_analysis(
    file: UploadFile = File(...),
    url: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
    provider: str = Form("groq"),
    api_key: str = Form(...),
):
    _validate(provider, api_key)

    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Resume too large. Max 5MB.")

    try:
        resume_text = extract_text(file_bytes, file.filename or "resume.pdf")
    except ValueError as e:
        raise HTTPException(status_code=415, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not read resume: {e}")

    if len(resume_text.strip()) < 50:
        raise HTTPException(status_code=422, detail="Could not extract text from resume.")

    try:
        resume_data = extract_skills(resume_text, provider, api_key.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume parsing failed: {e}")

    resume_skills_lower = {s.lower() for s in resume_data.get("skills", [])}
    analysis = await _fetch_and_analyze(url, text, provider, api_key)
    ranked_keywords = analysis["ats_result"]["ranked_keywords"]

    matched, missing = [], []
    for kw in ranked_keywords:
        terms = {kw["canonical_form"].lower()} | {s.lower() for s in kw["synonyms"]}
        found = bool(terms & resume_skills_lower or any(t in resume_text.lower() for t in terms))
        entry = {**kw, "in_resume": found}
        (matched if found else missing).append(entry)

    match_score = round(len(matched) / len(ranked_keywords) * 100) if ranked_keywords else 0
    critical_missing = [k for k in missing if k["importance_label"] == "Critical"]

    return {
        "job_info": analysis["job_info"],
        "match_score": match_score,
        "matched_keywords": matched,
        "missing_keywords": missing,
        "critical_missing": critical_missing,
        "red_flags": analysis["red_flags"],
        "resume_info": {
            "extracted_skills": resume_data.get("skills", []),
            "years_experience": resume_data.get("years_experience"),
            "education": resume_data.get("education"),
        },
        "summary": {
            "total": len(ranked_keywords),
            "matched": len(matched),
            "missing": len(missing),
            "critical_missing": len(critical_missing),
        },
    }
