// End-to-end check of the school profile on a running server (use a COPY of the database).
// For every required class / stream / subject: scope filtering, book + chapters, blueprint from the official
// template (as the editor does), question bank, auto-fill, MANUAL assembly, validation, audit, print and DOCX.
//   DATABASE_URL=file:/path/copy.db npx next start -p 3100
//   node scripts/e2e-school.mjs http://localhost:3100 /path/school.json [filter]
import { readFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3100";
const data = JSON.parse(readFileSync(process.argv[3], "utf8"));
const only = process.argv[4];
let cookie = "";
let viewCookie = "";
const AI = process.env.AI === "1"; // also run LIVE model generation (sends text to Gemini)
const failures = [];

async function call(method, path, json, raw = false) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(json ? { "Content-Type": "application/json" } : {}), cookie: [cookie, viewCookie].filter(Boolean).join("; ") },
    body: json ? JSON.stringify(json) : undefined,
  });
  const sc = res.headers.get("set-cookie");
  if (sc && sc.startsWith("epb_session")) cookie = sc.split(";")[0];
  if (raw) return { status: res.status, buf: Buffer.from(await res.arrayBuffer()) };
  return { status: res.status, data: await res.json().catch(() => null) };
}
const setView = (stream, other = false) => {
  viewCookie = `epb_view=${encodeURIComponent(new URLSearchParams({ stream, other: other ? "1" : "0" }).toString())}`;
};

const login = await call("POST", "/api/auth/login", { email: "teacher@school.edu", password: "password123" });
if (login.status !== 200) throw new Error("login failed");

let checks = 0;
const canon = (s) => {
  const t = String(s || "").trim();
  const rules = [[/disaster|आपदा/i, "Disaster Management"], [/^\s*(social\s*science|sst\b|सामाजिक)/i, "Social Science"], [/^\s*(sanskrit|संस्कृत)/i, "Sanskrit"], [/^\s*(hindi|हिन्दी|हिंदी)/i, "Hindi"], [/^\s*(english|अंग्रेजी)/i, "English"], [/^\s*(physics|भौतिक)/i, "Physics"], [/^\s*(chemistry|रसायन)/i, "Chemistry"], [/^\s*(biology|जीव विज्ञान)/i, "Biology"], [/^\s*(math|गणित)/i, "Mathematics"], [/^\s*(science|विज्ञान)/i, "Science"]];
  for (const [re, n] of rules) if (re.test(t)) return n;
  return null;
};
const norm = (s) => String(s).replace(/^\s*\[[^\]]*\]\s*/, "").replace(/\s+/g, " ").trim().toLowerCase();

function makeQuestion(sec, bookId, chapterId, n) {
  const b = { bookId, chapterId, type: sec.type, difficulty: ["EASY", "MEDIUM", "HARD"][n % 3] };
  const stem = `Q${n} ${sec.title.slice(0, 30)} ${["alpha", "bravo", "cedar", "delta", "ember", "fjord", "gamma", "hotel"].map((w, i) => `${w}${(n * 7 + i * 13) % 97}`).join(" ")}`;
  switch (sec.type) {
    case "MCQ": return { ...b, text: stem, options: [`A${n}`, `B${n}`, `C${n}`, `D${n}`], answer: `A${n}` };
    case "TRUE_FALSE": return { ...b, text: `${stem} statement.`, options: [], answer: "True" };
    case "FILL_BLANK": return { ...b, text: `${stem} ________ here.`, options: [], answer: `w${n}` };
    case "MATCH_COLUMN": { const pairs = n % 2 === 0 ? Math.ceil(sec.count / 2) : Math.floor(sec.count / 2) || 1; return { ...b, text: `Match the following ${n}`, options: Array.from({ length: Math.max(2, pairs) }, (_, k) => `L${k + 1}::R${k + 1}`), answer: "1-1" }; }
    case "UNSEEN_PASSAGE": case "CASE_STUDY": case "REFERENCE_CONTEXT": {
      const parts = []; let left = sec.marksEach; let i = 1;
      while (left > 0) { parts.push({ label: `(${i})`, text: `Sub ${i} of ${stem}`, marks: 1, answer: `a${i}`, options: ["p", "q", "r", "s"] }); left--; i++; }
      return { ...b, text: `Read the passage ${n}. `.repeat(15), options: [], subparts: parts, answer: "see sub-answers" };
    }
    default: return { ...b, text: `${stem}. Explain.`, options: [], answer: `Model ${n}` };
  }
}

async function scopeChecks(level, profileSubjects) {
  const streams = level >= 11 ? ["ALL", "PCM", "PCB"] : ["ALL"];
  const issues = [];
  for (const stream of streams) {
    setView(stream, false);
    const classes = (await call("GET", "/api/classes?session=ALL")).data ?? [];
    const row = classes.find((c) => c.name === `Class ${level}`);
    const names = (row?.subjects ?? []).map((s) => canon(s.name)).filter(Boolean);
    const expected = profileSubjects.filter((s) => stream === "ALL" || !s.streams || s.streams.includes(stream)).map((s) => s.name);
    checks++;
    const missing = expected.filter((n) => !names.includes(n));
    const extra = (row?.subjects ?? []).filter((s) => !expected.includes(canon(s.name)));
    if (missing.length || extra.length) issues.push(`Class ${level} ${stream}: missing [${missing}] extra [${extra.map((s) => s.name)}]`);
    // books and blueprints lists contain only active subjects
    const books = (await call("GET", "/api/books?session=ALL")).data ?? [];
    const bad = books.filter((b) => b.className === `Class ${level}` && !expected.includes(canon(b.subject)));
    checks++;
    if (bad.length) issues.push(`Class ${level} ${stream}: books outside the profile are listed: ${bad.slice(0, 4).map((b) => b.subject)}`);
  }
  setView("ALL", true);
  const all = (await call("GET", "/api/classes?session=ALL")).data ?? [];
  const row = all.find((c) => c.name === `Class ${level}`);
  checks++;
  if (!row || row.subjects.length <= profileSubjects.length) issues.push(`Class ${level}: "show other subjects" does not reveal the archived subjects`);
  setView("ALL", false);
  return issues;
}

// Live generation of a representative set of sections: language papers get passage, grammar, writing and
// literature; other subjects get an objective block, a 3-mark block and (where present) the map question.
async function aiChecks(t, bp, book, note) {
  const paper = (await call("POST", "/api/papers", { title: `${t.code} ai`, blueprintId: bp.id, layout: "PAGE", schoolName: "School", language: ["en", "hi", "sa", "bilingual"].includes(t.language) ? t.language : "en" })).data;
  const planRes = await call("GET", `/api/papers/${paper.id}/ai-plan`);
  const plan = planRes.data?.plan;
  note("AI plan builds", planRes.status === 200 && plan?.sections?.length > 0, JSON.stringify(planRes.data).slice(0, 160));
  if (!plan?.sections?.length) return;
  const bySecRole = (role) => bp.sections.find((x) => x.role === role);
  const wanted = new Set();
  for (const role of ["PASSAGE", "GRAMMAR", "WRITING", "LITERATURE"]) { const x = bySecRole(role); if (x) wanted.add(x.id); }
  const firstMcq = bp.sections.find((x) => x.type === "MCQ"); if (firstMcq) wanted.add(firstMcq.id);
  const three = bp.sections.find((x) => x.marksEach === 3); if (three) wanted.add(three.id);
  const map = bp.sections.find((x) => x.type === "MAP_WORK"); if (map) wanted.add(map.id);
  for (const secPlan of plan.sections.filter((x) => wanted.has(x.sectionId))) {
    const label = `${secPlan.sectionTitle.slice(0, 34)} [${secPlan.sectionType}]`;
    const gen = await call("POST", `/api/papers/${paper.id}/ai-generate-section`, {
      sectionId: secPlan.sectionId, sectionTitle: secPlan.sectionTitle, sectionType: secPlan.sectionType, sectionInstructions: secPlan.sectionInstructions,
      marksEach: secPlan.marksEach, language: t.language === "en" ? "en" : t.language, difficulty: "BALANCED", model: "gemini-flash-lite-latest", generateDiagrams: false, slots: secPlan.slots,
    });
    note(`AI generates ${label}`, gen.status === 200 && gen.data?.isMock === false && gen.data?.questions?.length === secPlan.slots.length, `${gen.status} mock=${gen.data?.isMock} n=${gen.data?.questions?.length}/${secPlan.slots.length} ${JSON.stringify(gen.data).slice(0, 140)}`);
    if (gen.status !== 200) continue;
    const qs = gen.data.questions;
    const commit = await call("POST", `/api/papers/${paper.id}/ai-commit-section`, { sectionId: secPlan.sectionId, questions: qs, isMock: gen.data.isMock });
    note(`AI commit ${label}`, commit.status === 200 && commit.data?.templateFallbackCount === 0, `${commit.status} ${JSON.stringify(commit.data).slice(0, 200)}`);
    if (commit.status !== 200) continue;
    const v = (await call("GET", `/api/papers/${paper.id}`)).data;
    const placed = v.items.filter((i) => i.sectionId === secPlan.sectionId);
    if (secPlan.sectionType === "MCQ") note(`AI ${label}: every MCQ has 4 options and an answer`, placed.every((i) => i.question.options.length === 4 && i.question.answer), "");
    if (["UNSEEN_PASSAGE"].includes(secPlan.sectionType)) {
      const words = (q) => q.text.split(/\s+/).filter(Boolean).length;
      note(`AI ${label}: a real passage with sub-questions worth ${secPlan.marksEach}`, placed.every((i) => words(i.question) >= (t.language === "en" ? 100 : 60) && (i.question.subparts ?? []).reduce((a, sp) => a + (sp.marks || 0), 0) === secPlan.marksEach), placed.map((i) => `${words(i.question)}w/${(i.question.subparts ?? []).length}sp`).join(","));
    }
  }
}

async function runTemplate(level, subject, t) {
  const issues = [];
  const note = (name, ok, extra = "") => { checks++; if (!ok) issues.push(`${name}${extra ? " -> " + String(extra).slice(0, 240) : ""}`); };
  setView("ALL", true); // seeded books of every subject are needed to find the right one
  const books = ((await call("GET", "/api/books?session=ALL")).data ?? []).filter((b) => b.className === `Class ${level}` && canon(b.subject) === subject);
  setView("ALL", false);
  let book;
  if (subject === "Disaster Management") {
    book = books[0] ?? (await call("POST", "/api/books", { title: "Disaster Management", subject: "Disaster Management", className: `Class ${level}` })).data;
    if (!book.chapters?.length) {
      for (let i = 1; i <= 6; i++) await call("POST", `/api/books/${book.id}/chapters`, { number: i, title: `Unit ${i}` });
      book = ((await call("GET", "/api/books?session=ALL")).data ?? []).find((b) => b.id === book.id);
    }
  } else {
    note("seeded textbook(s) exist for the subject", books.length > 0, `Class ${level} ${subject}`);
    if (!books.length) return issues;
    const variantBooks = t.variant ? books.filter((b) => new RegExp(t.variant, "i").test(b.title)) : books.filter((b) => !/basic/i.test(b.title));
    const use = variantBooks.length ? variantBooks : books;
    if (use.length > 1) {
      const comb = await call("POST", "/api/books/combine", { bookIds: use.map((b) => b.id), compositeTitle: `${subject} ${level} combined ${t.code}`, className: `Class ${level}`, subject, keepOriginals: true });
      note("textbooks combine", comb.status < 300, JSON.stringify(comb.data));
      const id = comb.data?.book?.id ?? comb.data?.id ?? comb.data?.compositeBook?.id;
      book = ((await call("GET", "/api/books?session=ALL")).data ?? []).find((b) => b.id === id) ?? ((await call("GET", "/api/books?session=ALL")).data ?? []).find((b) => b.title.includes("combined " + t.code));
    } else book = use[0];
  }
  if (!book) { note("book resolved", false); return issues; }

  // chapter marks exactly as the editor does: official template chapters matched onto the book's chapters
  const tData = (await call("GET", `/api/curriculum/templates/${t.code}`)).data;
  const official = (tData?.subject?.textbooks ?? []).flatMap((tb) => tb.chapters ?? []);
  const marks = {};
  const unitOf = {};
  if (official.length) {
    const used = new Set();
    for (const bc of book.chapters) {
      const oc = official.find((o) => !used.has(o) && ((o.legacyChapterId && o.legacyChapterId === bc.id) || norm(o.title) === norm(bc.title)));
      if (oc) { used.add(oc); marks[bc.id] = oc.isDeleted ? 0 : oc.officialMarks ?? 0; if (oc.unitNumber != null && !oc.isDeleted) unitOf[bc.id] = { key: `u${oc.unitNumber}`, title: oc.unitTitle ?? "" }; }
    }
  }
  let sum = Object.values(marks).reduce((a, b) => a + b, 0);
  if (sum !== t.total) {
    // no official chapter list (school-defined paper): spread evenly, largest remainder
    const chs = book.chapters;
    const baseQ = Math.floor(t.total / chs.length);
    let rem = t.total - baseQ * chs.length;
    for (const c of chs) { marks[c.id] = baseQ + (rem-- > 0 ? 1 : 0); }
    if (official.length) note("official chapter marks map onto the book (no even-split fallback needed)", false, `matched sum ${sum} of ${t.total}`);
    sum = t.total;
  } else note("official chapter marks map onto the book", true);
  const quotas = book.chapters.filter((c) => marks[c.id] > 0).map((c) => ({ chapterId: c.id, marks: marks[c.id], unitKey: unitOf[c.id]?.key ?? "", unitTitle: unitOf[c.id]?.title ?? "" }));

  const bpRes = await call("POST", "/api/blueprints", {
    name: `${t.code} ${Date.now() % 100000}`, bookId: book.id, examType: "ANNUAL", durationMin: 180, academicSession: "2026–27",
    language: ["en", "hi", "sa", "bilingual"].includes(t.language) ? t.language : "en", componentsJson: JSON.stringify(t.components),
    verificationStatus: t.source ? "SOURCE_CITED" : "UNVERIFIED", sourceRef: t.source ? `mpbse.nic.in MarksScheme_2026_27.pdf p.${t.source}` : "School-defined",
    chapters: quotas, sections: t.sections,
  });
  note("blueprint saves", bpRes.status < 300, JSON.stringify(bpRes.data));
  if (bpRes.status >= 300) return issues;
  const bp = bpRes.data;
  note("blueprint keeps roles", bp.sections.some((s) => s.role !== "STANDARD") === t.sections.some((s) => s.role !== "STANDARD"));

  // question bank: every chapter that carries marks gets a few questions of every section type, like a real bank
  let n = 0;
  for (const sec of bp.sections) {
    const perChapter = sec.marksEach === 1 ? 3 : 2;
    outer: for (const ch of quotas) {
      for (let k = 0; k < perChapter; k++) {
        const r = await call("POST", "/api/questions", makeQuestion(sec, book.id, ch.chapterId, n++));
        if (r.status >= 300) { note("question creates", false, `${sec.type}: ${JSON.stringify(r.data)}`); break outer; }
      }
    }
  }

  const paper = (await call("POST", "/api/papers", { title: `${t.code} auto`, blueprintId: bp.id, layout: "PAGE", schoolName: "School", language: ["en", "hi", "sa", "bilingual"].includes(t.language) ? t.language : "en" })).data;
  const fill = await call("POST", `/api/papers/${paper.id}/autofill`, {});
  note("autofill responds", fill.status === 200, `${fill.status} ${JSON.stringify(fill.data).slice(0, 160)}`);
  const view = (await call("GET", `/api/papers/${paper.id}`)).data;
  note("auto-filled paper complete", view.progress.complete === true, JSON.stringify((view.implications ?? []).filter((i) => i.severity === "error" || i.code === "SECTION_UNDERFILLED").map((i) => i.message).slice(0, 3)));
  note("total marks equal the blueprint", view.progress.usedMarks === t.total, `${view.progress.usedMarks}/${t.total}`);
  note("no error-level implications", (view.implications ?? []).filter((i) => i.severity === "error").length === 0, (view.implications ?? []).filter((i) => i.severity === "error").map((i) => i.message).join(" | "));

  if (t.components.length) {
    const compIssues = (view.implications ?? []).filter((i) => String(i.code).startsWith("COMPONENT_"));
    note("language paper: every question is assigned a syllabus component and each gets exactly its official marks", compIssues.length === 0, compIssues.map((i) => i.message).slice(0, 3).join(" | "));
  }

  // MANUAL assembly: rebuild the same paper item by item, with the wrong type refused
  const paper2 = (await call("POST", "/api/papers", { title: `${t.code} manual`, blueprintId: bp.id, layout: "PAGE", schoolName: "School", language: ["en", "hi", "sa", "bilingual"].includes(t.language) ? t.language : "en" })).data;
  const wrongSec = bp.sections.find((s) => s.type !== "MAP_WORK");
  const wrongQ = view.items.find((i) => i.question.type !== wrongSec.type);
  if (wrongQ) {
    const bad = await call("POST", `/api/papers/${paper2.id}/questions`, { sectionId: wrongSec.id, questionId: wrongQ.question.id });
    note("manual: a question of the wrong type is refused", bad.status === 409, `${bad.status}`);
  }
  let addFailures = [];
  for (const it of view.items) {
    const r = await call("POST", `/api/papers/${paper2.id}/questions`, { sectionId: it.sectionId, questionId: it.question.id, orQuestionId: it.orQuestion?.id ?? null });
    if (r.status >= 300) addFailures.push(`${r.status} ${JSON.stringify(r.data).slice(0, 100)}`);
  }
  note("manual: every question can be added to its section", addFailures.length === 0, addFailures.slice(0, 2).join(" | "));
  const view2 = (await call("GET", `/api/papers/${paper2.id}`)).data;
  note("manual paper reaches the same marks and completeness", view2.progress.complete === view.progress.complete && view2.progress.usedMarks === view.progress.usedMarks, `${view2.progress.usedMarks} vs ${view.progress.usedMarks}`);
  // marks edit: removing an item lowers the total, adding it back restores it
  const victim = view2.items[0];
  await call("DELETE", `/api/papers/${paper2.id}/questions/${victim.id}`);
  const afterDel = (await call("GET", `/api/papers/${paper2.id}`)).data;
  note("manual: removing a question lowers the live total", afterDel.progress.usedMarks < view2.progress.usedMarks, `${afterDel.progress.usedMarks}`);
  await call("POST", `/api/papers/${paper2.id}/questions`, { sectionId: victim.sectionId, questionId: victim.question.id });
  note("manual: adding it back restores the total", (await call("GET", `/api/papers/${paper2.id}`)).data.progress.usedMarks === view2.progress.usedMarks);

  const audit = await call("POST", "/api/ai/audit-paper", { paperId: paper.id });
  note("audit responds", audit.status === 200, `${audit.status}`);
  const findings = audit.data?.data?.findings ?? [];
  note("audit reports no marks mismatch on a complete paper", !findings.some((f) => f.type === "MARKS_MISMATCH"), findings.filter((f) => f.type === "MARKS_MISMATCH").map((f) => f.issue).join(" | "));
  note("audit never PASSes an unreviewed paper", audit.data?.data?.status !== "PASS" || audit.data?.data?.aiStage === "COMPLETED", audit.data?.data?.status);
  const pr = await call("GET", `/papers/${paper.id}/print`, null, true);
  note("print page renders", pr.status === 200 && pr.buf.length > 2000, `${pr.status}`);
  const dx = await call("GET", `/api/papers/${paper.id}/export-docx`, null, true);
  note("DOCX exports", dx.status === 200 && dx.buf.slice(0, 2).toString() === "PK" && dx.buf.length > 5000, `${dx.status} ${dx.buf.length}`);
  if (AI) await aiChecks(t, bp, book, note);
  return issues;
}

for (const level of [9, 10, 11, 12]) {
  const profile = data.profile[level];
  const scope = await scopeChecks(level, profile);
  console.log(`${scope.length ? "FAIL" : "PASS"}  Class ${level}: subject lists${scope.length ? "\n      - " + scope.join("\n      - ") : ""}`);
  if (scope.length) failures.push(`scope ${level}`);
  for (const sub of profile) {
    for (const t of data.templates[`${level}|${sub.name}`]) {
      if (only && !`${level} ${sub.name} ${t.code}`.toLowerCase().includes(only.toLowerCase())) continue;
      let issues;
      try { issues = await runTemplate(level, sub.name, t); } catch (e) { issues = [`exception: ${e.message}`]; }
      console.log(`${issues.length ? "FAIL" : "PASS"}  Class ${level} ${sub.name} [${t.code}]${issues.length ? "\n      - " + issues.join("\n      - ") : ""}`);
      if (issues.length) failures.push(t.code);
    }
  }
}
console.log(`\n${checks} checks, ${failures.length} failure group(s)${failures.length ? ": " + failures.join(", ") : ""}`);
process.exit(failures.length ? 1 : 0);
