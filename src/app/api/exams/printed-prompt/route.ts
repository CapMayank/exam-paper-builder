import { route } from "@/lib/api";
import { todayIST } from "@/lib/exams/dates";
import { pendingPrintSlotsForPaper } from "@/lib/exams/server";

/** GET ?paperId=: exam slots this paper fills that are not marked printed and are today or later. */
export const GET = route(async (req) => {
  const paperId = new URL(req.url).searchParams.get("paperId") ?? "";
  return paperId ? pendingPrintSlotsForPaper(paperId, todayIST()) : [];
}, { roles: ["ADMIN", "EXAM_CELL"] });
