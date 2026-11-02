import "server-only";
import { questionSlotMarks } from "./blueprint";
import { allocateComponents, parseComponents } from "./languageComponents";
import { loadPaperView } from "./papers";
import { prisma } from "./prisma";

/**
 * Gives every question without a syllabus component a suggested one, so each component reaches exactly its
 * official marks. Questions the teacher already tagged keep their tag and use up that component's marks.
 * Returns how many questions were tagged (0 for blueprints without components).
 */
export async function suggestComponentsForPaper(paperId: string): Promise<number> {
  const paper = await loadPaperView(paperId);
  if (!paper) return 0;
  const components = parseComponents((paper.blueprint as { componentsJson?: string }).componentsJson);
  if (components.length === 0) return 0;

  const sectionById = new Map(paper.blueprint.sections.map((s) => [s.id, s]));
  const marksOf = (it: (typeof paper.items)[number]) =>
    questionSlotMarks(sectionById.get(it.sectionId) ?? { count: 1, marksEach: 1 }, it.question as never).marks;

  const claimed = new Map<string, number>();
  for (const it of paper.items) {
    if (it.componentKey) claimed.set(it.componentKey, (claimed.get(it.componentKey) ?? 0) + marksOf(it));
  }
  const remaining = components
    .map((c) => ({ ...c, marks: Math.max(0, c.marks - (claimed.get(c.key) ?? 0)) }))
    .filter((c) => c.marks > 0);
  const untagged = paper.items.filter((it) => !it.componentKey);
  const assignment = allocateComponents(
    untagged.map((it) => ({ id: it.id, marks: marksOf(it), type: it.question.type })),
    remaining,
  );
  for (const [itemId, key] of Object.entries(assignment)) {
    await prisma.paperQuestion.update({ where: { id: itemId }, data: { componentKey: key } });
  }
  if (Object.keys(assignment).length > 0) {
    await prisma.paper.update({ where: { id: paperId }, data: { updatedAt: new Date() } });
  }
  return Object.keys(assignment).length;
}
