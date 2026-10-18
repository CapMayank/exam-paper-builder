// End-to-end API check against a running dev server: node scripts/e2e.mjs http://localhost:3100
const base = process.argv[2] ?? "http://localhost:3100";
let cookie = "";
let failures = 0;

async function call(method, path, json, { auth = true } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(json ? { "Content-Type": "application/json" } : {}), ...(auth && cookie ? { cookie } : {}) },
    body: json ? JSON.stringify(json) : undefined,
  });
  const sc = res.headers.get("set-cookie");
  if (sc) cookie = sc.split(";")[0];
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

function check(name, cond, extra = "") {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  -> " + extra}`);
}

const email = `t${Date.now()}@example.com`;

let r = await call("GET", "/api/papers", null, { auth: false });
check("unauthenticated API call is rejected", r.status === 401, r.status);

r = await call("POST", "/api/auth/register", { name: "T", email, password: "password123", schoolCode: "wrong" }, { auth: false });
check("register with wrong school code is rejected", r.status === 403, r.status);
r = await call("POST", "/api/auth/register", { name: "T", email, password: "password123", schoolCode: "change-me-school-code" });
check("register with school code works", r.status === 200 && cookie.startsWith("epb_session="), JSON.stringify(r));
r = await call("GET", "/api/me");
check("session cookie authenticates", r.status === 200 && r.data.email === email);

const book = (await call("POST", "/api/books", { title: "Science 8", subject: "Science", className: "Class 8" })).data;
const c1 = (await call("POST", `/api/books/${book.id}/chapters`, { number: 1, title: "Light" })).data;
const c2 = (await call("POST", `/api/books/${book.id}/chapters`, { number: 2, title: "Sound" })).data;
r = await call("POST", `/api/books/${book.id}/chapters`, { number: 1, title: "dup" });
check("duplicate chapter number rejected", r.status === 409);

const sections = [
  { title: "Section A", type: "MCQ", count: 2, marksEach: 1, instructions: "" },
  { title: "Section B", type: "SHORT", count: 2, marksEach: 2, instructions: "" },
];
r = await call("POST", "/api/blueprints", { name: "bad", bookId: book.id, examType: "QUARTERLY", durationMin: 60, sections, chapters: [{ chapterId: c1.id, marks: 5 }] });
check("blueprint with mismatched totals rejected", r.status === 400, JSON.stringify(r));
r = await call("POST", "/api/blueprints", { name: "BP", bookId: book.id, examType: "HALF_YEARLY", durationMin: 90, sections, chapters: [{ chapterId: c1.id, marks: 3 }, { chapterId: c2.id, marks: 3 }] });
check("valid blueprint created", r.status === 200 && r.data.sections.length === 2, JSON.stringify(r));
const bp = r.data;
const secA = bp.sections.find((s) => s.title === "Section A");
const secB = bp.sections.find((s) => s.title === "Section B");

const mk = async (type, chapterId, text, extra = {}) =>
  (await call("POST", "/api/questions", { bookId: book.id, chapterId, type, text, options: type === "MCQ" ? ["a", "b"] : [], answer: type === "MCQ" ? "A" : "", ...extra })).data;
const m1 = await mk("MCQ", c1.id, "मुख्य प्रश्न 1");
const m2 = await mk("MCQ", c2.id, "MCQ 2");
const m3 = await mk("MCQ", c2.id, "MCQ 3");
const s1 = await mk("SHORT", c1.id, "Short 1", { spaceMm: 20 });
const s2 = await mk("SHORT", c1.id, "Short 2");
const s3 = await mk("SHORT", c2.id, "Short 3");

r = await call("POST", "/api/questions", { bookId: book.id, chapterId: c1.id, type: "MCQ", text: "too few options", options: ["only one"] });
check("MCQ with <2 options rejected", r.status === 400);

const paper = (await call("POST", "/api/papers", { title: "Term 1", blueprintId: bp.id, layout: "BOOKLET", schoolName: "DPS" })).data;
const add = (sectionId, questionId) => call("POST", `/api/papers/${paper.id}/questions`, { sectionId, questionId });

r = await add(secA.id, s1.id);
check("wrong question type for section rejected", r.status === 409 && /only accepts/.test(r.data.error), JSON.stringify(r));
r = await add(secA.id, m1.id);
check("valid question added", r.status === 200 && r.data.progress.usedMarks === 1, JSON.stringify(r));
r = await add(secA.id, m1.id);
check("same question twice rejected", r.status === 409);
r = await add(secA.id, m2.id);
check("section A filled", r.status === 200 && r.data.progress.sections.find((s) => s.id === secA.id).filled === 2);
r = await add(secA.id, m3.id);
check("overfilling a section rejected", r.status === 409 && /full/.test(r.data.error), JSON.stringify(r));
r = await add(secB.id, s1.id);
check("short 1 (chapter 1) added", r.status === 200);

// Test replace question
const itemToReplace = r.data.items.find((i) => i.question.id === s1.id);
r = await call("PATCH", `/api/papers/${paper.id}/questions/${itemToReplace.id}`, { replaceWithQuestionId: s2.id });
check("replace question with sibling chapter question succeeds", r.status === 200 && r.data.items.some((i) => i.question.id === s2.id));
const replacedItem = r.data.items.find((i) => i.question.id === s2.id);

// Test edit question with FORK_COPY
r = await call("PUT", `/api/papers/${paper.id}/questions/${replacedItem.id}`, {
  mode: "FORK_COPY",
  question: { bookId: book.id, chapterId: c1.id, type: "SHORT", text: "Custom Forked Text for Exam", options: [], answer: "Forked Answer", difficulty: "EASY", spaceMm: 25 },
});
check("fork and edit question in paper succeeds", r.status === 200 && r.data.items.some((i) => i.question.text === "Custom Forked Text for Exam"));
const forkedItem = r.data.items.find((i) => i.question.text === "Custom Forked Text for Exam");
// Verify original question in bank still has its original text
const origQ = (await call("GET", `/api/questions`)).data.find((q) => q.id === s2.id);
check("original question in bank is untouched after fork", origQ && origQ.text === "Short 2");

// Test edit question with UPDATE_MASTER
r = await call("PUT", `/api/papers/${paper.id}/questions/${forkedItem.id}`, {
  mode: "UPDATE_MASTER",
  question: { bookId: book.id, chapterId: c1.id, type: "SHORT", text: "Updated Master Text", options: [], answer: "Updated Answer", difficulty: "HARD", spaceMm: 30 },
});
check("update master question in paper succeeds", r.status === 200 && r.data.items.some((i) => i.question.text === "Updated Master Text"));

r = await call("PATCH", `/api/papers/${paper.id}`, { status: "FINAL" });
check("cannot finalise an incomplete paper", r.status === 409);

r = await add(secB.id, s3.id);
check("final slot filled -> paper matches blueprint", r.status === 200 && r.data.progress.complete);

r = await call("PATCH", `/api/papers/${paper.id}`, { status: "FINAL" });
check("complete paper can be finalised", r.status === 200 && r.data.status === "FINAL");

r = await call("DELETE", `/api/papers/${paper.id}/questions/${r.data.items[0].id}`);
check("finalised paper rejects edits", r.status === 409);

r = await call("POST", `/api/papers/${paper.id}/autofill`);
check("finalised paper rejects autofill", r.status === 409);

// Test Smart Auto-Fill on a fresh empty paper
const pAuto = (await call("POST", "/api/papers", { title: "Auto-Fill Paper", blueprintId: bp.id, layout: "BOOKLET", schoolName: "Springdales" })).data;
r = await call("POST", `/api/papers/${pAuto.id}/autofill`);
check("smart autofill assembles complete paper matching blueprint", r.status === 200 && r.data.addedCount === 4 && r.data.paper.progress.complete);

// Repeated autofill on a complete paper adds 0 questions
r = await call("POST", `/api/papers/${pAuto.id}/autofill`);
check("repeated autofill on complete paper adds 0 questions", r.status === 200 && r.data.addedCount === 0);

// Test Internal Choice ("OR") Linking
const pAutoView = (await call("GET", `/api/papers/${pAuto.id}`)).data;
const shortItem = pAutoView.items.find((i) => i.question.type === "SHORT");
r = await call("PATCH", `/api/papers/${pAuto.id}/questions/${shortItem.id}`, { orQuestionId: shortItem.question.id });
check("rejects identical question as alternate", r.status === 400);

const altQ = await mk("SHORT", c2.id, "Alternate Short Question");
r = await call("PATCH", `/api/papers/${pAuto.id}/questions/${shortItem.id}`, { orQuestionId: altQ.id });
check("linking alternate (OR) choice succeeds", r.status === 200 && r.data.items.find((i) => i.id === shortItem.id)?.orQuestion?.id === altQ.id);

r = await call("PATCH", `/api/papers/${pAuto.id}/questions/${shortItem.id}`, { orQuestionId: null });
check("unlinking alternate choice succeeds", r.status === 200 && r.data.items.find((i) => i.id === shortItem.id)?.orQuestion === null);

// Test board standard exam header fields
r = await call("PATCH", `/api/papers/${pAuto.id}`, {
  paperSet: "Set A",
  subjectCode: "086",
  generalInstructions: "1. All questions are compulsory.\n2. No calculators.",
});
check("updating paperSet, subjectCode, generalInstructions succeeds", r.status === 200 && r.data.paperSet === "Set A" && r.data.subjectCode === "086" && r.data.generalInstructions.includes("compulsory"));

// Test Parallel Set Generation (Set A -> Set B with shuffled questions and MCQ options)
r = await call("POST", `/api/papers/${pAuto.id}/duplicate-set`, {
  targetSet: "SET B",
  shuffleQuestions: true,
  shuffleMcqOptions: true,
});
check("duplicate parallel set succeeds and returns complete paper", r.status === 200 && r.data.paper.paperSet === "SET B" && r.data.paper.progress.complete, JSON.stringify(r));
const pSetB = r.data.paper;
check("parallel set has matching total questions", pSetB.items.length === 4);

// Test solutions page for parallel set renders with 200
const solSetBRes = await fetch(`${base}/papers/${pSetB.id}/solutions`, { headers: { cookie } });
check("parallel set B solutions page renders with 200", solSetBRes.status === 200);

// Test Bulk Question Import
r = await call("POST", "/api/questions/bulk", {
  bookId: book.id,
  chapterId: c1.id,
  questions: [
    {
      type: "MCQ",
      text: "What is the speed of light in vacuum $c$?",
      options: ["$3 \\times 10^8\\text{ m/s}$", "$3 \\times 10^6\\text{ m/s}$", "$3 \\times 10^4\\text{ m/s}$", "Zero"],
      answer: "A",
      difficulty: "EASY",
      spaceMm: 0,
    },
    {
      type: "SHORT",
      text: "State Snell's law of refraction: $\\frac{\\sin i}{\\sin r} = \\mu$.",
      answer: "The ratio of sine of angle of incidence to sine of angle of refraction is a constant.",
      difficulty: "MEDIUM",
      spaceMm: 20,
    },
  ],
});
check("bulk question import succeeds", r.status === 200 && r.data.count === 2, JSON.stringify(r));

// Test print preview and solution key page routes render with 200
const printRes = await fetch(`${base}/papers/${pAuto.id}/print`, { headers: { cookie } });
check("print preview page renders with 200", printRes.status === 200);

const solRes = await fetch(`${base}/papers/${pAuto.id}/solutions`, { headers: { cookie } });
check("teacher solutions / marking scheme page renders with 200", solRes.status === 200);

r = await call("PUT", `/api/questions/${m1.id}`, { bookId: book.id, chapterId: c1.id, type: "MCQ", text: "edited", options: ["a", "b"], answer: "A" });
check("question in a final paper can't be edited", r.status === 409);
r = await call("PUT", `/api/blueprints/${bp.id}`, { name: "renamed", bookId: book.id, examType: "ANNUAL", durationMin: 120, sections: [], chapters: [] });
check("blueprint with papers: only name/duration change, structure kept", r.status === 200 && r.data.name === "renamed" && r.data.sections.length === 2 && r.data.examType === "HALF_YEARLY", JSON.stringify(r.data));
r = await call("DELETE", `/api/blueprints/${bp.id}`);
check("blueprint in use can't be deleted", r.status === 409);
r = await call("DELETE", `/api/questions/${m1.id}`);
check("question in a paper can't be deleted", r.status === 409);

// Upload + traversal guard
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const fd = new FormData();
fd.append("file", new Blob([png], { type: "image/png" }), "x.png");
let up = await fetch(base + "/api/uploads", { method: "POST", headers: { cookie }, body: fd });
const upData = await up.json();
check("image upload works", up.status === 200 && /\.png$/.test(upData.name), JSON.stringify(upData));
const got = await fetch(`${base}/api/uploads/${upData.name}`, { headers: { cookie } });
check("uploaded image is served as image/png", got.status === 200 && got.headers.get("content-type") === "image/png");
const bad = await fetch(`${base}/api/uploads/..%2F..%2F.env`, { headers: { cookie } });
check("path traversal is blocked", bad.status === 404, bad.status);
const notImg = new FormData();
notImg.append("file", new Blob(["hello"], { type: "text/plain" }), "x.txt");
up = await fetch(base + "/api/uploads", { method: "POST", headers: { cookie }, body: notImg });
check("non-image upload rejected", up.status === 400);

r = await call("POST", "/api/auth/login", { email, password: "nope" }, { auth: false });
check("wrong password rejected", r.status === 401);

console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
