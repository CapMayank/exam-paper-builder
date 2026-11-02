// API check of the blueprint-role / passage-group / component / audit behaviour against a running server.
// Use a COPY of the database and an empty GEMINI_API_KEY (offline mode):
//   DATABASE_URL=file:/path/copy.db GEMINI_API_KEY= npx next start -p 3100
//   node scripts/e2e-blueprint.mjs http://localhost:3100
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

// The project's seed teacher account; run this against a copy of the database.
let r = await call("POST", "/api/auth/login", { email: "teacher@school.edu", password: "password123" }, { auth: false });
check("login with seed account", r.status === 200 && cookie.startsWith("epb_session="), JSON.stringify(r));

const book = (await call("POST", "/api/books", { title: "First Flight", subject: "English", className: "Class 10" })).data;
const ch = (await call("POST", `/api/books/${book.id}/chapters`, { number: 1, title: "A Letter to God" })).data;

const components = [
  { key: "reading", title: "Reading", marks: 4, role: "PASSAGE" },
  { key: "grammar", title: "Grammar", marks: 1, role: "GRAMMAR" },
];
r = await call("POST", "/api/blueprints", {
  name: "Passage test",
  bookId: book.id,
  examType: "ANNUAL",
  durationMin: 180,
  verificationStatus: "SOURCE_CITED",
  sourceRef: "https://mpbse.nic.in/MarksScheme_2026_27.pdf (p.22)",
  componentsJson: JSON.stringify(components),
  chapters: [{ chapterId: ch.id, marks: 5 }],
  sections: [
    { title: "Section A: Reading", type: "MCQ", count: 4, marksEach: 1, role: "PASSAGE", groupKey: "reading.unseen" },
    { title: "Section B: Objective", type: "MCQ", count: 1, marksEach: 1, role: "STANDARD" },
  ],
});
check("blueprint with roles + components saves", r.status === 200 || r.status === 201, JSON.stringify(r.data).slice(0, 200));
const bp = r.data;
check("section role persisted", bp.sections?.[0]?.role === "PASSAGE" && bp.sections?.[0]?.groupKey === "reading.unseen", JSON.stringify(bp.sections?.[0]));
check("verification metadata persisted", bp.verificationStatus === "SOURCE_CITED" && bp.sourceRef.includes("mpbse.nic.in"), `${bp.verificationStatus}`);

// editor-style round trip (PUT) must keep the role
const put = await call("PUT", `/api/blueprints/${bp.id}`, {
  name: bp.name, bookId: book.id, examType: "ANNUAL", durationMin: 180,
  chapters: [{ chapterId: ch.id, marks: 5 }],
  sections: bp.sections.map((s) => ({ id: s.id, title: s.title, instructions: s.instructions, type: s.type, count: s.count, marksEach: s.marksEach, role: s.role, groupKey: s.groupKey })),
});
check("blueprint update keeps role", put.status === 200 && put.data.sections[0].role === "PASSAGE", JSON.stringify(put).slice(0, 200));

const paper = (await call("POST", "/api/papers", { title: "P", blueprintId: bp.id, layout: "PAGE", schoolName: "S" })).data;
const secA = bp.sections[0].id;
const secB = bp.sections[1].id;
const mk = async (text, extra = {}) =>
  (await call("POST", "/api/questions", { bookId: book.id, chapterId: ch.id, type: "MCQ", text, options: ["a", "b", "c", "d"], answer: "a", ...extra })).data;
const standalone = await mk("Which is a noun?");
const child = await mk("According to the passage, who wrote the letter?", { passageGroupId: "unseen-1" });
check("passageGroupId stored on question", child.passageGroupId === "unseen-1", JSON.stringify(child));

r = await call("POST", `/api/papers/${paper.id}/questions`, { sectionId: secA, questionId: standalone.id });
check("stand-alone MCQ rejected from passage section", r.status === 409, `${r.status} ${JSON.stringify(r.data)}`);
r = await call("POST", `/api/papers/${paper.id}/questions`, { sectionId: secB, questionId: child.id });
check("passage MCQ rejected from objective section (the original bug)", r.status === 409, `${r.status} ${JSON.stringify(r.data)}`);
r = await call("POST", `/api/papers/${paper.id}/questions`, { sectionId: secA, questionId: child.id });
check("passage MCQ accepted in passage section", r.status === 200 || r.status === 201, `${r.status} ${JSON.stringify(r.data)}`);
r = await call("POST", `/api/papers/${paper.id}/questions`, { sectionId: secB, questionId: standalone.id });
check("stand-alone MCQ accepted in objective section", r.status === 200 || r.status === 201, `${r.status}`);

// component tagging
const view = (await call("GET", `/api/papers/${paper.id}`)).data;
const item = view.items.find((i) => i.question.id === child.id);
r = await call("PATCH", `/api/papers/${paper.id}/questions/${item.id}`, { componentKey: "bogus" });
check("unknown component rejected", r.status === 400, `${r.status}`);
r = await call("PATCH", `/api/papers/${paper.id}/questions/${item.id}`, { componentKey: "reading" });
check("component tag accepted", r.status === 200, `${r.status}`);
const v2 = (await call("GET", `/api/papers/${paper.id}`)).data;
check("component tag persisted on item", v2.items.find((i) => i.id === item.id)?.componentKey === "reading");
check("component implication reported", v2.implications.some((i) => String(i.code).startsWith("COMPONENT_")), JSON.stringify(v2.implications.map((i) => i.code)));

// audit must not certify a paper nobody reviewed
r = await call("POST", "/api/ai/audit-paper", { paperId: paper.id });
check("audit without model is INCONCLUSIVE or FAIL, never PASS", r.status === 200 && ["INCONCLUSIVE", "FAIL"].includes(r.data?.data?.status), `${r.status} ${r.data?.data?.status}`);
check("audit reports isMock when model did not run", r.data?.isMock === true);

console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
