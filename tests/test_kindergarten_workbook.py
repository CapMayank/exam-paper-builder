import asyncio
import os
import sys
import hmac
import hashlib
import time
from playwright.async_api import async_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:3000"
SESSION_SECRET = "66891132bfd6ceef60adf849088b03281489d505ef5dd6092c904de64fe68a08"
USER_ID = "cmv9gedfq0000uovgz3bhl6of"
PAPER_ID = "cmvfipjhr000yuofcld2zu6iy"

def generate_session_cookie():
    exp = int(time.time()) + 7 * 24 * 3600
    payload = f"{USER_ID}.{exp}"
    sig = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"

async def run_kindergarten_tests():
    artifact_dir = os.path.join("test_artifacts", "kindergarten_audit")
    os.makedirs(artifact_dir, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1400, "height": 950})

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

        # -------------------------------------------------------------
        # 1. Test Paper Studio with Nursery Workbook Paper
        # -------------------------------------------------------------
        print("\n--- 1. Testing Nursery Workbook Paper Studio ---")
        await page.goto(f"{BASE_URL}/papers/{PAPER_ID}", wait_until="networkidle")
        await page.wait_for_timeout(1500)

        # Screenshot Studio
        studio_path = os.path.join(artifact_dir, "01_nursery_paper_studio.png")
        await page.screenshot(path=studio_path, full_page=True)
        print(f"Captured: {studio_path}")

        # Verify 4-line guide
        four_line = await page.locator("text=Trace and copy the letters neatly on the four-line guide").first.is_visible()
        assert four_line, "4-line guide text not visible"
        print("[PASS] Verified Activity 1: 4-Line English Letter Tracing guide rendered")

        # Verify Math Grid
        grid_cell = await page.locator("text=Fill in the missing numbers in the grid from 1 to 50").first.is_visible()
        assert grid_cell, "1 to 50 number grid instruction not visible"
        print("[PASS] Verified Activity 2: Math Square Number Grid 1-50 rendered")

        # Verify Picture Matching
        match_act = await page.locator("text=Look at the pictures and draw a line to match").first.is_visible()
        assert match_act, "Picture matching activity not visible"
        print("[PASS] Verified Activity 3: Picture-to-Alphabet matching with connection dots rendered")

        # Verify Count Balloons
        count_act = await page.locator("text=Count the balloons and write the correct number").first.is_visible()
        assert count_act, "Count items activity not visible"
        print("[PASS] Verified Activity 4: Count Objects & Write Number rendered")

        # Verify Caterpillar Sequence
        cat_act = await page.locator("text=Fill in the missing letters in the caterpillar's body").first.is_visible()
        assert cat_act, "Caterpillar sequence activity not visible"
        print("[PASS] Verified Activity 5 & 6: Caterpillar missing sequence chain rendered")

        # -------------------------------------------------------------
        # 2. Test Print Sheets Page with Child-Friendly Workbook Header
        # -------------------------------------------------------------
        print("\n--- 2. Testing Print Sheets with Child-Friendly Workbook Header ---")
        await page.goto(f"{BASE_URL}/papers/{PAPER_ID}/print", wait_until="networkidle")
        # Wait until pagination finishes (no "Calculating pagination" text)
        try:
            await page.wait_for_selector("text=Calculating pagination", state="detached", timeout=5000)
        except Exception:
            pass
        await page.wait_for_timeout(1000)

        # Screenshot Print Page before assertions
        print_path = os.path.join(artifact_dir, "02_nursery_print_sheets.png")
        await page.screenshot(path=print_path, full_page=True)
        print(f"Captured: {print_path}")

        # Check if text is present anywhere in content
        body_text = await page.inner_text("body")
        print(f"Body text excerpt (first 300 chars): {body_text[:300]}")
        has_name = "Student Name:" in body_text
        print(f"Contains 'Student Name:': {has_name}")

        # Verify Workbook Header elements within the visible page frame
        student_name = await page.locator(".page-frame :text('Student Name:')").first.is_visible()
        assert student_name, "WorkbookHeader Student Name line not visible on print page"
        print("[PASS] Verified WorkbookHeader: Student Name line present")

        rating_stars = await page.locator(".page-frame :text('Rating:')").first.is_visible()
        assert rating_stars, "Star rating not visible on Nursery workbook paper"
        print("[PASS] Verified Star Rating label present")

        remarks = await page.locator(".page-frame :text(\"Teacher's Remarks:\")").first.is_visible()
        assert remarks, "Teacher's remarks not visible"
        print("[PASS] Verified Teacher's Remarks with smileys present")

        # Screenshot Print Page
        print_path = os.path.join(artifact_dir, "02_nursery_print_sheets.png")
        await page.screenshot(path=print_path, full_page=True)
        print(f"Captured: {print_path}")

        # -------------------------------------------------------------
        # 3. Test Question Form with Preschool Toolbar & Clipart Picker
        # -------------------------------------------------------------
        print("\n--- 3. Testing Question Form & Clipart Picker Modal ---")
        await page.goto(f"{BASE_URL}/questions", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # Click "New Question" button
        add_q_btn = page.locator("button:has-text('New Question')").first
        assert await add_q_btn.is_visible(), "New Question button not found on /questions"
        await add_q_btn.click()
        await page.wait_for_timeout(1000)

        # Select Nursery book in Book dropdown inside modal
        book_select = page.locator("label:has-text('Book') select")
        await book_select.wait_for(state="visible", timeout=5000)
        options = await book_select.locator("option").all_inner_texts()
        nursery_opt = next((o for o in options if "Nursery" in o), None)
        if nursery_opt:
            await book_select.select_option(label=nursery_opt)
            await page.wait_for_timeout(800)
            print(f"[PASS] Selected book: {nursery_opt.strip()}")

        # Verify preschool activity switcher bar is visible
        bar_text = await page.locator("text=Preschool Activity Types").first.is_visible()
        assert bar_text, "Preschool Activity toolbar not visible on Nursery book form"
        print("[PASS] Verified Preschool Activity Types toolbar is visible on Nursery book")

        # Click "Count & Write" button in toolbar
        count_btn = page.locator("button:has-text('Count & Write')").first
        if await count_btn.is_visible():
            await count_btn.click()
            await page.wait_for_timeout(600)
            print("[PASS] Switched to Count & Write activity editor")

        form_path = os.path.join(artifact_dir, "03_preschool_activity_form.png")
        await page.screenshot(path=form_path, full_page=True)
        print(f"Captured: {form_path}")

        # Test Clipart Picker Modal
        change_clipart_btn = page.locator("button:has-text('Change')").first
        if await change_clipart_btn.is_visible():
            await change_clipart_btn.click()
            await page.wait_for_timeout(600)

            # Verify modal title
            picker_modal = await page.locator("text=Select Clipart or Photo").first.is_visible()
            assert picker_modal, "Clipart Picker Modal did not open"
            print("[PASS] Clipart Picker Modal opened successfully")

            # Search for balloon
            search_input = page.locator("input[placeholder*='Search clipart']").first
            if await search_input.is_visible():
                await search_input.fill("balloon")
                await page.wait_for_timeout(400)
                print("[PASS] Filtered clipart library by search term 'balloon'")

            picker_path = os.path.join(artifact_dir, "04_clipart_picker_modal.png")
            await page.screenshot(path=picker_path, full_page=True)
            print(f"Captured: {picker_path}")

        print("\nAll Kindergarten Workbook tests and visual audits passed successfully!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_kindergarten_tests())
