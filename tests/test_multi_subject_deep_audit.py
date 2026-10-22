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

async def run_multi_subject_audit():
    out_dir = "test_artifacts/multi_subject_audit"
    os.makedirs(out_dir, exist_ok=True)
    cookie_val = generate_session_cookie()

    audit_findings = []

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
        print("TEST SUITE: Multi-Subject Deep Audit & Irregularity Detector")
        print("=======================================================")

        # -------------------------------------------------------------
        # SUBJECT 1: MATHEMATICS (Class 10)
        # Testing: Complex LaTeX formulas, fractions, radicals, geometry, subparts
        # -------------------------------------------------------------
        print("\n>>> AUDITING SUBJECT 1: Mathematics (Class 10) <<<")
        math_books_resp = await context.request.get(f"{BASE_URL}/api/books")
        books = await math_books_resp.json()
        math_book = next((b for b in books if b["subject"] == "Mathematics" and len(b.get("chapters", [])) > 0), None)
        assert math_book, "Class 10 Mathematics book with chapters not found"
        print(f"Using Mathematics book: {math_book['title']} ({len(math_book['chapters'])} chapters)")

        # Create Mathematics Blueprint
        math_bp_resp = await context.request.post(f"{BASE_URL}/api/blueprints", data={
            "name": "Class 10 Mathematics Annual Board Examination",
            "bookId": math_book["id"],
            "academicSession": "2025–26",
            "examType": "ANNUAL",
            "durationMin": 180,
            "subjectCode": "041",
            "sections": [
                {"title": "Section A", "type": "MCQ", "count": 4, "marksEach": 1, "instructions": "Multiple choice questions."},
                {"title": "Section B", "type": "SHORT", "count": 2, "marksEach": 2, "instructions": "Very short answer questions."},
                {"title": "Section C", "type": "SHORT", "count": 2, "marksEach": 3, "instructions": "Short answer questions."},
                {"title": "Section D", "type": "LONG", "count": 1, "marksEach": 5, "instructions": "Long answer questions."},
                {"title": "Section E", "type": "CASE_STUDY", "count": 1, "marksEach": 4, "instructions": "Case study based question."}
            ],
            "chapters": [
                {"chapterId": math_book["chapters"][0]["id"], "marks": 5},
                {"chapterId": math_book["chapters"][1]["id"], "marks": 6},
                {"chapterId": math_book["chapters"][2]["id"], "marks": 7},
                {"chapterId": math_book["chapters"][3]["id"], "marks": 5}
            ]
        })
        assert math_bp_resp.status == 200, f"Failed to create Math blueprint: {await math_bp_resp.text()}"
        math_bp = await math_bp_resp.json()
        print(f"Created Math Blueprint: {math_bp['id']}")

        # Create Paper from Blueprint
        math_paper_resp = await context.request.post(f"{BASE_URL}/api/papers", data={
            "blueprintId": math_bp["id"],
            "title": "Secondary School Examination 2026 Mathematics (Standard)",
            "schoolName": "Delhi Public Senior Secondary School",
            "paperSet": "SET A",
            "layout": "BOOKLET_A4"
        })
        assert math_paper_resp.status == 200, f"Failed to create Math paper: {await math_paper_resp.text()}"
        math_paper = await math_paper_resp.json()
        math_paper_id = math_paper["id"]
        print(f"Created Math Paper: {math_paper_id}")

        # Inject Math questions: Formula MCQ, Quadratic equation, Geometry/Trigonometry, Case Study with subparts
        sec_a = math_bp["sections"][0]
        sec_d = math_bp["sections"][3]
        sec_e = math_bp["sections"][4]
        ch0 = math_book["chapters"][0]["id"]
        ch1 = math_book["chapters"][1]["id"]
        ch2 = math_book["chapters"][2]["id"]

        q_math_mcq = await context.request.post(f"{BASE_URL}/api/questions", data={
            "bookId": math_book["id"],
            "chapterId": ch0,
            "type": "MCQ",
            "text": "If the discriminant of the quadratic equation $ax^2 + bx + c = 0$ is zero, then the roots are given by:",
            "options": [
                "(A) $-\\frac{b}{2a}$",
                "(B) $\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$",
                "(C) $\\frac{b}{2a}$",
                "(D) $\\pm \\frac{\\sqrt{c}}{a}$"
            ],
            "answer": "(A) $-\\frac{b}{2a}$",
            "marks": 1,
            "difficulty": "EASY",
            "cognitiveLevel": "UNDERSTANDING"
        })
        q_math_mcq_data = await q_math_mcq.json()
        await context.request.post(f"{BASE_URL}/api/papers/{math_paper_id}/questions", data={
            "sectionId": sec_a["id"],
            "questionId": q_math_mcq_data["id"]
        })

        # Inject Math Case Study with 3 subparts
        q_math_case = await context.request.post(f"{BASE_URL}/api/questions", data={
            "bookId": math_book["id"],
            "chapterId": ch2,
            "type": "CASE_STUDY",
            "text": "A circus tent is cylindrical up to a height of 3 m and conical above it. The diameter of the base is 105 m and the slant height of the conical part is 53 m. Based on this information, answer the following questions:",
            "options": [],
            "subparts": [
                {"label": "(i)", "text": "Find the total canvas required in square meters using $\\pi = \\frac{22}{7}$.", "marks": 2, "answer": "Total Canvas Area $= 2\\pi r h + \\pi r l = 9735\\text{ m}^2$."},
                {"label": "(ii)", "text": "Calculate the volume of air inside the tent.", "marks": 1, "answer": "Volume $= \\pi r^2 h + \\frac{1}{3}\\pi r^2 H$."},
                {"label": "(iii)", "text": "What is the cost of canvas at ₹500 per $100\\text{ m}^2$?", "marks": 1, "answer": "Total Cost $= ₹48,675$."}
            ],
            "answer": "Refer to step-wise solutions for subparts.",
            "marks": 4,
            "difficulty": "HARD",
            "cognitiveLevel": "APPLYING"
        })
        q_math_case_data = await q_math_case.json()
        await context.request.post(f"{BASE_URL}/api/papers/{math_paper_id}/questions", data={
            "sectionId": sec_e["id"],
            "questionId": q_math_case_data["id"]
        })

        # Verify Math Paper Workbench
        await page.goto(f"{BASE_URL}/papers/{math_paper_id}", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{out_dir}/01_math_workbench.png")
        math_dom = await page.content()
        
        # Check KaTeX rendering of formulas
        assert "katex" in math_dom, "KaTeX rendering missing on Math paper workbench"
        print("[MATH CHECK] KaTeX formulas successfully rendered in DOM.")

        # Check Print View for Math
        await page.goto(f"{BASE_URL}/papers/{math_paper_id}/print", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{out_dir}/02_math_print.png")
        math_print_dom = await page.content()
        assert "katex" in math_print_dom, "KaTeX rendering missing on Math print view"
        print("[MATH CHECK] Math print layout verified.")

        # Check Math Solutions
        await page.goto(f"{BASE_URL}/papers/{math_paper_id}/solutions", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{out_dir}/03_math_solutions.png")
        math_sol_dom = await page.content()
        assert "Total Canvas Area" in math_sol_dom or "9735" in math_sol_dom, "Case study subpart solution missing"
        print("[MATH CHECK] Math solutions and subpart rubrics verified.")

        # -------------------------------------------------------------
        # SUBJECT 2: SCIENCE / BIOLOGY / CHEMISTRY (Class 10)
        # Testing: MATCH_COLUMN unified rendering, Assertion Reason, diagrams
        # -------------------------------------------------------------
        print("\n>>> AUDITING SUBJECT 2: Science (Class 10) <<<")
        sci_book = next((b for b in books if b["className"] == "Class 10" and b["subject"] == "Science"), None)
        assert sci_book, "Class 10 Science book not found"

        sci_bp_resp = await context.request.post(f"{BASE_URL}/api/blueprints", data={
            "name": "Class 10 Science Term Board Examination",
            "bookId": sci_book["id"],
            "academicSession": "2025–26",
            "examType": "ANNUAL",
            "durationMin": 180,
            "subjectCode": "086",
            "sections": [
                {"title": "Section A", "type": "MCQ", "count": 2, "marksEach": 1, "instructions": "Multiple choice questions."},
                {"title": "Section B", "type": "ASSERTION_REASON", "count": 1, "marksEach": 1, "instructions": "Assertion and Reason question."},
                {"title": "Section C", "type": "MATCH_COLUMN", "count": 1, "marksEach": 4, "instructions": "Match Column I with Column II."},
                {"title": "Section D", "type": "SHORT", "count": 2, "marksEach": 3, "instructions": "Short answer questions."}
            ],
            "chapters": [
                {"chapterId": sci_book["chapters"][0]["id"], "marks": 5},
                {"chapterId": sci_book["chapters"][1]["id"], "marks": 4},
                {"chapterId": sci_book["chapters"][2]["id"], "marks": 4}
            ]
        })
        sci_bp = await sci_bp_resp.json()

        sci_paper_resp = await context.request.post(f"{BASE_URL}/api/papers", data={
            "blueprintId": sci_bp["id"],
            "title": "Secondary School Examination 2026 Science",
            "schoolName": "Modern Vidya Niketan",
            "paperSet": "SET B",
            "layout": "PAGE"
        })
        sci_paper = await sci_paper_resp.json()
        sci_paper_id = sci_paper["id"]

        # Inject Assertion-Reason Question
        ar_sec = sci_bp["sections"][1]
        q_ar = await context.request.post(f"{BASE_URL}/api/questions", data={
            "bookId": sci_book["id"],
            "chapterId": sci_book["chapters"][0]["id"],
            "type": "ASSERTION_REASON",
            "text": "Assertion (A): Respiration is an exothermic reaction.\nReason (R): Respiration is a process in which glucose combines with oxygen and releases energy.",
            "options": [
                "(A) Both (A) and (R) are true and (R) is the correct explanation of (A).",
                "(B) Both (A) and (R) are true but (R) is not the correct explanation of (A).",
                "(C) (A) is true but (R) is false.",
                "(D) (A) is false but (R) is true."
            ],
            "answer": "(A)",
            "marks": 1,
            "difficulty": "MEDIUM",
            "cognitiveLevel": "ANALYSING"
        })
        assert q_ar.status == 200, f"Failed to create AR question: {await q_ar.text()}"
        q_ar_data = await q_ar.json()
        add_ar = await context.request.post(f"{BASE_URL}/api/papers/{sci_paper_id}/questions", data={
            "sectionId": ar_sec["id"],
            "questionId": q_ar_data["id"]
        })
        assert add_ar.status == 200, f"Failed to add AR question: {await add_ar.text()}"

        # Inject 4-Pair Board Standard MATCH_COLUMN
        mc_sec = sci_bp["sections"][2]
        q_mc = await context.request.post(f"{BASE_URL}/api/questions", data={
            "bookId": sci_book["id"],
            "chapterId": sci_book["chapters"][1]["id"],
            "type": "MATCH_COLUMN",
            "text": "Match the following functional groups with their chemical formulas:\nColumn I\n(A) Alcohol\n(B) Aldehyde\n(C) Ketone\n(D) Carboxylic acid\nColumn II\n(1) $-\\text{COOH}$\n(2) $-\\text{OH}$\n(3) $-\\text{CHO}$\n(4) $-\\text{C=O}-$",
            "options": [
                "(1) $-\\text{COOH}$",
                "(2) $-\\text{OH}$",
                "(3) $-\\text{CHO}$",
                "(4) $-\\text{C=O}-$"
            ],
            "answer": "A-2, B-3, C-4, D-1",
            "marks": 4,
            "difficulty": "MEDIUM",
            "cognitiveLevel": "UNDERSTANDING"
        })
        assert q_mc.status == 200, f"Failed to create Match question: {await q_mc.text()}"
        q_mc_data = await q_mc.json()
        add_mc = await context.request.post(f"{BASE_URL}/api/papers/{sci_paper_id}/questions", data={
            "sectionId": mc_sec["id"],
            "questionId": q_mc_data["id"]
        })
        assert add_mc.status == 200, f"Failed to add Match question: {await add_mc.text()}"

        # Verify Science Workbench & Print
        await page.goto(f"{BASE_URL}/papers/{sci_paper_id}", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{out_dir}/04_science_workbench.png")
        sci_dom = await page.content()

        # Verify MATCH_COLUMN is rendered as ONE unified table/block with Column I and Column II
        assert "Column I" in sci_dom and "Column II" in sci_dom, "Match column headers missing"
        # Verify it does not create 4 separate questions
        q_cards = await page.locator(".paper-font").count()
        print(f"[SCIENCE CHECK] Total question blocks on workbench: {q_cards}")
        assert q_cards == 2, f"Expected 2 question blocks (AR + MATCH_COLUMN), found {q_cards}"
        print("[SCIENCE CHECK] MATCH_COLUMN correctly consolidated as ONE question.")

        # Check Science Print View
        await page.goto(f"{BASE_URL}/papers/{sci_paper_id}/print", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{out_dir}/05_science_print.png")
        sci_print_dom = await page.content()
        assert "Column I" in sci_print_dom and "Column II" in sci_print_dom, "Print view missing 2-column match layout"
        print("[SCIENCE CHECK] Science print layout verified.")

        # -------------------------------------------------------------
        # SUBJECT 3: ENGLISH LANGUAGE & LITERATURE (Class 10)
        # Testing: Unseen passage, 400-word reading extract, letter writing prompt
        # -------------------------------------------------------------
        print("\n>>> AUDITING SUBJECT 3: English (Class 10) <<<")
        # Find or create English book with chapters
        eng_book = next((b for b in books if b["subject"] == "English" and len(b.get("chapters", [])) > 0), None)
        if not eng_book or len(eng_book.get("chapters", [])) == 0:
            print("Importing English syllabus preset for Class 10...")
            eng_import_resp = await context.request.post(f"{BASE_URL}/api/books/import", data={
                "format": "preset",
                "content": "cbse-10-english",
                "academicSession": "2025–26"
            })
            assert eng_import_resp.status == 200, f"Preset import failed: {await eng_import_resp.text()}"
            eng_res = await eng_import_resp.json()
            eng_book_resp = await context.request.get(f"{BASE_URL}/api/books/{eng_res['bookIds'][0]}")
            eng_book = await eng_book_resp.json()
            print(f"Imported English book: {eng_book['title']} with {len(eng_book['chapters'])} chapters.")

        eng_bp_resp = await context.request.post(f"{BASE_URL}/api/blueprints", data={
            "name": "Class 10 English Language & Literature Term 2",
            "bookId": eng_book["id"],
            "academicSession": "2025–26",
            "examType": "ANNUAL",
            "durationMin": 180,
            "subjectCode": "184",
            "sections": [
                {"title": "Section A – Reading Skills", "type": "UNSEEN_PASSAGE", "count": 1, "marksEach": 10, "instructions": "Read the passage carefully and answer the questions that follow."},
                {"title": "Section B – Writing & Grammar", "type": "LONG", "count": 1, "marksEach": 5, "instructions": "Write a formal letter in about 120 words."}
            ],
            "chapters": [
                {"chapterId": eng_book["chapters"][0]["id"], "marks": 15}
            ]
        })
        eng_bp = await eng_bp_resp.json()

        eng_paper_resp = await context.request.post(f"{BASE_URL}/api/papers", data={
            "blueprintId": eng_bp["id"],
            "title": "Secondary School Examination 2026 English",
            "schoolName": "St. Xavier's Senior Secondary School",
            "paperSet": "SET C",
            "layout": "BOOKLET_A4"
        })
        eng_paper = await eng_paper_resp.json()
        eng_paper_id = eng_paper["id"]

        # Inject Unseen Passage with subparts
        q_unseen = await context.request.post(f"{BASE_URL}/api/questions", data={
            "bookId": eng_book["id"],
            "chapterId": eng_book["chapters"][0]["id"],
            "type": "UNSEEN_PASSAGE",
            "text": "Read the passage given below:\n(1) The revolution in information technology has touched almost every sphere of human existence. From healthcare and banking to governance and entertainment, digital networks have made access instantaneous and effortless. However, this omnipresence of screens has raised fundamental questions about human attention spans and critical reflection.\n(2) Studies demonstrate that chronic multitasking diminishes cognitive retention and fosters shallow reading habits. When navigating hyperlinked environments, readers tend to scan headlines and fragmented paragraphs rather than engaging with sustained analytical arguments.\nBased on your understanding of the passage, answer the questions that follow:",
            "options": [],
            "subparts": [
                {"label": "(a)", "text": "What major concern regarding digital media is raised in paragraph 1?", "marks": 4, "answer": "Diminished attention spans and loss of critical reflection."},
                {"label": "(b)", "text": "According to paragraph 2, how does chronic multitasking affect reading habits?", "marks": 4, "answer": "It fosters shallow scanning habits rather than deep comprehension."},
                {"label": "(c)", "text": "Which word in paragraph 1 means 'present everywhere simultaneously'?", "marks": 2, "options": ["(i) Instantaneous", "(ii) Omnipresence", "(iii) Existence", "(iv) Analytical"], "answer": "(ii) Omnipresence"}
            ],
            "answer": "Refer to individual subpart model answers.",
            "marks": 10,
            "difficulty": "MEDIUM",
            "cognitiveLevel": "UNDERSTANDING"
        })
        assert q_unseen.status == 200, f"Failed to create unseen passage: {await q_unseen.text()}"
        q_unseen_data = await q_unseen.json()
        add_unseen = await context.request.post(f"{BASE_URL}/api/papers/{eng_paper_id}/questions", data={
            "sectionId": eng_bp["sections"][0]["id"],
            "questionId": q_unseen_data["id"]
        })
        assert add_unseen.status == 200, f"Failed to add unseen passage to paper: {await add_unseen.text()}"

        # Verify English Workbench & Print
        await page.goto(f"{BASE_URL}/papers/{eng_paper_id}", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{out_dir}/06_english_workbench.png")
        eng_dom = await page.content()
        assert "revolution in information technology" in eng_dom, "Unseen passage text missing on workbench"
        print("[ENGLISH CHECK] English unseen passage verified on workbench.")

        # Check English Print View
        await page.goto(f"{BASE_URL}/papers/{eng_paper_id}/print", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{out_dir}/07_english_print.png")
        eng_print_dom = await page.content()
        assert "revolution in information technology" in eng_print_dom, "Unseen passage text missing in print view"
        print("[ENGLISH CHECK] English print layout verified.")

        # -------------------------------------------------------------
        # SUBJECT 4: NURSERY / KINDERGARTEN ACTIVITY WORKBOOK
        # Testing: Pre-primary specialized workbook blocks (Trace, Grid, Count)
        # -------------------------------------------------------------
        print("\n>>> AUDITING SUBJECT 4: Pre-Primary / Kindergarten <<<")
        kdg_book = next((b for b in books if b["className"] == "Nursery"), None)
        assert kdg_book, "Nursery book not found"

        kdg_bp_resp = await context.request.post(f"{BASE_URL}/api/blueprints", data={
            "name": "Nursery Annual Activity Assessment",
            "bookId": kdg_book["id"],
            "academicSession": "2025–26",
            "examType": "ANNUAL",
            "durationMin": 60,
            "sections": [
                {"title": "Activity 1 – Letter Tracing", "type": "KDG_TRACE_WRITE", "count": 1, "marksEach": 5, "instructions": "Trace the letters carefully along the dotted lines."},
                {"title": "Activity 2 – Number Writing Grid", "type": "KDG_NUMBER_GRID", "count": 1, "marksEach": 5, "instructions": "Fill in the missing numbers from 1 to 20."},
                {"title": "Activity 3 – Picture Matching", "type": "KDG_PICTURE_MATCH", "count": 1, "marksEach": 5, "instructions": "Match each picture with its starting sound."}
            ],
            "chapters": [
                {"chapterId": kdg_book["chapters"][0]["id"], "marks": 5},
                {"chapterId": kdg_book["chapters"][1]["id"], "marks": 5},
                {"chapterId": kdg_book["chapters"][2]["id"], "marks": 5}
            ]
        })
        kdg_bp = await kdg_bp_resp.json()

        kdg_paper_resp = await context.request.post(f"{BASE_URL}/api/papers", data={
            "blueprintId": kdg_bp["id"],
            "title": "Little Stars Kindergarten Activity Workbook",
            "schoolName": "Bloom Early Learning Center",
            "paperSet": "SET A",
            "layout": "PAGE"
        })
        kdg_paper = await kdg_paper_resp.json()
        kdg_paper_id = kdg_paper["id"]

        # Inject Kindergarten tracing question
        q_trace = await context.request.post(f"{BASE_URL}/api/questions", data={
            "bookId": kdg_book["id"],
            "chapterId": kdg_book["chapters"][0]["id"],
            "type": "KDG_TRACE_WRITE",
            "text": "Trace the capital letters: A B C D E F G",
            "options": ["A", "B", "C", "D"],
            "answer": "Tracing evaluation based on hand-eye coordination and stroke formation.",
            "marks": 5,
            "difficulty": "EASY",
            "cognitiveLevel": "REMEMBERING"
        })
        assert q_trace.status == 200, f"Failed to create trace question: {await q_trace.text()}"
        q_trace_data = await q_trace.json()
        add_trace = await context.request.post(f"{BASE_URL}/api/papers/{kdg_paper_id}/questions", data={
            "sectionId": kdg_bp["sections"][0]["id"],
            "questionId": q_trace_data["id"]
        })
        assert add_trace.status == 200, f"Failed to add trace question: {await add_trace.text()}"

        # Inject Kindergarten Number Grid question
        q_grid = await context.request.post(f"{BASE_URL}/api/questions", data={
            "bookId": kdg_book["id"],
            "chapterId": kdg_book["chapters"][1]["id"],
            "type": "KDG_NUMBER_GRID",
            "text": "Write numbers from 1 to 20 in the grid boxes below:",
            "options": ["1", "2", "3", "4", "5"],
            "answer": "Sequential number writing 1 through 20.",
            "marks": 5,
            "difficulty": "EASY",
            "cognitiveLevel": "REMEMBERING"
        })
        assert q_grid.status == 200, f"Failed to create grid question: {await q_grid.text()}"
        q_grid_data = await q_grid.json()
        add_grid = await context.request.post(f"{BASE_URL}/api/papers/{kdg_paper_id}/questions", data={
            "sectionId": kdg_bp["sections"][1]["id"],
            "questionId": q_grid_data["id"]
        })
        assert add_grid.status == 200, f"Failed to add grid question: {await add_grid.text()}"

        # Verify Kindergarten Workbench & Print
        await page.goto(f"{BASE_URL}/papers/{kdg_paper_id}", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{out_dir}/08_kindergarten_workbench.png")
        kdg_dom = await page.content()
        assert "Trace the capital letters" in kdg_dom, "Kindergarten tracing text missing on workbench"
        print("[KDG CHECK] Kindergarten activity blocks verified on workbench.")

        # Check Kindergarten Print View
        await page.goto(f"{BASE_URL}/papers/{kdg_paper_id}/print", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=f"{out_dir}/09_kindergarten_print.png")
        kdg_print_dom = await page.content()
        assert "Trace the capital letters" in kdg_print_dom, "Kindergarten tracing text missing in print view"
        print("[KDG CHECK] Kindergarten print view verified.")

        # -------------------------------------------------------------
        # DOCX EXPORTS DEEP VERIFICATION ACROSS ALL SUBJECTS
        # -------------------------------------------------------------
        print("\n>>> AUDITING DOCX EXPORTS ACROSS ALL 4 PAPERS <<<")
        for p_label, p_id in [("Math", math_paper_id), ("Science", sci_paper_id), ("English", eng_paper_id), ("Kindergarten", kdg_paper_id)]:
            resp = await context.request.get(f"{BASE_URL}/api/papers/{p_id}/export-docx")
            assert resp.status == 200, f"DOCX export failed for {p_label} (status {resp.status})"
            b = await resp.body()
            assert len(b) > 2000, f"DOCX buffer too small for {p_label} ({len(b)} bytes)"
            with open(f"{out_dir}/{p_label}_Paper.docx", "wb") as f:
                f.write(b)
            print(f"[DOCX CHECK] {p_label} paper DOCX generated successfully ({len(b)} bytes).")

        print("\n=======================================================")
        print("COMPREHENSIVE MULTI-SUBJECT AUDIT FINISHED!")
        print("=======================================================")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_multi_subject_audit())
