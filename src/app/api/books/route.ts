import { body, route } from "@/lib/api";
import { ensureClassAndSubject } from "@/lib/classes";
import { prisma } from "@/lib/prisma";
import { bookSchema } from "@/lib/schemas";

export const GET = route(async (req) => {
  const url = new URL(req.url);
  const session = url.searchParams.get("session");
  const where = session && session !== "ALL" ? { academicSession: session.replace(/-/g, "–") } : undefined;
  return prisma.book.findMany({
    where,
    orderBy: [{ className: "asc" }, { subject: "asc" }, { title: "asc" }],
    include: { chapters: { orderBy: { number: "asc" } }, _count: { select: { questions: true, blueprints: true } } },
  });
});

export const POST = route(async (req) => {
  const data = await body(req, bookSchema);
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
