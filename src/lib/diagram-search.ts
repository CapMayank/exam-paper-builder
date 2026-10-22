import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { CURATED_DIAGRAMS, type CuratedDiagram } from "./diagram-registry";
import { UPLOAD_DIR } from "./uploads";

export interface DiagramCandidate {
  id: string;
  title: string;
  subject?: string;
  source: "NCERT Curated" | "CBSE Official" | "Wikimedia Commons (Public Domain)" | "Wikimedia Commons" | "Figure Studio Vector" | string;
  license: string;
  previewUrl: string; // URL to render in thumbnail or SVG data URI
  downloadUrl?: string; // Direct image URL if external
  svgContent?: string; // SVG markup if curated
  hasUnlabelledCallouts: boolean;
  spoilerParts?: string[];
  eligibility: DiagramEligibility;
}

export interface DiagramEligibility {
  eligible: boolean;
  score: number; // 0 - 100
  status: "VERIFIED" | "NEEDS_MASKING" | "LOW_CONTRAST" | "OFF_TOPIC";
  reason: string;
  printContrast: "HIGH" | "MEDIUM" | "LOW";
  hasSpoilers: boolean;
  isCurated: boolean;
}

export interface QuestionContextForDiagram {
  questionText?: string;
  chapterTitle?: string;
  subject?: string;
  questionType?: string;
  isIdentificationQuestion?: boolean;
}

/**
 * Evaluates whether a diagram is eligible for a school examination paper.
 * Rigorously checks for:
 * 1. Syllabus relevance to the subject and chapter.
 * 2. High-contrast line art suitable for B&W photocopying / risographs.
 * 3. Question Spoiler Check: Identification questions must NOT have the answers written out directly on the figure.
 */
export function verifyDiagramEligibility(
  diagram: {
    title: string;
    subject?: string;
    tags?: string[];
    hasUnlabelledCallouts?: boolean;
    spoilerParts?: string[];
    mime?: string;
    isCurated?: boolean;
  },
  context?: QuestionContextForDiagram,
): DiagramEligibility {
  const isCurated = Boolean(diagram.isCurated);
  const qText = (context?.questionText || "").toLowerCase();
  const qTitle = (context?.chapterTitle || "").toLowerCase();
  const diagTitle = diagram.title.toLowerCase();

  // 1. Identification Check
  const isIdQ = Boolean(
    context?.isIdentificationQuestion ||
    qText.includes("identify") ||
    qText.includes("labeled part") ||
    qText.includes("label parts") ||
    qText.includes("name the part") ||
    qText.includes("marked as (a)") ||
    qText.includes("marked as a") ||
    qText.includes("part (a)")
  );

  let hasSpoilers = false;
  let status: DiagramEligibility["status"] = "VERIFIED";
  let score = isCurated ? 95 : 75;
  let printContrast: DiagramEligibility["printContrast"] = isCurated ? "HIGH" : "MEDIUM";
  let reason = isCurated
    ? "Verified NCERT standard curriculum line diagram, 100% print-ready."
    : "Educational line diagram from verified public repository.";

  // If question requires identifying parts:
  if (isIdQ) {
    if (diagram.hasUnlabelledCallouts) {
      score += 5;
      reason = "Verified exam-ready: Parts labeled with callout letters (A, B, C, D) without spoiling answers.";
    } else if (diagram.spoilerParts && diagram.spoilerParts.length > 0) {
      hasSpoilers = true;
      status = "NEEDS_MASKING";
      score = Math.max(40, score - 25);
      reason = "Contains text labels that may give away answers to identification questions. Open in Figure Studio to mask labels.";
    }
  }

  // Check relevance to subject & chapter
  if (qTitle && diagTitle) {
    const qTokens = qTitle.split(/\s+/).filter((w) => w.length > 3);
    const hasOverlap = qTokens.some((t) => diagTitle.includes(t) || (diagram.tags || []).some((tag) => tag.toLowerCase().includes(t)));
    if (!hasOverlap && !isCurated) {
      score = Math.max(30, score - 30);
      status = "OFF_TOPIC";
      reason = "Diagram title has low direct match with current chapter.";
    }
  }

  // Filter out noisy bitmap photographs
  if (diagram.mime && !diagram.mime.includes("svg") && !diagram.mime.includes("png")) {
    printContrast = "LOW";
    score = Math.max(25, score - 30);
    status = "LOW_CONTRAST";
    reason = "Format may contain photographic halftone noise unsuitable for black & white school exam printing.";
  }

  const eligible = score >= 60 && status !== "OFF_TOPIC";

  return {
    eligible,
    score,
    status,
    reason,
    printContrast,
    hasSpoilers,
    isCurated,
  };
}

/**
 * Searches the curated NCERT/CBSE educational diagram repository.
 */
export function searchCuratedDiagrams(params: {
  query?: string;
  subject?: string;
  chapter?: string;
  questionText?: string;
  requireUnlabelled?: boolean;
}): DiagramCandidate[] {
  const { query = "", subject = "", chapter = "", questionText = "", requireUnlabelled } = params;
  const rawTerms = `${query} ${subject} ${chapter} ${questionText}`.toLowerCase();
  const searchTokens = rawTerms
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const candidates: DiagramCandidate[] = [];

  for (const item of CURATED_DIAGRAMS) {
    // Subject filter
    if (subject && item.subject.toLowerCase() !== subject.toLowerCase()) {
      const subKey = subject.toLowerCase().slice(0, 4);
      if (!item.subject.toLowerCase().includes(subKey)) continue;
    }

    // Match scoring
    let matchScore = 0;
    const itemText = `${item.title} ${item.chapterKeywords.join(" ")} ${item.tags.join(" ")} ${item.description}`.toLowerCase();

    for (const token of searchTokens) {
      if (itemText.includes(token)) {
        matchScore += token.length > 4 ? 3 : 1;
      }
    }

    if (searchTokens.length === 0) {
      matchScore = 1; // Return all if no search terms provided
    }

    if (matchScore > 0) {
      if (requireUnlabelled && !item.hasUnlabelledCallouts) {
        continue;
      }

      const eligibility = verifyDiagramEligibility(
        {
          title: item.title,
          subject: item.subject,
          tags: item.tags,
          hasUnlabelledCallouts: item.hasUnlabelledCallouts,
          spoilerParts: item.spoilerParts,
          isCurated: true,
        },
        { questionText, chapterTitle: chapter, subject },
      );

      // Convert SVG to data URI for instant web preview
      const previewUrl = `data:image/svg+xml;utf8,${encodeURIComponent(item.svg)}`;

      candidates.push({
        id: item.id,
        title: item.title,
        subject: item.subject,
        source: item.source,
        license: item.license,
        previewUrl,
        svgContent: item.svg,
        hasUnlabelledCallouts: item.hasUnlabelledCallouts,
        spoilerParts: item.spoilerParts,
        eligibility,
      });
    }
  }

  // Sort by highest match & eligibility score
  return candidates.sort((a, b) => b.eligibility.score - a.eligibility.score);
}

/**
 * Searches Wikimedia Commons for public domain & creative commons educational diagrams.
 * Specifically filters for line-art diagrams, drawings, and SVGs suitable for exams.
 */
export async function searchWikimediaEducationalDiagrams(params: {
  query: string;
  subject?: string;
  limit?: number;
}): Promise<DiagramCandidate[]> {
  const { query, subject = "", limit = 8 } = params;
  if (!query || query.trim().length < 2) return [];

  // Craft strict educational line-art search query
  const cleanQ = query.trim().replace(/[^\w\s-]/g, "");
  const searchQuery = `${cleanQ} diagram (svg OR line art OR schematic) -photo -portrait -flag -stamp`;

  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=${limit}&gsrsearch=${encodeURIComponent(
    searchQuery,
  )}&prop=imageinfo&iiprop=url|size|mime|extmetadata`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ExamPaperBuilder/1.0 (Educational Exam Paper Generation System)",
        Accept: "application/json",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const json = await res.json();
    const pages = json.query?.pages;
    if (!pages) return [];

    const results: DiagramCandidate[] = [];

    for (const key of Object.keys(pages)) {
      const page = pages[key];
      const info = page.imageinfo?.[0];
      if (!info?.url) continue;

      const title = String(page.title || "")
        .replace(/^File:/i, "")
        .replace(/\.(svg|png|jpg|jpeg|webp)$/i, "")
        .replace(/_/g, " ");

      const mime = String(info.mime || "").toLowerCase();
      // Strictly filter for SVGs and PNG drawings
      if (!mime.includes("svg") && !mime.includes("png")) continue;

      const metadata = info.extmetadata || {};
      const license = metadata.LicenseShortName?.value || "Creative Commons";
      const description = metadata.ImageDescription?.value || "";

      // Discard files containing photograph tells
      const lowerMeta = `${title} ${description}`.toLowerCase();
      if (
        lowerMeta.includes("photograph") ||
        lowerMeta.includes("portrait") ||
        lowerMeta.includes("landscape") ||
        lowerMeta.includes("specimen photo") ||
        lowerMeta.includes("coat of arms") ||
        lowerMeta.includes("flag of")
      ) {
        continue;
      }

      const eligibility = verifyDiagramEligibility(
        {
          title,
          subject,
          hasUnlabelledCallouts: lowerMeta.includes("unlabelled") || lowerMeta.includes("blank"),
          mime,
          isCurated: false,
        },
        { chapterTitle: query, subject },
      );

      // Only include candidates that meet the baseline eligibility floor
      if (eligibility.score >= 50) {
        results.push({
          id: `wiki_${page.pageid || randomUUID()}`,
          title,
          subject,
          source: "Wikimedia Commons",
          license,
          previewUrl: info.thumburl || info.url,
          downloadUrl: info.url,
          hasUnlabelledCallouts: lowerMeta.includes("unlabelled"),
          eligibility,
        });
      }
    }

    return results;
  } catch (err) {
    console.warn("Wikimedia Commons diagram search error (handled gracefully):", err);
    return [];
  }
}

/**
 * Combined diagram resolver: checks Curated Educational library first;
 * if no high-quality match exists, queries Wikimedia Commons.
 */
export async function findEligibleDiagrams(params: {
  query: string;
  subject?: string;
  chapter?: string;
  questionText?: string;
  requireUnlabelled?: boolean;
}): Promise<DiagramCandidate[]> {
  // 1. Check curated NCERT / CBSE library
  const curated = searchCuratedDiagrams(params);
  if (curated.length > 0 && curated[0].eligibility.score >= 80) {
    return curated;
  }

  // 2. Query Wikimedia Commons for missing topics
  const online = await searchWikimediaEducationalDiagrams({
    query: params.query || params.chapter || "",
    subject: params.subject,
    limit: 6,
  });

  return [...curated, ...online];
}

/**
 * Saves a diagram (curated SVG string or remote image buffer) into local uploads,
 * returning the generated filename for `question.imagePath`.
 */
export async function saveDiagramToUploads(
  input: { svgContent?: string; downloadUrl?: string; rawBuffer?: Buffer; ext?: string },
): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  if (input.svgContent) {
    const name = `${randomUUID()}.svg`;
    const fullPath = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name);
    await writeFile(fullPath, Buffer.from(input.svgContent, "utf-8"));
    return name;
  }

  if (input.rawBuffer) {
    const ext = input.ext || "png";
    const name = `${randomUUID()}.${ext}`;
    const fullPath = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name);
    await writeFile(fullPath, input.rawBuffer);
    return name;
  }

  if (input.downloadUrl) {
    const res = await fetch(input.downloadUrl, {
      headers: { "User-Agent": "ExamPaperBuilder/1.0" },
    });
    if (!res.ok) throw new Error(`Failed to download diagram from ${input.downloadUrl}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const isSvg = input.downloadUrl.toLowerCase().endsWith(".svg") || res.headers.get("content-type")?.includes("svg");
    const ext = isSvg ? "svg" : "png";
    const name = `${randomUUID()}.${ext}`;
    const fullPath = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name);
    await writeFile(fullPath, buf);
    return name;
  }

  throw new Error("Invalid input: either svgContent, rawBuffer, or downloadUrl must be provided");
}
