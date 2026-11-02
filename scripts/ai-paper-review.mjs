// Generates a whole paper with the live model through the real API and writes it out as plain text for review.
//   node scripts/ai-paper-review.mjs http://localhost:3100 "<blueprint name filter>" out.txt
// Use a server running on a COPY of the database: it creates a paper.
import { writeFileSync } from "node:fs";

const [base = "http://localhost:3100", filter = "", out = "paper.txt"] = process.argv.slice(2);
let cookie = "";
async function call(method, path, json) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(json ? { "Content-Type": "application/json" } : {}), cookie: cookie + "; epb_view=" + encodeURIComponent("stream=ALL&other=1") },
    body: json ? JSON.stringify(json) : undefined,
  });
  const sc = res.headers.get("set-cookie");
  if (sc && sc.startsWith("epb_session")) cookie = sc.split(";")[0];
  return { status: res.status, data: await res.json().catch(() => null) };
}

const login = await call("POST", "/api/auth/login", { email: "teacher@school.edu", password: "password123" });
if (login.status !== 200) throw new Error("login failed");

const bps = (await call("GET", "/api/blueprints?session=ALL")).data ?? [];
const bp = bps.find((b) => `${b.name} ${b.book?.className} ${b.book?.subject}`.toLowerCase().includes(filter.toLowerCase()));
if (!bp) throw new Error(`no blueprint matches "${filter}"`);
const language = bp.language && bp.language !== "en" ? bp.language : /sanskrit/i.test(bp.book?.subject) ? "sa" : /hindi|social|science|math/i.test(bp.book?.subject) ? "hi" : "en";
const paper = (await call("POST", "/api/papers", { title: `review ${bp.name}`, blueprintId: bp.id, layout: "PAGE", schoolName: "School", language })).data;
const plan = (await call("GET", `/api/papers/${paper.id}/ai-plan`)).data.plan;

const log = [];
for (const sec of plan.sections) {
  if (!sec.slots.length) continue;
  const body = {
    sectionId: sec.sectionId, sectionTitle: sec.sectionTitle, sectionType: sec.sectionType, sectionInstructions: sec.sectionInstructions,
    marksEach: sec.marksEach, language: plan.language, difficulty: "BALANCED", model: process.env.MODEL || "gemini-flash-latest", generateDiagrams: false, slots: sec.slots,
  };
  let gen = await call("POST", `/api/papers/${paper.id}/ai-generate-section`, body);
  if (gen.status === 502) { await new Promise((r) => setTimeout(r, 20000)); gen = await call("POST", `/api/papers/${paper.id}/ai-generate-section`, body); }
  if (gen.status !== 200) { log.push(`!! ${sec.sectionTitle}: ${gen.status} ${JSON.stringify(gen.data).slice(0, 300)}`); continue; }
  const commit = await call("POST", `/api/papers/${paper.id}/ai-commit-section`, { sectionId: sec.sectionId, questions: gen.data.questions, isMock: gen.data.isMock });
  if (commit.status >= 300) log.push(`!! commit ${sec.sectionTitle}: ${commit.status} ${JSON.stringify(commit.data).slice(0, 300)}`);
  process.stdout.write(".");
}

const view = (await call("GET", `/api/papers/${paper.id}`)).data;
const lines = [`${bp.book?.className} ${bp.book?.subject} — ${bp.name}`, `marks ${view.progress?.usedMarks}/${view.progress?.totalMarks}`, ...log, ""];
let n = 0;
for (const s of view.blueprint.sections) {
  lines.push(`\n### ${s.title} [${s.type} × ${s.count}, ${s.marksEach} each]`);
  for (const it of view.items.filter((i) => i.sectionId === s.id)) {
    const q = it.question;
    lines.push(`Q${++n} {${q.chapter?.title ?? q.chapterId}} ${q.text}`);
    if (q.options?.length) lines.push(`   options: ${q.options.join(" | ")}`);
    for (const p of q.subparts ?? []) lines.push(`   ${p.label} ${p.text} [${p.marks}]${p.options?.length ? " {" + p.options.join(" | ") + "}" : ""}`);
    lines.push(`   ans: ${String(q.answer ?? "").replace(/\s+/g, " ").slice(0, 300)}`);
    if (it.orQuestion) lines.push(`   OR {${it.orQuestion.chapter?.title ?? ""}} ${it.orQuestion.text}`);
  }
}
const issues = (view.implications ?? view.validation?.issues ?? []).map((i) => `- [${i.severity}] ${i.message}`);
lines.push("\nValidation:", ...(issues.length ? issues : ["(none)"]));
writeFileSync(out, lines.join("\n"));
console.log(`\nwrote ${out}`);
