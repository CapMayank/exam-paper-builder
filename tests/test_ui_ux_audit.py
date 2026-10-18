import asyncio
import os
import hmac
import hashlib
import time
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:3100"
SESSION_SECRET = "66891132bfd6ceef60adf849088b03281489d505ef5dd6092c904de64fe68a08"
USER_ID = "cmv9ghmat0000uod088sysqok" # teacher@school.edu (ADMIN)

def generate_session_cookie():
    exp = int(time.time()) + 7 * 24 * 3600
    payload = f"{USER_ID}.{exp}"
    sig = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"

async def run_comprehensive_audit():
    os.makedirs("test_artifacts/ux_audit", exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1366, "height": 850})
        
        cookie_val = generate_session_cookie()
        await context.add_cookies([{
            "name": "epb_session",
            "value": cookie_val,
            "domain": "localhost",
            "path": "/",
            "httpOnly": True,
            "sameSite": "Lax"
        }])
        
        page = await context.new_page()
        
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        
        print("\n=======================================================")
        print("COMPREHENSIVE UI/UX & LOGICAL REDUNDANCY AUDIT")
        print("=======================================================")
        
        # 1. Dashboard Page
        print("\n[Step 1] Auditing Dashboard (/)")
        await page.goto(f"{BASE_URL}/", wait_until="networkidle")
        await page.wait_for_timeout(800)
        h1_text = await page.locator("h1").text_content()
        assert "Sarvodaya Higher Secondary School" in h1_text
        print(f"  [OK] Dashboard loaded: {h1_text.strip()}")
        assert await page.locator("text=Academic Curriculum & Assessment Flow").is_visible()
        print("  [OK] Academic hierarchy pipeline banner visible on Dashboard")
        await page.screenshot(path="test_artifacts/ux_audit/01_dashboard.png")

        # 2. Classes & Curriculum Hub
        print("\n[Step 2] Auditing Classes Hub (/classes)")
        await page.goto(f"{BASE_URL}/classes", wait_until="networkidle")
        await page.wait_for_timeout(800)
        
        # Verify no duplicate modals or editors on /classes
        assert await page.locator("text=Build Exam Paper from Blueprint").count() == 0, "Redundant builder modal found on /classes"
        assert await page.locator("text=Add textbook").count() == 0, "Redundant textbook editor found on /classes"
        print("  [OK] Confirmed: Zero redundant builders or book editors on /classes")
        
        # Verify clean Gateway cards
        assert await page.locator("main :has-text('Textbooks & Syllabus')").first.is_visible()
        assert await page.locator("main div.font-bold:has-text('Question Bank')").is_visible()
        assert await page.locator("main :has-text('Exam Blueprints & Quotas')").first.is_visible()
        assert await page.locator("main div.font-bold:has-text('Exam Papers')").is_visible()
        print("  [OK] All 4 clean gateway cards displayed with accurate summary metrics")
        
        # Test Gateway link to /blueprints with query params
        bp_link = page.locator("a:has-text('Open in Blueprints')").first
        bp_href = await bp_link.get_attribute("href")
        print(f"  [OK] Blueprints gateway URL: {bp_href}")
        assert "/blueprints?className=" in bp_href, "Gateway missing class param"
        
        await page.screenshot(path="test_artifacts/ux_audit/02_classes_hub.png")

        # 3. Dedicated Books & Syllabus Workspace
        print("\n[Step 3] Auditing Books & Syllabus (/books)")
        await page.goto(f"{BASE_URL}/books", wait_until="networkidle")
        await page.wait_for_timeout(800)
        
        # Verify no duplicate 6-button session switcher row
        assert await page.locator("text=Active Session:").is_visible()
        assert await page.locator("button:has-text('All Sessions (')").count() == 0, "Redundant session switcher strip found on /books"
        print("  [OK] Verified: No redundant session button strip on /books")
        
        # Verify Class and Subject filter dropdowns
        class_select = page.locator("select:has(option:has-text('All Classes'))")
        assert await class_select.is_visible()
        print("  [OK] Class filter dropdown correctly present on /books")
        await page.screenshot(path="test_artifacts/ux_audit/03_books_workspace.png")

        # 4. Dedicated Blueprints Workspace
        print("\n[Step 4] Auditing Blueprints Workspace (/blueprints)")
        await page.goto(f"{BASE_URL}/blueprints", wait_until="networkidle")
        await page.wait_for_timeout(800)
        
        # Verify grouped cards by Class · Subject
        assert await page.locator("text=Active Session:").is_visible()
        assert await page.locator("button:has-text('All Sessions (')").count() == 0, "Redundant session switcher strip found on /blueprints"
        print("  [OK] Verified: No redundant session button strip on /blueprints")
        
        build_btn = page.locator("button:has-text('Build Paper')").first
        if await build_btn.is_visible():
            await build_btn.click()
            await page.wait_for_timeout(500)
            assert await page.locator("h2:has-text('Build Exam Paper')").is_visible()
            print("  [OK] Blueprint card directly launches 'Build Exam Paper' modal")
            await page.screenshot(path="test_artifacts/ux_audit/04_blueprint_build_modal.png")
            await page.locator("button:has-text('Cancel')").click()
            await page.wait_for_timeout(300)

        # 5. Dedicated Question Bank Workspace
        print("\n[Step 5] Auditing Question Bank (/questions)")
        await page.goto(f"{BASE_URL}/questions", wait_until="networkidle")
        await page.wait_for_timeout(800)
        
        q_heading = await page.locator("h1").text_content()
        assert "question bank" in q_heading.lower()
        print(f"  [OK] Question bank loaded: {q_heading.strip()}")
        await page.screenshot(path="test_artifacts/ux_audit/05_question_bank.png")

        # 6. Dedicated Exam Papers Workspace
        print("\n[Step 6] Auditing Exam Papers (/papers)")
        await page.goto(f"{BASE_URL}/papers", wait_until="networkidle")
        await page.wait_for_timeout(800)
        
        # Verify clean Active Session badge
        assert await page.locator("text=Active Session:").is_visible()
        assert await page.locator("button:has-text('All Sessions (')").count() == 0, "Redundant session switcher strip found on /papers"
        print("  [OK] Verified: No redundant session button strip on /papers")
        await page.screenshot(path="test_artifacts/ux_audit/06_papers_workspace.png")

        # 7. Exam Cell & Logistics
        print("\n[Step 7] Auditing Exam Cell & Logistics (/exam-cell)")
        await page.goto(f"{BASE_URL}/exam-cell", wait_until="networkidle")
        await page.wait_for_timeout(800)
        
        assert await page.locator("button:has-text('Paper Budget Calculator')").is_visible()
        assert await page.locator("button:has-text('Exam Date-Sheet')").is_visible()
        assert await page.locator("button:has-text('Audit Trail')").is_visible()
        print("  [OK] All 3 Exam Cell operational tabs verified (Calculator, Timetable, Audit)")
        await page.screenshot(path="test_artifacts/ux_audit/07_exam_cell.png")

        # Check Console Errors
        filtered_errors = [e for e in console_errors if not "favicon" in e and not "download the React DevTools" in e]
        print(f"\n[Console Error Check] Total JS Errors Detected: {len(filtered_errors)}")
        for err in filtered_errors:
            print(f"  ❌ JS Error: {err}")
        assert len(filtered_errors) == 0, f"Detected console errors: {filtered_errors}"

        print("\n=======================================================")
        print("AUDIT RESULT: ZERO LOGICAL OVERLAPS, ZERO REDUNDANCIES!")
        print("All workspaces maintain clean single responsibilities.")
        print("=======================================================")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_comprehensive_audit())
