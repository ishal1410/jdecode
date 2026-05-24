import io
import json
import os

from groq import Groq
import fitz  # PyMuPDF
from docx import Document


def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "pdf":
        return _parse_pdf(file_bytes)
    if ext in ("docx", "doc"):
        return _parse_docx(file_bytes)
    raise ValueError(f"Unsupported file type: .{ext}. Use PDF or DOCX.")


def _parse_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = [page.get_text() for page in doc]
    doc.close()
    return "\n".join(pages).strip()


def _parse_docx(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


RESUME_EXTRACT_PROMPT = """You are a resume parser. Extract all technical skills, tools, frameworks, and domain knowledge from the resume below.

Return ONLY a valid JSON object (no markdown):
{{
  "skills": ["Python", "AWS", "React", "Machine Learning", "Docker"],
  "years_experience": 3,
  "education": "Bachelor in Computer Science",
  "job_titles": ["Software Engineer", "ML Intern"]
}}

Include every specific technology, tool, language, framework, methodology, and certification mentioned.

Resume:
{resume_text}"""


class ResumeParser:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            key = os.getenv("GROQ_API_KEY")
            if not key:
                raise ValueError("GROQ_API_KEY is not set. Add it to your .env file.")
            self._client = Groq(api_key=key)
        return self._client

    def extract_skills(self, resume_text: str) -> dict:
        safe_text = resume_text[:6000].replace("{", "{{").replace("}", "}}")

        response = self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "user",
                    "content": RESUME_EXTRACT_PROMPT.format(resume_text=safe_text),
                }
            ],
            max_tokens=1024,
            temperature=0.1,
        )

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.rsplit("```", 1)[0]
        return json.loads(raw.strip())
