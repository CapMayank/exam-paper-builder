// One-time sweep after the question-type update:
//   1. bank questions saved under a general type get the closer type they really are (an unseen passage saved as a
//      Short answer with sub-parts, a letter saved as a Long answer...). Questions whose paper depends on their type
//      are listed and left alone.
//   2. blueprint sections (class 8 and below) saved with a stored type list get the school's newer forms added
//      (Reference to context, Grammar, Draw, Map work...). Nothing an admin kept or added is removed.
//
//   npx tsx scripts/retype-questions.ts            list what would change (nothing is written)
//   npx tsx scripts/retype-questions.ts --apply    make the changes (run `npm run backup` first)
//
// The server has no tsx: bundle it with esbuild into one .mjs (keeping @prisma/client external) and run that with node.
import { PrismaClient } from "@prisma/client";
import { widenedAllowedTypes } from "../src/lib/allowedTypesBackfill";
import { planRetypes } from "../src/lib/retypePlan";
import { typeLabel } from "../src/lib/sectionTypes";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function questions() {
  const plan = await planRetypes(prisma);
  const todo = plan.filter((c) => !c.keptBecause);
  const kept = plan.filter((c) => c.keptBecause);
  const line = (c: (typeof plan)[number]) =>
    `  ${typeLabel(c.from)} → ${typeLabel(c.to)}  (${c.reason})\n    ${c.where}\n    "${c.text.replace(/\s+/g, " ").slice(0, 90)}"`;

  console.log(`QUESTIONS: ${plan.length} look mistyped: ${todo.length} to change, ${kept.length} left as they are.\n`);
  if (todo.length) console.log(`To change:\n${todo.map(line).join("\n")}\n`);
  if (kept.length) console.log(`Left as they are:\n${kept.map((c) => `${line(c)}\n    kept: ${c.keptBecause}`).join("\n")}\n`);
  if (apply) await prisma.$transaction(todo.map((c) => prisma.question.update({ where: { id: c.id }, data: { type: c.to } })));
  return todo.length;
}

async function blueprints() {
  const sections = await prisma.blueprintSection.findMany({
    select: {
      id: true, title: true, type: true, count: true, marksEach: true, allowedTypesJson: true, role: true, slotPlanJson: true,
      blueprint: { select: { name: true, book: { select: { className: true, subject: true } } } },
    },
  });
  const todo = sections.flatMap((s) => {
    const next = widenedAllowedTypes(s, s.blueprint.book);
    return next ? [{ s, next, added: next.filter((t) => !JSON.parse(s.allowedTypesJson).includes(t)) }] : [];
  });
  console.log(`BLUEPRINT SECTIONS: ${todo.length} of ${sections.length} get newer question types added.`);
  for (const { s, added } of todo) console.log(`  ${s.blueprint.name} · ${s.title} (${s.marksEach} marks): + ${added.map(typeLabel).join("; ")}`);
  console.log("");
  if (apply) {
    await prisma.$transaction(todo.map(({ s, next }) => prisma.blueprintSection.update({ where: { id: s.id }, data: { allowedTypesJson: JSON.stringify(next) } })));
  }
  return todo.length;
}

async function main() {
  const q = await questions();
  const b = await blueprints();
  console.log(apply ? `Changed ${q} question type(s) and widened ${b} blueprint section(s).` : "Dry run: nothing was changed. Run with --apply to make these changes.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
