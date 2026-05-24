import json
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


# Provider config — all use OpenAI-compatible API except Anthropic
PROVIDERS = {
    "groq":       {"base_url": "https://api.groq.com/openai/v1",                                        "model": "llama-3.3-70b-versatile"},
    "gemini":     {"base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",               "model": "gemini-2.0-flash"},
    "openrouter": {"base_url": "https://openrouter.ai/api/v1",                                          "model": "deepseek/deepseek-v4-flash:free"},
    "openai":     {"base_url": None,                                                                     "model": "gpt-4o-mini"},
    "anthropic":  {"base_url": None,                                                                     "model": "claude-3-5-haiku-20241022"},
}


def _call(provider: str, api_key: str, prompt: str, max_tokens: int = 2048) -> str:
    if provider == "anthropic":
        from anthropic import Anthropic
        client = Anthropic(api_key=api_key)
        response = client.messages.create(
            model=PROVIDERS["anthropic"]["model"],
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    else:
        from openai import OpenAI
        cfg = PROVIDERS[provider]
        kwargs = {"api_key": api_key}
        if cfg["base_url"]:
            kwargs["base_url"] = cfg["base_url"]
        client = OpenAI(**kwargs)
        response = client.chat.completions.create(
            model=cfg["model"],
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0.1,
        )
        return response.choices[0].message.content.strip()


def _parse_json(raw: str) -> dict:
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0]
    return json.loads(raw.strip())


class JDExtractor:
    def extract(self, job_text: str, provider: str, api_key: str, scraped_meta: dict = None) -> ExtractedJob:
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

        safe_text = full_text[:8000].replace("{", "{{").replace("}", "}}")
        prompt = EXTRACTION_PROMPT.format(job_text=safe_text)

        raw = _call(provider, api_key, prompt)
        data = _parse_json(raw)
        return ExtractedJob(**data)
