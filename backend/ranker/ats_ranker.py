from collections import defaultdict
from typing import List, Dict
from pydantic import BaseModel

# Each entry: (canonical_form, set_of_all_aliases_including_canonical)
# The canonical_form is what gets displayed to the user — keep it as the most commonly written form.
SYNONYM_GROUPS: List[tuple] = [
    ("Python",              {"Python", "Python3", "Python 3"}),
    ("JavaScript",          {"JavaScript", "JS"}),
    ("TypeScript",          {"TypeScript", "TS"}),
    ("SQL",                 {"SQL", "Structured Query Language"}),
    ("NoSQL",               {"NoSQL", "Non-relational database"}),
    ("Machine Learning",    {"Machine Learning", "ML", "machine-learning"}),
    ("Deep Learning",       {"Deep Learning", "DL"}),
    ("NLP",                 {"NLP", "Natural Language Processing"}),
    ("Computer Vision",     {"Computer Vision", "CV"}),
    ("LLM",                 {"LLM", "LLMs", "Large Language Model", "Large Language Models"}),
    ("RAG",                 {"RAG", "Retrieval-Augmented Generation"}),
    ("AI",                  {"AI", "Artificial Intelligence"}),
    ("AWS",                 {"AWS", "Amazon Web Services"}),
    ("GCP",                 {"GCP", "Google Cloud Platform", "Google Cloud"}),
    ("Azure",               {"Azure", "Microsoft Azure"}),
    ("React",               {"React", "React.js", "ReactJS"}),
    ("Node.js",             {"Node.js", "Node", "NodeJS"}),
    ("Docker",              {"Docker", "Docker Container", "Containerization"}),
    ("Kubernetes",          {"Kubernetes", "K8s"}),
    ("CI/CD",               {"CI/CD", "Continuous Integration", "Continuous Deployment", "CI", "CD"}),
    ("REST API",            {"REST API", "RESTful API", "RESTful", "REST"}),
    ("GraphQL",             {"GraphQL", "Graph QL"}),
    ("Git",                 {"Git", "GitHub", "GitLab", "Version Control"}),
    ("PostgreSQL",          {"PostgreSQL", "Postgres"}),
    ("MongoDB",             {"MongoDB", "Mongo"}),
    ("Agile",               {"Agile", "Agile Methodology", "Scrum", "Kanban"}),
    ("OOP",                 {"OOP", "Object-Oriented Programming", "Object Oriented Programming"}),
    ("TDD",                 {"TDD", "Test-Driven Development"}),
    ("ETL",                 {"ETL", "Extract Transform Load"}),
    ("SDLC",                {"SDLC", "Software Development Life Cycle"}),
    ("Microservices",       {"Microservices", "Microservice Architecture"}),
    ("FastAPI",             {"FastAPI", "Fast API"}),
    ("Spring Boot",         {"Spring Boot", "Spring"}),
    ("TensorFlow",          {"TensorFlow", "Tensorflow"}),
    ("PyTorch",             {"PyTorch", "Pytorch"}),
    ("scikit-learn",        {"scikit-learn", "sklearn", "Scikit-learn"}),
]

SECTION_WEIGHTS = {
    "required_skills": 1.0,
    "preferred_skills": 0.55,
}

CATEGORY_WEIGHTS = {
    "programming_language": 1.0,
    "framework": 0.9,
    "cloud": 0.85,
    "database": 0.8,
    "tool": 0.75,
    "certification": 0.7,
    "domain_knowledge": 0.65,
    "methodology": 0.6,
    "soft_skill": 0.35,
}


class RankedKeyword(BaseModel):
    keyword: str
    canonical_form: str
    score: float
    section: str
    category: str
    frequency: int
    synonyms: List[str]
    importance_label: str


class ATSRankResult(BaseModel):
    ranked_keywords: List[RankedKeyword]
    critical_count: int
    important_count: int
    total_keywords: int
    top_categories: Dict[str, int]


def _resolve(skill: str):
    skill_lower = skill.lower()
    for canonical, aliases in SYNONYM_GROUPS:
        if skill_lower in {a.lower() for a in aliases}:
            # Exclude both the input skill and the canonical from the synonyms list
            synonyms = [a for a in aliases if a.lower() != skill_lower and a != canonical]
            return canonical, synonyms
    return skill, []


def _label(score: float) -> str:
    if score >= 0.80:
        return "Critical"
    if score >= 0.55:
        return "Important"
    if score >= 0.35:
        return "Preferred"
    return "Nice to have"


class ATSRanker:
    def rank(self, extracted_job) -> ATSRankResult:
        bucket: Dict[str, dict] = {}

        sections = {
            "required_skills": extracted_job.sections.required_skills,
            "preferred_skills": extracted_job.sections.preferred_skills,
        }

        for section_name, skills in sections.items():
            s_weight = SECTION_WEIGHTS[section_name]
            for skill_obj in skills:
                canonical, synonyms = _resolve(skill_obj.skill)
                c_weight = CATEGORY_WEIGHTS.get(skill_obj.category, 0.5)
                freq_boost = min(skill_obj.frequency / 5.0, 1.0) * 0.15 + 0.85
                score = round(s_weight * c_weight * freq_boost, 4)

                key = canonical.lower()
                if key in bucket:
                    if score > bucket[key]["score"]:
                        bucket[key]["score"] = score
                    bucket[key]["frequency"] += skill_obj.frequency
                    # prefer required over preferred label
                    if section_name == "required_skills":
                        bucket[key]["section"] = "required_skills"
                else:
                    bucket[key] = {
                        "keyword": skill_obj.skill,
                        "canonical_form": canonical,
                        "score": score,
                        "section": section_name,
                        "category": skill_obj.category,
                        "frequency": skill_obj.frequency,
                        "synonyms": synonyms,
                    }

        sorted_kws = sorted(bucket.values(), key=lambda x: x["score"], reverse=True)

        ranked = [
            RankedKeyword(
                keyword=kw["keyword"],
                canonical_form=kw["canonical_form"],
                score=kw["score"],
                section=kw["section"],
                category=kw["category"],
                frequency=kw["frequency"],
                synonyms=kw["synonyms"],
                importance_label=_label(kw["score"]),
            )
            for kw in sorted_kws
        ]

        category_counts: Dict[str, int] = defaultdict(int)
        for kw in ranked:
            category_counts[kw.category] += 1

        return ATSRankResult(
            ranked_keywords=ranked,
            critical_count=sum(1 for k in ranked if k.importance_label == "Critical"),
            important_count=sum(1 for k in ranked if k.importance_label == "Important"),
            total_keywords=len(ranked),
            top_categories=dict(sorted(category_counts.items(), key=lambda x: x[1], reverse=True)),
        )
