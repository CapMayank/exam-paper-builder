import { HttpError, route } from "@/lib/api";
import { KEY_CHECK_TYPES, keysAgree, type KeyCheckReport, type KeyDisagreement } from "@/lib/answerKeyCheck";
import { generateAnswerKeyWithGemini } from "@/lib/gemini";
import { canModifyPaper } from "@/lib/papers";
import { prisma } from "@/lib/prisma";

const fields = { id: true, type: true, text: true, optionsJson: true, answer: true } as const;

function parseOptions(json: string): string[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.map((o) => String(o)) : [];
  } catch {
    return [];
  }
}

/**
 * Independent check of the paper's objective answer keys (stage 3 of AI generation): every MCQ, assertion-reason,
 * true/false, fill-in-the-blank and match question that has a key is solved again by the model without seeing
 * the key, and each disagreement is reported. Nothing is written: a teacher decides which one is right.
 */
export const POST = route(async (req, { id }, user) => {
  const paper = await prisma.paper.findUnique({
    where: { id },
    select: {
      createdById: true,
      blueprint: { select: { book: { select: { className: true, subject: true } } } },
      items: {
        orderBy: { position: "asc" },
        select: {
          position: true,
          section: { select: { id: true, title: true, marksEach: true, position: true } },
          question: { select: fields },
          orQuestion: { select: fields },
        },
      },
    },
  });
  if (!paper) throw new HttpError(404, "Paper not found");
  if (!canModifyPaper(user, { createdById: paper.createdById, blueprint: paper.blueprint })) {
    throw new HttpError(403, "Only the paper's creator, a teacher assigned to this class and subject, or an Administrator can check its answer key.");
  }

  // ?sectionId=… checks one section only (after inserting into it), so a whole paper is not re-solved each time
  const onlySection = new URL(req.url).searchParams.get("sectionId");

  // number questions within their section the way the paper prints them
  const items = [...paper.items].sort((a, b) => a.section.position - b.section.position || a.position - b.position);
  const seenInSection = new Map<string, number>();
  const candidates = items.flatMap((it) => {
    const n = (seenInSection.get(it.section.title) ?? 0) + 1;
    seenInSection.set(it.section.title, n);
    if (onlySection && it.section.id !== onlySection) return [];
    const list = [
      { q: it.question, label: `${it.section.title} · Q${n}` },
      ...(it.orQuestion ? [{ q: it.orQuestion, label: `${it.section.title} · Q${n} (OR)` }] : []),
    ];
    return list
      .filter(({ q }) => KEY_CHECK_TYPES.has(q.type) && q.answer.trim())
      .map(({ q, label }) => ({ ...q, options: parseOptions(q.optionsJson), label, marks: it.section.marksEach }));
  });

  const report: KeyCheckReport = { checked: 0, disagreements: [], unchecked: 0 };
  if (candidates.length === 0) return report;

  const customKey = req.headers.get("x-gemini-api-key");
  let lastError = "";
  for (let start = 0; start < candidates.length; start += 10) {
    const batch = candidates.slice(start, start + 10);
    // short keys: the model copies "q3" back reliably
    const res = await generateAnswerKeyWithGemini({
      className: paper.blueprint.book.className,
      subject: paper.blueprint.book.subject,
      items: batch.map((q, i) => ({ id: `q${i + 1}`, type: q.type, text: q.text, options: q.options, marks: q.marks, main: true, subparts: [] })),
      apiKey: customKey,
    });
    if (!res.success || res.isMock) {
      lastError = res.error || "AI is unavailable right now.";
      report.unchecked += batch.length;
      continue;
    }
    const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.answers) ? res.data.answers : [];
    const solved = new Map<string, string>();
    for (const a of list) {
      const key = a && (typeof a.id === "string" || typeof a.id === "number") ? String(a.id).trim().toLowerCase() : "";
      if (typeof a?.answer === "string") solved.set(key.startsWith("q") ? key : `q${key}`, a.answer);
    }
    batch.forEach((q, i) => {
      const solverAnswer = solved.get(`q${i + 1}`) ?? "";
      const agree = keysAgree(q.type, q.options, q.answer, solverAnswer);
      if (agree === null) {
        report.unchecked++;
        return;
      }
      report.checked++;
      if (!agree) {
        const d: KeyDisagreement = {
          questionId: q.id,
          label: q.label,
          type: q.type,
          text: q.text.replace(/\s+/g, " ").trim().slice(0, 240),
          storedAnswer: q.answer.trim(),
          solverAnswer: solverAnswer.trim(),
        };
        report.disagreements.push(d);
      }
    });
  }

  if (report.checked === 0 && lastError) throw new HttpError(502, `The answer-key check could not run: ${lastError}`);
  return report;
});
