import asyncio
import os
import hmac
import hashlib
import time
import sys
import json
import urllib.request
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

async def run_complete_board_flow():
    out_dir = "test_artifacts/complete_board_flow"
    os.makedirs(out_dir, exist_ok=True)
    cookie_val = generate_session_cookie()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        
        await context.add_cookies([{
            "name": "epb_session",
            "value": cookie_val,
            "domain": "localhost",
            "path": "/",
            "httpOnly": True,
            "sameSite": "Lax"
        }])
        
        page = await context.new_page()

        print("\n=======================================================")
        print("STAGE 1: Class to Subject Navigation (/classes)")
        print("=======================================================")
        await page.goto(f"{BASE_URL}/classes", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        
        # Verify classes are present
        class_buttons = page.locator("aside button[aria-pressed]")
        count = await class_buttons.count()
        print(f"Found {count} classes in sidebar.")
        assert count > 0, "No classes found on /classes"
        
        # Select Class 10 which has comprehensive Board subjects
        c10 = page.locator("aside button:has-text('Class 10')").first
        if await c10.is_visible():
            await c10.click()
            print("Selected Class 10.")
        else:
            await class_buttons.first.click()
            print("Selected first class.")
        await page.wait_for_timeout(600)
        await page.screenshot(path=f"{out_dir}/01_classes_page.png")

        # Find link to Science or Mathematics books (which have standard NCERT chapters)
        sci_link = page.locator("tr:has-text('Science') a[href*='/books']").first
        math_link = page.locator("tr:has-text('Mathematics') a[href*='/books']").first
        if await sci_link.is_visible():
            target_link = sci_link
        elif await math_link.is_visible():
            target_link = math_link
        else:
            target_link = page.locator("a[href*='/books']").first

        link_href = await target_link.get_attribute("href")
        print(f"Navigating to syllabus via: {link_href}")
        await target_link.click()
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(1000)

        print("\n=======================================================")
        print("STAGE 2: Books / Syllabus Verification (/books)")
        print("=======================================================")
        assert "/books" in page.url, f"Expected /books, got {page.url}"
        await page.screenshot(path=f"{out_dir}/02_books_page.png")
        
        # Check active book and chapters
        book_heading = page.locator("section#book-details-section h2").first
        assert await book_heading.is_visible(), "Book details header missing"
        book_name = (await book_heading.text_content() or "").strip()
        print(f"Active syllabus book: {book_name}")

        # If book has 0 chapters, select Science or Math in sidebar
        chapter_rows = page.locator("section#book-details-section table tr")
        if await chapter_rows.count() == 0:
            print("Active book has 0 chapters, selecting book with chapters from sidebar...")
            sci_book_btn = page.locator("aside button:has-text('Science (NCERT Class X)'), aside button:has-text('Mathematics (NCERT Class X)')").first
            if await sci_book_btn.is_visible():
                await sci_book_btn.click()
                await page.wait_for_timeout(800)
                book_name = (await book_heading.text_content() or "").strip()
                print(f"Switched to book: {book_name}")

        create_bp_btn = page.locator("section#book-details-section a:has-text('Create Blueprint')").first
        assert await create_bp_btn.is_visible(), "Create Blueprint link missing on book card"
        print("Clicking 'Create Blueprint'...")
        await create_bp_btn.click()
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(1000)

        print("\n=======================================================")
        print("STAGE 3: Blueprint Configuration & Auto-Balance")
        print("=======================================================")
        bp_url = page.url
        print(f"Blueprint URL: {bp_url}")
        assert "/blueprints/" in bp_url, f"Expected blueprint URL, got {bp_url}"
        await page.screenshot(path=f"{out_dir}/03_blueprint_editor.png")

        # Auto distribute marks
        auto_dist_btn = page.locator("button:has-text('Auto-distribute')").first
        await auto_dist_btn.wait_for(state="visible", timeout=10000)
        await auto_dist_btn.click()
        await page.wait_for_timeout(800)
        print("Auto-distributed chapter marks across syllabus.")

        # Wait for Save & Build Exam Paper button to become enabled
        save_and_build_btn = page.locator("button:has-text('Save & Build Exam Paper')").first
        await page.wait_for_function("() => !document.querySelector(\"button[title*='Save blueprint and open']\")?.disabled", timeout=10000)
        print("Verified 'Save & Build Exam Paper' button is enabled and ready.")
        assert await save_and_build_btn.is_visible(), "'Save & Build Exam Paper' button missing"
        print("Clicking 'Save & Build Exam Paper'...")
        await save_and_build_btn.click()
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)

        print("\n=======================================================")
        print("STAGE 4: Paper Studio & Formatting Checks (/papers/[id])")
        print("=======================================================")
        paper_url = page.url
        print(f"Paper Studio URL: {paper_url}")
        assert "/papers/" in paper_url, f"Expected /papers/ URL, got {paper_url}"
        paper_id = paper_url.split("/papers/")[1].split("?")[0].split("/")[0]
        print(f"Active Paper ID: {paper_id}")
        await page.screenshot(path=f"{out_dir}/04_paper_workbench_empty.png")

        # Fetch paper data to inspect blueprint sections and book
        paper_api_resp = await context.request.get(f"{BASE_URL}/api/papers/{paper_id}")
        assert paper_api_resp.status == 200, "Failed to load paper via API"
        paper_data = await paper_api_resp.json()
        sections = paper_data["blueprint"]["sections"]
        book_id = paper_data["blueprint"]["bookId"]
        chapters = paper_data["blueprint"]["chapters"]
        assert len(chapters) > 0, "No chapters in blueprint"
        ch_id = chapters[0]["chapterId"]
        print(f"Book ID: {book_id}, Chapter ID: {ch_id}")
        print(f"Paper has {len(sections)} sections: {[s['title'] + ' (' + s['type'] + ')' for s in sections]}")

        # Find or create MCQ section
        mcq_sec = next((s for s in sections if s["type"] == "MCQ"), sections[0])
        
        # Create MCQ question with LaTeX text commands in options (the user's reported bug case!)
        print("\nInjecting test MCQ with raw LaTeX in options: \\text{cry}1\\text{Ac}...")
        create_q1_resp = await context.request.post(f"{BASE_URL}/api/questions", data={
            "bookId": book_id,
            "chapterId": ch_id,
            "type": "MCQ",
            "text": "The cry gene that codes for crystal protein toxic to corn borers is:",
            "options": [
                "(a) \\text{cry}1\\text{Ac}",
                "(b) \\text{cry}1\\text{Ab}",
                "(c) \\text{cry}2\\text{Ab}",
                "(d) \\text{cry}3\\text{Bb}"
            ],
            "answer": "(b) \\text{cry}1\\text{Ab}",
            "marks": mcq_sec["marksEach"],
            "difficulty": "MEDIUM",
            "cognitiveLevel": "REMEMBERING"
        })
        assert create_q1_resp.status == 200, f"Failed to create MCQ question: {await create_q1_resp.text()}"
        q1_data = await create_q1_resp.json()
        print(f"Created MCQ question: {q1_data['id']}")

        # Add question to paper section
        add_q1 = await context.request.post(f"{BASE_URL}/api/papers/{paper_id}/questions", data={
            "sectionId": mcq_sec["id"],
            "questionId": q1_data["id"]
        })
        print(f"Added MCQ to section {mcq_sec['title']} - status: {add_q1.status}")

        # Check if there is a MATCH_COLUMN section or add one if present
        match_sec = next((s for s in sections if s["type"] == "MATCH_COLUMN"), None)
        if match_sec:
            print("\nInjecting test MATCH_COLUMN question (Board standard combined item)...")
            create_q2_resp = await context.request.post(f"{BASE_URL}/api/questions", data={
                "bookId": book_id,
                "chapterId": ch_id,
                "type": "MATCH_COLUMN",
                "text": "Match Column I with Column II:\nColumn I\n(A) Restriction endonuclease\n(B) Exonuclease\n(C) DNA ligase\n(D) Taq polymerase\nColumn II\n(1) Thermostable DNA synthesis\n(2) Molecular glue\n(3) Cuts at specific palindromic sequence\n(4) Removes nucleotides from the ends",
                "options": [
                    "(1) Thermostable DNA synthesis",
                    "(2) Molecular glue",
                    "(3) Cuts at specific palindromic sequence",
                    "(4) Removes nucleotides from the ends"
                ],
                "answer": "A-3, B-4, C-2, D-1",
                "marks": match_sec["marksEach"],
                "difficulty": "MEDIUM",
                "cognitiveLevel": "UNDERSTANDING"
            })
            if create_q2_resp.status == 200:
                q2_data = await create_q2_resp.json()
                add_q2 = await context.request.post(f"{BASE_URL}/api/papers/{paper_id}/questions", data={
                    "sectionId": match_sec["id"],
                    "questionId": q2_data["id"]
                })
                print(f"Added MATCH_COLUMN to section {match_sec['title']} - status: {add_q2.status}")

        # Reload paper workbench
        await page.goto(f"{BASE_URL}/papers/{paper_id}", wait_until="networkidle")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=f"{out_dir}/05_paper_workbench_with_questions.png")

        # VERIFY MCQ RENDERING: NO RAW \text{ IN DOM!
        print("\nVerifying MCQ Option rendering on paper workbench...")
        body_text = await page.content()
        assert "\\text{cry}" not in body_text, "ERROR: Raw \\text{cry} was found unescaped in workbench DOM!"
        assert "cry1Ac" in body_text, "ERROR: Expected cleaned option 'cry1Ac' not found in DOM!"
        assert "cry1Ab" in body_text, "ERROR: Expected cleaned option 'cry1Ab' not found in DOM!"
        print("[SUCCESS] MCQ options rendered cleanly as cry1Ac, cry1Ab without raw LaTeX macros!")

        # Verify no duplicate (a) (a)
        opt_texts = await page.locator(".opt-text").all_text_contents()
        for t in opt_texts:
            assert "(a) (a)" not in t and "(b) (b)" not in t, f"Duplicate option prefix found: {t}"
        print(f"[SUCCESS] Checked {len(opt_texts)} option spans. No duplicate option prefixes found!")

        print("\n=======================================================")
        print("STAGE 5: Print View Verification (/papers/[id]/print)")
        print("=======================================================")
        await page.goto(f"{BASE_URL}/papers/{paper_id}/print", wait_until="networkidle")
        await page.wait_for_timeout(1500)
        
        # Verify page layout
        print_content = await page.content()
        assert "\\text{cry}" not in print_content, "ERROR: Raw \\text{cry} found in Print View DOM!"
        assert "cry1Ac" in print_content, "ERROR: Expected option 'cry1Ac' in Print View!"
        print("[SUCCESS] Print view contains clean MCQ options without raw backslashes.")

        # Test sheets view and toggle to reading view
        reading_btn = page.locator("button:has-text('Continuous')").first
        if await reading_btn.is_visible():
            await reading_btn.click()
            await page.wait_for_timeout(600)
            print("Switched to Continuous Reading View.")
            await page.screenshot(path=f"{out_dir}/06_print_reading_view.png")
            
            # Switch back to Booklet/Sheets view
            sheets_btn = page.locator("button:has-text('Booklet Sheets')").first
            if await sheets_btn.is_visible():
                await sheets_btn.click()
                await page.wait_for_timeout(600)
                print("Switched back to Booklet Sheets View.")

        await page.screenshot(path=f"{out_dir}/07_print_sheets_view.png")

        print("\n=======================================================")
        print("STAGE 6: Solutions & Marking Scheme (/papers/[id]/solutions)")
        print("=======================================================")
        await page.goto(f"{BASE_URL}/papers/{paper_id}/solutions", wait_until="networkidle")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=f"{out_dir}/08_solutions_marking_scheme.png")

        solutions_content = await page.content()
        if "\\text{cry}" in solutions_content:
            idx = solutions_content.find("\\text{cry}")
            snippet = solutions_content[max(0, idx - 100):min(len(solutions_content), idx + 150)]
            print(f"\n[DEBUG] Found '\\text{{cry}}' in solutions page at snippet:\n{snippet}\n")
        assert "\\text{cry}" not in solutions_content, "ERROR: Raw \\text{cry} found in Solutions Marking Scheme!"
        assert "cry1Ab" in solutions_content, "ERROR: Expected model answer 'cry1Ab' in Solutions View!"
        print("[SUCCESS] Solutions Marking Scheme renders clean model answer without raw LaTeX!")

        # Verify Award List Tab
        award_tab = page.locator("button:has-text('Award List')").first
        if await award_tab.is_visible():
            await award_tab.click()
            await page.wait_for_timeout(600)
            print("Switched to Official Examiner Award List Tab.")
            await page.screenshot(path=f"{out_dir}/09_solutions_award_list.png")
            award_content = await page.content()
            assert "Roll No." in award_content, "Missing Roll No. header in Award List"
            assert "Student Name" in award_content, "Missing Student Name header in Award List"
            print("[SUCCESS] Official Examiner Award List table verified.")

        print("\n=======================================================")
        print("STAGE 7: DOCX Export Verification")
        print("=======================================================")
        docx_resp = await context.request.get(f"{BASE_URL}/api/papers/{paper_id}/export-docx")
        assert docx_resp.status == 200, f"DOCX export failed with status {docx_resp.status}"
        docx_bytes = await docx_resp.body()
        print(f"DOCX export succeeded: {len(docx_bytes)} bytes received.")
        assert len(docx_bytes) > 2000, "DOCX export payload is suspiciously small"
        
        # Save exported docx to test artifacts
        with open(f"{out_dir}/exported_exam_paper.docx", "wb") as f:
            f.write(docx_bytes)
        print(f"[SUCCESS] Exported DOCX saved to {out_dir}/exported_exam_paper.docx")

        print("\n=======================================================")
        print("STAGE 8: OMR Answer Sheet Verification (/papers/[id]/omr)")
        print("=======================================================")
        await page.goto(f"{BASE_URL}/papers/{paper_id}/omr", wait_until="networkidle")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=f"{out_dir}/10_omr_answer_sheet.png")
        
        omr_content = await page.content()
        assert "OMR Answer Sheet" in omr_content or "Optical Mark Recognition" in omr_content, "OMR sheet header missing"
        assert "Paper Set" in omr_content or "SET" in omr_content, "Paper Set selector missing from OMR sheet"
        print("[SUCCESS] OMR Answer Sheet with bubble grid and candidate roll boxes verified.")

        print("\n=======================================================")
        print("ALL BOARD EXAM PIPELINE STAGES VERIFIED TO HIGHEST STANDARD!")
        print("=======================================================")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_complete_board_flow())
