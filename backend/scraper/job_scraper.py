import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Sites that need JavaScript rendering — tell the user to paste text instead
JS_ONLY_SITES = {"linkedin.com", "indeed.com"}


class JobScraper:
    async def scrape(self, url: str) -> dict:
        domain = urlparse(url).netloc.lower().replace("www.", "")

        if any(js in domain for js in JS_ONLY_SITES):
            raise ValueError(
                f"{domain} requires a login or JavaScript to scrape. "
                "Please copy and paste the job description text directly."
            )

        try:
            async with httpx.AsyncClient(
                headers=HEADERS,
                follow_redirects=True,
                timeout=15,
            ) as client:
                response = await client.get(url)
                response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise ValueError(f"Could not fetch page (HTTP {e.response.status_code}). Try pasting the text directly.")
        except httpx.RequestError:
            raise ValueError("Could not reach that URL. Try pasting the text directly.")

        return self._parse(response.text, domain)

    def _parse(self, html: str, domain: str) -> dict:
        soup = BeautifulSoup(html, "lxml")

        # Remove noise
        for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
            tag.decompose()

        title = ""
        company = ""
        location = ""
        description = ""

        if "greenhouse.io" in domain or "boards.greenhouse" in domain:
            title = self._text(soup, ["h1.app-title", "h1"])
            company = self._text(soup, [".company-name"])
            location = self._text(soup, [".location"])
            description = self._text(soup, ["#content", ".job-post__content"])

        elif "lever.co" in domain:
            title = self._text(soup, [".posting-headline h2", "h2"])
            location = self._text(soup, [".posting-categories .location"])
            description = self._text(soup, [".content"])

        elif "workday.com" in domain or "myworkdayjobs.com" in domain:
            title = self._text(soup, ["h2", "h1"])
            description = self._text(soup, ["[data-automation-id='jobPostingDescription']", "main"])

        else:
            # Generic: grab title + biggest text block
            title = self._text(soup, ["h1", "h2"])
            for selector in ["main", "article", "#content", ".content", ".job", "body"]:
                block = soup.select_one(selector)
                if block and len(block.get_text()) > 300:
                    description = block.get_text(separator="\n", strip=True)
                    break

        return {
            "title": title,
            "company": company,
            "location": location,
            "description": description or soup.get_text(separator="\n", strip=True)[:6000],
            "source": domain,
        }

    def _text(self, soup: BeautifulSoup, selectors: list) -> str:
        for sel in selectors:
            el = soup.select_one(sel)
            if el:
                t = el.get_text(separator=" ", strip=True)
                if t:
                    return t
        return ""
