import { createHash } from "node:crypto";
import { HttpError, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { VARIANT_MARKER } from "@/lib/questionWrite";
import type { QuestionText } from "@/lib/types";

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

  if (req.headers.get("if-none-match")?.trim() === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return Response.json(rows, {
    headers: {
      ETag: etag,
      "Cache-Control": "private, no-cache",
    },
  });
});
