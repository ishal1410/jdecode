import io
import fitz  # PyMuPDF
from docx import Document
from backend.extractor.jd_extractor import _call, _parse_json


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


RESUME_PROMPT = """You are a resume parser. Extract all technical skills from the resume below.

Return ONLY a valid JSON object (no markdown):
{{
  "skills": ["Python", "AWS", "React", "Machine Learning"],
  "years_experience": 3,
  "education": "Bachelor in Computer Science"
}}

Resume:
{resume_text}"""


def extract_skills(resume_text: str, provider: str, api_key: str) -> dict:
    safe = resume_text[:6000].replace("{", "{{").replace("}", "}}")
    raw = _call(provider, api_key, RESUME_PROMPT.format(resume_text=safe), max_tokens=1024)
    return _parse_json(raw)
