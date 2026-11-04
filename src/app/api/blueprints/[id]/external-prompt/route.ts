import { HttpError, route } from "@/lib/api";
import { loadBlueprint } from "@/lib/blueprints";
import { buildExternalPaperPrompt } from "@/lib/externalPaperPrompt";
import { planPaperWithComponents } from "@/lib/paperAutogen";
import { assertCanManageScope } from "@/lib/papers";

/** A prompt to paste into another chat AI for a whole new paper on this blueprint. */
export const GET = route(async (req, { id }, user) => {
  const bp = await loadBlueprint(id);
  if (!bp) throw new HttpError(404, "Blueprint not found");
  assertCanManageScope(user, bp.book);
  if (bp.chapters.length === 0) {
    throw new HttpError(400, "This blueprint has no chapters. Add chapters and their marks to the blueprint first.");
  }

  const url = new URL(req.url);
  const plan = planPaperWithComponents({
    id: "",
    title: bp.name,
    academicSession: bp.academicSession,
    examType: bp.examType,
    subjectCode: bp.subjectCode,
    blueprint: bp,
    items: [],
  } as Parameters<typeof planPaperWithComponents>[0]);

  return buildExternalPaperPrompt({
    plan,
    academicSession: bp.academicSession,
    examType: bp.examType,
    subjectCode: bp.subjectCode,
    difficulty: url.searchParams.get("difficulty"),
    teacherFocus: url.searchParams.get("focus"),
  });
});
