import asyncio
import os
import hmac
import hashlib
import time
import sys
import json
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://localhost:3000"
SESSION_SECRET = "66891132bfd6ceef60adf849088b03281489d505ef5dd6092c904de64fe68a08"
USER_ID = "cmv9ghmat0000uod088sysqok" # teacher@school.edu (ADMIN)

def generate_session_cookie():
    exp = int(time.time()) + 7 * 24 * 3600
    payload = f"{USER_ID}.{exp}"
    sig = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"

async def run_e2e_tests():
    os.makedirs("test_artifacts/ai_blueprint_flow", exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        
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
        
        print("\n--- 1. Testing /blueprints page & AI Blueprint Creator Modal ---")
        await page.goto(f"{BASE_URL}/blueprints", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        
        # Verify "AI Blueprint Creator" button is visible
        ai_btn = page.locator("button:has-text('AI Blueprint Creator')")
        assert await ai_btn.is_visible(), "'AI Blueprint Creator' button missing from /blueprints header"
        print("[OK] Found 'AI Blueprint Creator' button")
        await page.screenshot(path="test_artifacts/ai_blueprint_flow/01_blueprints_page.png")
        
        # Click button to open modal
        await ai_btn.click()
        await page.wait_for_timeout(500)
        
        assert await page.locator("text=AI Blueprint Creator").first.is_visible(), "AI Blueprint Creator modal didn't open"
        print("[OK] AI Blueprint Creator modal opened")
        await page.screenshot(path="test_artifacts/ai_blueprint_flow/02_ai_blueprint_modal_input.png")
        
        # Switch to "Paste Blueprint Text" tab
        text_tab = page.locator("button:has-text('Paste Blueprint Text')")
        await text_tab.click()
        await page.wait_for_timeout(300)
        
        # Paste text
        sample_bp_text = """
Board of Secondary Education, Madhya Pradesh, Bhopal
Higher Secondary Examination Session 2025–26
Class: XII, Subject: English, Maximum Marks: 80, Time: 3:00 Hours

Section A – Reading Skills (14 Marks)
Unseen Passage – 10 marks
Note Making – 4 marks

Section B – Writing Skills (12 Marks)
Notice / Poster – 4 marks
Letter Writing – 4 marks
Long Composition – 4 marks

Section C – Grammar (10 Marks)
Fill in the blanks – 5 marks
Do as directed – 5 marks

Section D – Textbooks (44 Marks)
Extracts – 12 marks
Short Answer Questions – 20 marks
Long Answer Questions – 12 marks
"""
        textarea = page.locator("div[role='dialog'] textarea")
        await textarea.fill(sample_bp_text)
        await page.wait_for_timeout(300)
        
        # Click "Extract Blueprint Structure"
        extract_btn = page.locator("div[role='dialog'] button:has-text('Extract Blueprint Structure')")
        await extract_btn.click()
        print("Clicked 'Extract Blueprint Structure'...")
        
        # Wait for review step (Gemini API network call can take 15-35s)
        review_anchor = page.locator("text=Chapter-wise Marks Distribution")
        await review_anchor.wait_for(state="visible", timeout=60000)
        print("[OK] AI Blueprint Extraction transitioned to Review & Balance step")
        await page.wait_for_timeout(800)
        await page.screenshot(path="test_artifacts/ai_blueprint_flow/03_ai_blueprint_review_step.png")
        
        # Verify review step elements
        save_btn = page.locator("button:has-text('Save & Create Blueprint')")
        assert await save_btn.is_visible(), "Save & Create Blueprint button not visible"
        print("[OK] 'Save & Create Blueprint' button is visible")
        
        # Check auto-balance button if difference exists
        auto_balance = page.locator("button:has-text('Auto-Balance Remaining Marks')")
        if await auto_balance.is_visible():
            await auto_balance.click()
            await page.wait_for_timeout(500)
            print("[OK] Auto-Balanced remaining marks successfully")
            await page.screenshot(path="test_artifacts/ai_blueprint_flow/03b_ai_blueprint_balanced.png")
        
        # Close modal
        close_btn = page.locator("div[role='dialog'] button:has-text('Cancel')").last
        await close_btn.click()
        await page.wait_for_timeout(500)
        print("[OK] Modal closed successfully")

        print("\n--- 2. Testing Paper Builder with Multi-subpart Objectives & Options ---")
        
        # Find an existing paper or create one via API
        papers_res = await page.request.get(f"{BASE_URL}/api/papers")
        papers_data = await papers_res.json()
        print(f"Loaded {len(papers_data)} existing papers.")
        
        # Create a test paper with multi-subpart MCQ question via API
        blueprints_res = await page.request.get(f"{BASE_URL}/api/blueprints")
        blueprints_data = await blueprints_res.json()
        assert len(blueprints_data) > 0, "No blueprints available"
        target_bp = blueprints_data[0]
        
        paper_payload = {
            "title": f"MP Board Test Paper {int(time.time())}",
            "blueprintId": target_bp["id"],
            "academicSession": target_bp.get("academicSession", "2025–26"),
            "examType": target_bp.get("examType", "HALF_YEARLY"),
            "schoolName": "MP Board Model Higher Secondary School",
            "examDate": "2026-11-15",
            "paperSet": "SET A",
            "subjectCode": target_bp.get("subjectCode", "051"),
            "layout": "BOOKLET_A4",
            "sections": [
                {
                    "title": target_bp["sections"][0]["title"] if target_bp.get("sections") else "Section A",
                    "questions": [
                        {
                            "text": "प्रश्न 1. सही विकल्प चुनकर लिखिए:",
                            "type": "MCQ",
                            "marks": 6,
                            "difficulty": "EASY",
                            "subparts": [
                                {
                                    "label": "(i)",
                                    "text": "'आत्मपरिचय' कविता में कवि किसका भार लिए फिरता है?",
                                    "marks": 1,
                                    "options": ["कार्यालय का", "जग-जीवन का", "परिवार का", "कष्टों का"],
                                    "answer": "जग-जीवन का"
                                },
                                {
                                    "label": "(ii)",
                                    "text": "'बाजार दर्शन' पाठ के अनुसार बाजार का जादू किस राह से काम करता है?",
                                    "marks": 1,
                                    "options": ["आँख", "कान", "नाक", "स्पर्श"],
                                    "answer": "आँख"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        
        import_res = await page.request.post(
            f"{BASE_URL}/api/papers/import",
            data=json.dumps({"blueprintId": target_bp["id"], "paperData": paper_payload}),
            headers={"Content-Type": "application/json"}
        )
        import_json = await import_res.json()
        assert import_res.ok, f"Paper import failed: {import_json}"
        paper_id = import_json.get("paperId") or import_json.get("id") or import_json["paper"]["id"]
        print(f"[OK] Created test paper with ID: {paper_id}")
        
        # Navigate to paper builder page
        await page.goto(f"{BASE_URL}/papers/{paper_id}", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        
        # Verify Question 1 text rendered
        q1 = page.locator("text=प्रश्न 1. सही विकल्प चुनकर लिखिए")
        assert await q1.first.is_visible(), "Question 1 text not visible in builder"
        print("[OK] Question 1 text rendered in Paper Builder")
        
        # Verify subpart (i) and its options are rendered
        sub1 = page.locator("text='आत्मपरिचय' कविता में कवि किसका भार लिए फिरता है?")
        assert await sub1.is_visible(), "Subpart (i) text not visible"
        print("[OK] Subpart (i) text rendered")
        
        opt_jag_jeevan = page.locator("text=जग-जीवन का")
        assert await opt_jag_jeevan.first.is_visible(), "Subpart MCQ options not rendered!"
        print("[OK] Subpart MCQ options are rendered on the screen!")
        
        # Take builder screenshot
        await page.screenshot(path="test_artifacts/ai_blueprint_flow/05_paper_builder_subparts.png")
        
        # Verify print view
        await page.goto(f"{BASE_URL}/papers/{paper_id}/print", wait_until="networkidle")
        await page.wait_for_timeout(1500)
        print("[OK] Navigated to Print View")
        
        print_opt = page.locator(".sheet-page").locator("text=जग-जीवन का").first
        if not await print_opt.is_visible():
            print_opt = page.locator("text=जग-जीवन का").last
        assert await print_opt.is_visible(), "Subpart MCQ options not rendered in Print View!"
        print("[OK] Subpart MCQ options rendered in Printable Booklet!")
        await page.screenshot(path="test_artifacts/ai_blueprint_flow/06_printable_booklet.png")
        
        await browser.close()
        print("\n==========================================")
        print("ALL E2E & VISUAL AUDIT TESTS PASSED CLEANLY!")
        print("==========================================")

if __name__ == "__main__":
    asyncio.run(run_e2e_tests())
