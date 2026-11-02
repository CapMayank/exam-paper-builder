// Runs the whole paper workflow for EVERY built-in template against a live server (offline, no model calls):
// book + chapters -> blueprint -> question bank -> auto-fill -> completeness/audit -> print page -> DOCX export.
// Use a COPY of the database and an empty GEMINI_API_KEY:
//   DATABASE_URL=file:/path/copy.db GEMINI_API_KEY= npx next start -p 3100
//   node scripts/e2e-all-templates.mjs http://localhost:3100 /path/templates.json
import { readFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3100";
const templates = JSON.parse(readFileSync(process.argv[3], "utf8"));
const only = process.argv[4];
let cookie = "";
const failures = [];

async function call(method, path, json, raw = false) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(json ? { "Content-Type": "application/json" } : {}), cookie },
    body: json ? JSON.stringify(json) : undefined,
  });
  const sc = res.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  if (raw) return { status: res.status, buf: Buffer.from(await res.arrayBuffer()), type: res.headers.get("content-type") };
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

const login = await call("POST", "/api/auth/login", { email: "teacher@school.edu", password: "password123" });
if (login.status !== 200) throw new Error("login failed");

const CHAPTERS = 4;

function makeQuestion(sec, bookId, chapterId, n) {
  const base = { bookId, chapterId, type: sec.type, difficulty: ["EASY", "MEDIUM", "HARD"][n % 3] };
  const stem = `Matrix question ${n} for ${sec.title}`;
  switch (sec.type) {
    case "MCQ":
      return { ...base, text: stem, options: [`A${n}`, `B${n}`, `C${n}`, `D${n}`], answer: `A${n}` };
    case "ASSERTION_REASON":
      return { ...base, text: `Assertion (A): ${stem}. Reason (R): reason ${n}.`, options: ["Both true, R explains A", "Both true, R does not explain A", "A true, R false", "A false, R true"], answer: "Both true, R explains A" };
    case "TRUE_FALSE":
      return { ...base, text: `${stem} is a true statement.`, options: [], answer: "True" };
    case "FILL_BLANK":
      return { ...base, text: `${stem} ________ completes this.`, options: [], answer: `w${n}` };
    case "MATCH_COLUMN":
      return { ...base, text: `Match the following (set ${n})`, options: ["Left1::Right1", "Left2::Right2", "Left3::Right3", "Left4::Right4", "Left5::Right5", "Left6::Right6"].slice(0, Math.max(3, sec.count)), answer: "1-1, 2-2, 3-3" };
    case "UNSEEN_PASSAGE":
    case "CASE_STUDY":
    case "REFERENCE_CONTEXT": {
      const each = Math.max(1, Math.floor(sec.marksEach / Math.min(sec.marksEach, 5)));
      const parts = [];
      let left = sec.marksEach;
      let i = 1;
      while (left > 0) {
        const m = Math.min(each, left);
        parts.push({ label: `(${i})`, text: `Sub-question ${i} of ${stem}`, marks: m, answer: `ans${i}`, ...(m === 1 ? { options: ["p", "q", "r", "s"] } : {}) });
        left -= m;
        i++;
      }
      return { ...base, text: `Read this passage ${n}. `.repeat(12) + "Answer the questions below.", options: [], subparts: parts, answer: "See sub-answers" };
    }
    default:
      return { ...base, text: `${stem}. Explain in detail.`, options: [], answer: `Model answer ${n}` };
  }
}

let totalChecks = 0;
for (const t of templates) {
  if (only && !t.code.includes(only)) continue;
  const issues = [];
  const note = (name, cond, extra = "") => {
    totalChecks++;
    if (!cond) issues.push(`${name}${extra ? " -> " + String(extra).slice(0, 220) : ""}`);
  };
  try {
    const book = (await call("POST", "/api/books", { title: `${t.subject} book`, subject: t.subject, className: t.classLevel ? `Class ${t.classLevel}` : "Class 10" })).data;
    const chapters = [];
    for (let i = 1; i <= CHAPTERS; i++) chapters.push((await call("POST", `/api/books/${book.id}/chapters`, { number: i, title: `Chapter ${i}` })).data);
    const secMarks = t.sections.reduce((a, s) => a + s.count * s.marksEach, 0);
    const base = Math.floor(secMarks / CHAPTERS);
    const quotas = chapters.map((c, i) => ({ chapterId: c.id, marks: base + (i < secMarks - base * CHAPTERS ? 1 : 0) }));
    const bpRes = await call("POST", "/api/blueprints", {
      name: t.code, bookId: book.id, examType: "ANNUAL", durationMin: 180, language: ["en", "hi", "sa", "bilingual"].includes(t.language) ? t.language : "en",
      componentsJson: JSON.stringify(t.components), chapters: quotas, sections: t.sections,
    });
    note("blueprint saves", bpRes.status < 300, JSON.stringify(bpRes.data));
    if (bpRes.status >= 300) throw new Error("no blueprint");
    const bp = bpRes.data;

    // question bank: enough for every section in every chapter
    let n = 0;
    for (const sec of bp.sections) {
      const child = sec.role === "PASSAGE" && !["UNSEEN_PASSAGE", "CASE_STUDY", "REFERENCE_CONTEXT"].includes(sec.type);
      for (const ch of chapters) {
        for (let k = 0; k < Math.max(2, sec.count); k++) {
          const q = makeQuestion(sec, book.id, ch.id, n++);
          if (child) q.passageGroupId = `pg${n}`;
          const r = await call("POST", "/api/questions", q);
          if (r.status >= 300) { note("question creates", false, `${sec.type}: ${JSON.stringify(r.data)}`); break; }
        }
      }
    }

    const paper = (await call("POST", "/api/papers", { title: t.code, blueprintId: bp.id, layout: "PAGE", schoolName: "Matrix School", language: ["en", "hi", "sa", "bilingual"].includes(t.language) ? t.language : "en" })).data;
    const fill = await call("POST", `/api/papers/${paper.id}/autofill`, {});
    note("autofill responds", fill.status === 200, `${fill.status} ${JSON.stringify(fill.data).slice(0, 200)}`); if (process.env.DEBUG_FILL) console.log("FILL", JSON.stringify({ added: fill.data?.added?.length, keys: Object.keys(fill.data ?? {}), unfilled: fill.data?.unfilled, msg: fill.data?.message }));
    const view = (await call("GET", `/api/papers/${paper.id}`)).data;
    const underfilled = (view.implications ?? []).filter((i) => i.code === "SECTION_UNDERFILLED");
    note("every section filled", underfilled.length === 0, underfilled.map((i) => i.message).join(" | "));
    note("total marks equals the blueprint", view.progress.totalMarks === t.total && view.progress.usedMarks === t.total, `${view.progress.usedMarks}/${view.progress.totalMarks} vs ${t.total}`);
    const errors = (view.implications ?? []).filter((i) => i.severity === "error");
    note("no error-level implications", errors.length === 0, errors.map((i) => `${i.code}:${i.message}`).join(" | "));
    note("paper complete", view.progress.complete === true, JSON.stringify(view.progress.sections?.filter((s) => s.filled !== s.needed)));

    const audit = await call("POST", "/api/ai/audit-paper", { paperId: paper.id });
    note("audit responds", audit.status === 200, `${audit.status}`);
    note("audit never PASSes without a model", audit.data?.data?.status !== "PASS", audit.data?.data?.status);
    const marksFindings = (audit.data?.data?.findings ?? []).filter((f) => f.type === "MARKS_MISMATCH");
    note("audit reports no marks mismatch on a complete paper", marksFindings.length === 0, marksFindings.map((f) => f.issue).join(" | "));

    const printPage = await call("GET", `/papers/${paper.id}/print`, null, true);
    note("print page renders", printPage.status === 200 && printPage.buf.length > 2000, `${printPage.status} ${printPage.buf.length}`);
    const docx = await call("GET", `/api/papers/${paper.id}/export-docx`, null, true);
    note("DOCX exports", docx.status === 200 && docx.buf.length > 5000 && docx.buf.slice(0, 2).toString() === "PK", `${docx.status} ${docx.buf.length} ${docx.type}`);
  } catch (e) {
    issues.push(`exception: ${e.message}`);
  }
  console.log(`${issues.length === 0 ? "PASS" : "FAIL"}  ${t.code}${issues.length ? "\n      - " + issues.join("\n      - ") : ""}`);
  if (issues.length) failures.push(t.code);
}
console.log(`\n${totalChecks} checks, ${failures.length} template(s) with failures${failures.length ? ": " + failures.join(", ") : ""}`);
process.exit(failures.length ? 1 : 0);
