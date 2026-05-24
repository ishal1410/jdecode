import json
import os
import anthropic
from pydantic import BaseModel
from typing import List, Optional

EXTRACTION_PROMPT = """You are an expert job description analyzer. Extract structured information from the job posting below.

Return ONLY a valid JSON object with exactly this structure (no markdown, no explanation):
{{
  "job_title": "exact job title",
  "company": "company name or empty string",
  "location": "location string or Remote or Hybrid",
  "employment_type": "Full-time or Part-time or Contract or Internship",
  "experience_years": 0,
  "education": "degree requirement or null",
  "sections": {{
    "required_skills": [
      {{"skill": "Python", "category": "programming_language", "frequency": 3}}
    ],
    "preferred_skills": [
      {{"skill": "Docker", "category": "tool", "frequency": 1}}
    ],
    "responsibilities": ["Build scalable APIs"],
    "qualifications": ["Bachelor degree in CS"]
  }},
  "red_flags": ["10 years experience for junior role"],
  "remote_friendly": true,
  "salary_mentioned": false,
  "salary_range": null
}}

Categories must be one of: programming_language, framework, tool, cloud, database, methodology, soft_skill, certification, domain_knowledge

Frequency = how many times the skill appears or is implied in the posting.
Red flags = predatory patterns (unpaid work, impossible requirements, vague compensation, extreme overtime culture signals).

Job Posting:
{job_text}"""


class Skill(BaseModel):
    skill: str
    category: str
    frequency: int


class JobSections(BaseModel):
    required_skills: List[Skill]
    preferred_skills: List[Skill]
    responsibilities: List[str]
    qualifications: List[str]


class ExtractedJob(BaseModel):
    job_title: str
    company: str
    location: str
    employment_type: str
    experience_years: int
    education: Optional[str]
    sections: JobSections
    red_flags: List[str]
    remote_friendly: bool
    salary_mentioned: bool
    salary_range: Optional[str]


class JDExtractor:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    def extract(self, job_text: str, scraped_meta: dict = None) -> ExtractedJob:
        full_text = job_text
        if scraped_meta:
            parts = []
            if scraped_meta.get("title"):
                parts.append(f"Job Title: {scraped_meta['title']}")
            if scraped_meta.get("company"):
                parts.append(f"Company: {scraped_meta['company']}")
            if scraped_meta.get("location"):
                parts.append(f"Location: {scraped_meta['location']}")
            if parts:
                full_text = "\n".join(parts) + "\n\n" + job_text

        # Escape braces in user content so .format() doesn't crash on JDs like "experience with {Python}"
        safe_text = full_text[:8000].replace("{", "{{").replace("}", "}}")
        message = self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            messages=[
                {
                    "role": "user",
                    "content": EXTRACTION_PROMPT.format(job_text=safe_text),
                }
            ],
        )

        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.rsplit("```", 1)[0]

        data = json.loads(raw.strip())
        return ExtractedJob(**data)
