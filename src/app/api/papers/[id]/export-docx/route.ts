import { route } from "@/lib/api";
import { buildPaperDocx } from "@/lib/paperDocx";

export const GET = route(async (_req, params, user) => {
  const paperId = params.id;
  const url = new URL(_req.url);
  const isMarkingScheme = url.searchParams.get("markingScheme") === "true" || url.searchParams.get("type") === "solutions";

  const { buffer, safeFilename } = await buildPaperDocx(paperId, isMarkingScheme, user);

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
    },
  });
});
