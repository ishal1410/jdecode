from urllib.parse import urlparse
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout


class JobScraper:
    USER_AGENT = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )

    async def scrape(self, url: str) -> dict:
        domain = urlparse(url).netloc.lower()

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=self.USER_AGENT,
                extra_http_headers={"Accept-Language": "en-US,en;q=0.9"},
            )
            page = await context.new_page()
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await page.wait_for_timeout(2000)

                if "linkedin.com" in domain:
                    result = await self._scrape_linkedin(page)
                elif "greenhouse.io" in domain or "boards.greenhouse" in domain:
                    result = await self._scrape_greenhouse(page)
                elif "lever.co" in domain:
                    result = await self._scrape_lever(page)
                elif "indeed.com" in domain:
                    result = await self._scrape_indeed(page)
                elif "workday.com" in domain or "myworkdayjobs.com" in domain:
                    result = await self._scrape_workday(page)
                else:
                    result = await self._scrape_generic(page)
            except PlaywrightTimeout:
                result = await self._scrape_generic(page)
            finally:
                await browser.close()

        return result

    async def _scrape_linkedin(self, page) -> dict:
        try:
            btn = page.locator("button.show-more-less-html__button")
            if await btn.count() > 0:
                await btn.first.click()
                await page.wait_for_timeout(500)
        except Exception:
            pass

        title = await self._text(page, [
            "h1.top-card-layout__title",
            "h1.job-details-jobs-unified-top-card__job-title",
            "h1",
        ])
        company = await self._text(page, [
            "a.topcard__org-name-link",
            ".job-details-jobs-unified-top-card__company-name",
        ])
        location = await self._text(page, [
            ".topcard__flavor--bullet",
            ".job-details-jobs-unified-top-card__bullet",
        ])
        description = await self._text(page, [
            ".description__text",
            ".job-details-jobs-unified-top-card__job-description",
            ".jobs-description__content",
        ])
        return {"title": title, "company": company, "location": location, "description": description, "source": "linkedin"}

    async def _scrape_greenhouse(self, page) -> dict:
        title = await self._text(page, ["h1.app-title", "h1"])
        company = await self._text(page, [".company-name", ".job-post__company"])
        location = await self._text(page, [".location", ".job__location"])
        description = await self._text(page, ["#content", ".job-post__content", "article"])
        return {"title": title, "company": company, "location": location, "description": description, "source": "greenhouse"}

    async def _scrape_lever(self, page) -> dict:
        title = await self._text(page, [".posting-headline h2", "h2"])
        location = await self._text(page, [".posting-categories .location", ".location"])
        description = await self._text(page, [".content", ".posting-page"])
        return {"title": title, "company": "", "location": location, "description": description, "source": "lever"}

    async def _scrape_indeed(self, page) -> dict:
        title = await self._text(page, ["h1.jobsearch-JobInfoHeader-title", "h1"])
        company = await self._text(page, ["[data-company-name]", ".jobsearch-InlineCompanyRating-companyHeader"])
        location = await self._text(page, [".jobsearch-JobInfoHeader-subtitle"])
        description = await self._text(page, ["#jobDescriptionText", ".jobsearch-jobDescriptionText"])
        return {"title": title, "company": company, "location": location, "description": description, "source": "indeed"}

    async def _scrape_workday(self, page) -> dict:
        await page.wait_for_timeout(3000)
        title = await self._text(page, ["h2[data-automation-id='jobPostingHeader']", "h2"])
        description = await self._text(page, ["[data-automation-id='jobPostingDescription']", ".wd-text"])
        return {"title": title, "company": "", "location": "", "description": description, "source": "workday"}

    async def _scrape_generic(self, page) -> dict:
        title = await self._text(page, ["h1", "h2"])
        description = ""
        for selector in ["main", "article", "#content", ".content", "body"]:
            try:
                el = page.locator(selector).first
                if await el.count() > 0:
                    text = await el.inner_text()
                    if len(text) > 200:
                        description = text
                        break
            except Exception:
                continue
        return {"title": title, "company": "", "location": "", "description": description, "source": "generic"}

    async def _text(self, page, selectors: list) -> str:
        for sel in selectors:
            try:
                el = page.locator(sel).first
                if await el.count() > 0:
                    t = await el.inner_text()
                    if t and t.strip():
                        return t.strip()
            except Exception:
                continue
        return ""
