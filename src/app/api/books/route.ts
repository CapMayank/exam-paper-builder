import { body, route } from "@/lib/api";
import { ensureClassAndSubject } from "@/lib/classes";
import { assertCanManageScope } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { bookSchema } from "@/lib/schemas";

import { keepActive, scopeFromRequest } from "@/lib/viewScope";

export const GET = route(async (req) => {
  const url = new URL(req.url);
  const session = url.searchParams.get("session");
  const where =
    session && session !== "ALL"
      ? { academicSession: { in: [session.replace(/[–—]/g, "-"), session.replace(/-/g, "–")] } }
      : undefined;
  const books = await prisma.book.findMany({
    where,
    orderBy: [{ className: "asc" }, { subject: "asc" }, { title: "asc" }],
    include: { chapters: { orderBy: { number: "asc" } }, _count: { select: { questions: true, blueprints: true } } },
  });
  return keepActive(books, (b) => b, scopeFromRequest(req));
});

export const POST = route(async (req, _params, user) => {
  const data = await body(req, bookSchema);
  assertCanManageScope(user, data);
  const normalizedData = {
    ...data,
    academicSession: (data.academicSession || "2025–26").replace(/-/g, "–"),
  };
  await ensureClassAndSubject(normalizedData.academicSession, normalizedData.className, normalizedData.subject);
  return prisma.book.create({
    data: normalizedData,
    include: { chapters: true, _count: { select: { questions: true, blueprints: true } } },
  });
});
