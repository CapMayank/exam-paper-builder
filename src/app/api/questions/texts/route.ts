import { createHash } from "node:crypto";
import { HttpError, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { VARIANT_MARKER } from "@/lib/questionWrite";
import type { QuestionText } from "@/lib/types";

const CACHE_CONTROL = "private, no-cache";

function ifNoneMatchMatches(header: string | null, etag: string): boolean {
  if (!header) return false;
  for (const part of header.split(",")) {
    const token = part.trim();
    if (!token) continue;
    if (token === "*") return true;
    const normalized = token.startsWith("W/") ? token.slice(2).trim() : token;
    if (normalized === etag) return true;
  }
  return false;
}

export const GET = route(async (req) => {
  const bookId = new URL(req.url).searchParams.get("bookId")?.trim();
  if (!bookId) {
    throw new HttpError(400, "Query parameter 'bookId' is required.");
  }

  const rows: QuestionText[] = await prisma.question.findMany({
    where: {
      bookId,
      NOT: { subpartsJson: { contains: VARIANT_MARKER } },
    },
    select: {
      id: true,
      type: true,
      chapterId: true,
      text: true,
    },
    orderBy: { id: "asc" },
  });

  const payload = JSON.stringify(rows);
  const etag = `"${createHash("sha1").update(payload).digest("hex")}"`;

  if (ifNoneMatchMatches(req.headers.get("if-none-match"), etag)) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": CACHE_CONTROL },
    });
  }

  return Response.json(rows, {
    headers: {
      ETag: etag,
      "Cache-Control": CACHE_CONTROL,
    },
  });
});
