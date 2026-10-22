import { HttpError, route } from "@/lib/api";
import {
  findEligibleDiagrams,
  saveDiagramToUploads,
  searchCuratedDiagrams,
  searchWikimediaEducationalDiagrams,
  type DiagramCandidate,
} from "@/lib/diagram-search";
import { CURATED_DIAGRAMS } from "@/lib/diagram-registry";

export const POST = route(async (req) => {
  const body = await req.json().catch(() => ({}));
  const {
    action = "search",
    query = "",
    subject = "",
    chapter = "",
    questionText = "",
    requireUnlabelled = false,
    diagramId,
    downloadUrl,
    svgContent,
  } = body as {
    action?: "search" | "import";
    query?: string;
    subject?: string;
    chapter?: string;
    questionText?: string;
    requireUnlabelled?: boolean;
    diagramId?: string;
    downloadUrl?: string;
    svgContent?: string;
  };

  // Action: Import selected diagram into local uploads
  if (action === "import") {
    let savedFileName = "";

    // If diagramId is from Curated diagrams
    if (diagramId && !svgContent && !downloadUrl) {
      const match = CURATED_DIAGRAMS.find((d) => d.id === diagramId);
      if (match) {
        savedFileName = await saveDiagramToUploads({ svgContent: match.svg });
      } else {
        throw new HttpError(404, "Curated diagram not found");
      }
    } else if (svgContent) {
      savedFileName = await saveDiagramToUploads({ svgContent });
    } else if (downloadUrl) {
      savedFileName = await saveDiagramToUploads({ downloadUrl });
    } else {
      throw new HttpError(400, "diagramId, svgContent, or downloadUrl must be provided for import");
    }

    return {
      success: true,
      imagePath: savedFileName,
    };
  }

  // Action: Search diagrams (Curated NCERT + Wikimedia Educational)
  const effectiveQuery = (query || chapter || "").trim();
  const candidates = await findEligibleDiagrams({
    query: effectiveQuery,
    subject,
    chapter,
    questionText,
    requireUnlabelled,
  });

  return {
    success: true,
    total: candidates.length,
    candidates,
  };
});

export const GET = route(async (req) => {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";
  const subject = searchParams.get("subject") || "";
  const chapter = searchParams.get("chapter") || "";
  const requireUnlabelled = searchParams.get("requireUnlabelled") === "true";

  const candidates = await findEligibleDiagrams({
    query,
    subject,
    chapter,
    requireUnlabelled,
  });

  return {
    success: true,
    total: candidates.length,
    candidates,
  };
});
