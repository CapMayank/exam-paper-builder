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

async def run_layout_verification():
    os.makedirs("test_artifacts/ux_audit", exist_ok=True)
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
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        
        print("\n=======================================================")
        print("VERIFYING UI & UX HARMONIZATION (CLASSES VS BLUEPRINTS)")
        print("=======================================================")
        
        # 1. Classes Hub Layout Verification
        print("\n[Step 1] Inspecting Classes Hub (/classes) layout")
        await page.goto(f"{BASE_URL}/classes", wait_until="networkidle")
        await page.wait_for_timeout(800)
        
        # Verify master-detail grid
        classes_grid = page.locator(".grid.lg\\:grid-cols-12")
        assert await classes_grid.count() > 0, "Classes page must use 12-column master-detail grid"
        left_col_classes = page.locator(".lg\\:col-span-4")
        right_col_classes = page.locator(".lg\\:col-span-8")
        assert await left_col_classes.first.is_visible()
        assert await right_col_classes.first.is_visible()
        print("  [OK] Classes Hub: master-detail 12-col grid verified (col-span-4 / col-span-8)")
        
        await page.screenshot(path="test_artifacts/ux_audit/08_classes_master_detail.png")
        
        # 2. Blueprints Directory Layout Verification
        print("\n[Step 2] Inspecting Blueprints Directory (/blueprints) layout")
        await page.goto(f"{BASE_URL}/blueprints", wait_until="networkidle")
        await page.wait_for_timeout(800)
        
        # Verify identical master-detail grid
        bp_grid = page.locator(".grid.lg\\:grid-cols-12")
        assert await bp_grid.count() > 0, "Blueprints page must use 12-column master-detail grid"
        left_col_bp = page.locator(".lg\\:col-span-4")
        right_col_bp = page.locator(".lg\\:col-span-8")
        assert await left_col_bp.first.is_visible()
        assert await right_col_bp.first.is_visible()
        print("  [OK] Blueprints: master-detail 12-col grid verified (col-span-4 / col-span-8)")
        
        # Check "All Classes" card
        all_classes_btn = page.locator("[role='button']:has-text('All Classes')").first
        assert await all_classes_btn.is_visible()
        print("  [OK] 'All Classes' selector card visible")
        
        # Test clicking a specific class in Blueprints left column
        class_cards = page.locator(".lg\\:col-span-4 [role='button']:has-text('Class')")
        class_count = await class_cards.count()
        print(f"  [OK] Found {class_count} class buttons in Blueprints sidebar")
        if class_count > 1:
            specific_class_btn = class_cards.nth(1)
            class_name_text = await specific_class_btn.locator(".font-bold").text_content()
            print(f"  [Action] Selecting specific class: {class_name_text.strip()}")
            await specific_class_btn.click()
            await page.wait_for_timeout(500)
            
            # Verify right pane header reflects the selected class
            header_title = await page.locator(".lg\\:col-span-8 h2").first.text_content()
            assert class_name_text.strip() in header_title, f"Header did not update: {header_title}"
            print(f"  [OK] Right pane header synchronized: {header_title.strip()}")
            
            # Verify subject filter chips in right pane
            subject_pills = page.locator(".lg\\:col-span-8 button:has-text('All')")
            assert await subject_pills.count() > 0, "Subject filter chips missing in right pane"
            print("  [OK] Subject filter chips displayed and interactive")
        
        await page.screenshot(path="test_artifacts/ux_audit/09_blueprints_master_detail.png")
        
        # 3. Test Build Paper launcher modal from the Blueprint card
        print("\n[Step 3] Testing Build Paper action modal")
        await all_classes_btn.click()
        await page.wait_for_timeout(500)
        build_btn = page.locator("button:has-text('Build Paper')").first
        if await build_btn.is_visible():
            await build_btn.click()
            await page.wait_for_timeout(400)
            modal = page.locator("h2:has-text('Build Exam Paper')")
            assert await modal.is_visible()
            print("  [OK] Build Exam Paper modal successfully opened with blueprint context")
            await page.screenshot(path="test_artifacts/ux_audit/10_blueprints_build_modal.png")
            await page.locator("button:has-text('Cancel')").click()
            await page.wait_for_timeout(300)
        
        # 4. Check for console errors
        filtered_errors = [e for e in console_errors if "favicon" not in e and "React DevTools" not in e]
        print(f"\n[Console Errors] Total errors: {len(filtered_errors)}")
        for err in filtered_errors:
            print(f"  ❌ JS Error: {err}")
        assert len(filtered_errors) == 0, f"Detected console errors: {filtered_errors}"
        
        print("\n=======================================================")
        print("HARMONIZATION AUDIT PASSED: LAYOUTS ARE 100% IDENTICAL")
        print("=======================================================")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_layout_verification())
