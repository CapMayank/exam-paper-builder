import { body, route } from "@/lib/api";
import { assertBlueprintValid, blueprintInclude, loadBlueprint } from "@/lib/blueprints";
import { createBlueprint } from "@/lib/blueprintWrite";
import { assertCanManageBook } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { blueprintSchema } from "@/lib/schemas";
import { WORKSHEET_MODE } from "@/lib/constants";
import { ensureCurriculumSeeded } from "@/lib/curriculumInit";

import { keepActive, scopeFromRequest } from "@/lib/viewScope";

export const GET = route(async (req) => {
  await ensureCurriculumSeeded().catch((err) => {
    console.error("❌ Failed to ensure curriculum is seeded:", err);
  });
  const url = new URL(req.url);
  const session = url.searchParams.get("session");
  const notWorksheet = { NOT: { curriculumMode: WORKSHEET_MODE } };
  const where =
    session && session !== "ALL"
      ? { ...notWorksheet, academicSession: { in: [session.replace(/[–—]/g, "-"), session.replace(/-/g, "–")] } }
      : notWorksheet;
  const list = await prisma.blueprint.findMany({ where, orderBy: { createdAt: "desc" }, include: blueprintInclude });
  return keepActive(list, (b) => b.book, scopeFromRequest(req));
});

export const POST = route(async (req, _params, user) => {
  const input = await body(req, blueprintSchema);
  await assertCanManageBook(user, input.bookId);
  input.chapters = input.chapters.filter((c) => c.marks > 0);
  await assertBlueprintValid(input);

  return loadBlueprint(await createBlueprint(input));
});
