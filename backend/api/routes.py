from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional

from backend.scraper.job_scraper import JobScraper
from backend.extractor.jd_extractor import JDExtractor
from backend.ranker.ats_ranker import ATSRanker
from backend.resume.parser import extract_text, ResumeParser

router = APIRouter()
scraper = JobScraper()
extractor = JDExtractor()
ranker = ATSRanker()
resume_parser = ResumeParser()


class AnalyzeRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None


async def _fetch_and_analyze(url: Optional[str], text: Optional[str]) -> dict:
    if not url and not text:
        raise HTTPException(status_code=400, detail="Provide a URL or job description text.")

    scraped_meta = {}
    job_text = text or ""

    if url:
        try:
            scraped = await scraper.scrape(url)
            scraped_meta = scraped
            if scraped.get("description"):
                job_text = scraped["description"]
        except Exception as e:
            if not text:
                raise HTTPException(status_code=422, detail=f"Could not scrape URL: {e}")

    if len(job_text.strip()) < 80:
        raise HTTPException(status_code=422, detail="Job description too short to analyze.")

    try:
        extracted = extractor.extract(job_text, scraped_meta)
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


@router.post("/analyze")
async def analyze_job(request: AnalyzeRequest):
    return await _fetch_and_analyze(request.url, request.text)


@router.post("/gap-analysis")
async def gap_analysis(
    file: UploadFile = File(...),
    url: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
):
    # Parse uploaded resume
    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Resume file too large. Max 5MB.")

    try:
        resume_text = extract_text(file_bytes, file.filename or "resume.pdf")
    except ValueError as e:
        raise HTTPException(status_code=415, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not read resume: {e}")

    if len(resume_text.strip()) < 50:
        raise HTTPException(status_code=422, detail="Could not extract text from resume.")

    # Extract resume skills via Claude
    try:
        resume_data = resume_parser.extract_skills(resume_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume parsing failed: {e}")

    resume_skills_lower = {s.lower() for s in resume_data.get("skills", [])}

    # Analyze the job posting
    analysis = await _fetch_and_analyze(url, text)
    ranked_keywords = analysis["ats_result"]["ranked_keywords"]

    matched = []
    missing = []

    for kw in ranked_keywords:
        terms = {kw["canonical_form"].lower()} | {s.lower() for s in kw["synonyms"]}
        # Match against Claude-extracted resume skills AND raw resume text
        resume_text_lower = resume_text.lower()
        found = bool(
            terms & resume_skills_lower
            or any(t in resume_text_lower for t in terms)
        )
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
