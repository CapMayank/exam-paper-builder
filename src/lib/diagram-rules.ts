/**
 * Board Examination Diagram & Visual Stimulus Placement Rules.
 * Pure, platform-neutral module safe for both client and server imports.
 */

/**
 * Determines whether a section type in a board examination is suitable for diagrams.
 * Strictly disallows diagrams in objective drill formats (Fill-in-the-blanks, True/False, Match the columns).
 */
export function isSectionVisuallyEligible(sectionType: string, subject?: string): boolean {
  const norm = (sectionType || "").toUpperCase();

  // These formats NEVER have diagrams in standard school board examinations
  if (
    norm === "FILL_BLANK" ||
    norm === "TRUE_FALSE" ||
    norm === "MATCH_COLUMN" ||
    norm === "GRAMMAR" ||
    norm === "KDG_NUMBER_GRID" ||
    norm === "KDG_SEQUENCE_CHAIN" ||
    norm === "KDG_TRACE_WRITE"
  ) {
    return false;
  }

  // Purely visual task formats always allow diagrams
  if (
    norm === "DRAW" ||
    norm === "MAP_WORK" ||
    norm === "WRITING_SKILL" ||
    norm === "KDG_PICTURE_MATCH" ||
    norm === "KDG_COUNT_ITEMS" ||
    norm === "KDG_CIRCLE_TARGET"
  ) {
    return true;
  }

  // For Languages (English, Hindi, Sanskrit), only WRITING_SKILL or reading comprehension charts are visual.
  // Standard literature question sections must not have diagrams.
  const subLower = (subject || "").toLowerCase();
  const isLanguage =
    subLower.includes("english") ||
    subLower.includes("hindi") ||
    subLower.includes("sanskrit") ||
    subLower.includes("language") ||
    subLower.includes("urdu");

  if (isLanguage) {
    return norm === "WRITING_SKILL" || norm === "CASE_STUDY" || norm === "UNSEEN_PASSAGE";
  }

  // For STEM subjects: MCQ, SHORT, LONG, CASE_STUDY, VERY_SHORT may be eligible depending on the chapter
  return true;
}

/**
 * Determines whether a specific syllabus chapter/topic is naturally visual
 * based on standard CBSE / State Board curriculum guidelines.
 */
export function isSubjectChapterVisual(
  subject: string,
  chapterTitle: string,
  sectionType?: string,
): boolean {
  const sub = (subject || "").toLowerCase();
  const ch = (chapterTitle || "").toLowerCase();
  const sec = (sectionType || "").toUpperCase();

  // 1. Languages (English, Hindi, etc.)
  if (
    sub.includes("english") ||
    sub.includes("hindi") ||
    sub.includes("sanskrit") ||
    sub.includes("language")
  ) {
    if (sec === "WRITING_SKILL") return true;
    return (
      ch.includes("writing") ||
      ch.includes("picture") ||
      ch.includes("stimulus") ||
      ch.includes("composition") ||
      ch.includes("poster") ||
      ch.includes("article") ||
      ch.includes("report")
    );
  }

  // 2. Mathematics
  if (sub.includes("math")) {
    return (
      ch.includes("triangle") ||
      ch.includes("circle") ||
      ch.includes("quadrilateral") ||
      ch.includes("geometry") ||
      ch.includes("coordinate") ||
      ch.includes("height") ||
      ch.includes("distance") ||
      ch.includes("trigonometr") ||
      ch.includes("surface area") ||
      ch.includes("volume") ||
      ch.includes("mensuration") ||
      ch.includes("graph") ||
      ch.includes("construction") ||
      ch.includes("conic") ||
      ch.includes("tangent") ||
      ch.includes("vector") ||
      ch.includes("three dimensional") ||
      ch.includes("3d")
    );
  }

  // 3. Physics / Science (Physics units)
  if (sub.includes("phys") || (sub.includes("sci") && !sub.includes("social"))) {
    const isPhysicsVisual =
      ch.includes("electric") ||
      ch.includes("current") ||
      ch.includes("circuit") ||
      ch.includes("resistor") ||
      ch.includes("ohm") ||
      ch.includes("light") ||
      ch.includes("reflection") ||
      ch.includes("refraction") ||
      ch.includes("mirror") ||
      ch.includes("lens") ||
      ch.includes("prism") ||
      ch.includes("human eye") ||
      ch.includes("optics") ||
      ch.includes("optical") ||
      ch.includes("magnetic") ||
      ch.includes("magnetism") ||
      ch.includes("ray") ||
      ch.includes("motion") ||
      ch.includes("gravitation");

    if (isPhysicsVisual) return true;
  }

  // 4. Biology / Life Science
  if (sub.includes("bio") || sub.includes("life") || (sub.includes("sci") && !sub.includes("social"))) {
    const isBiologyVisual =
      ch.includes("flower") ||
      ch.includes("flowering") ||
      ch.includes("human reproduction") ||
      ch.includes("reproductive system") ||
      ch.includes("cell") ||
      ch.includes("fundamental unit") ||
      ch.includes("excret") ||
      ch.includes("nephron") ||
      ch.includes("stomata") ||
      ch.includes("life processes") ||
      ch.includes("digest") ||
      ch.includes("respirat") ||
      ch.includes("circulat") ||
      ch.includes("heart") ||
      ch.includes("punnett") ||
      ch.includes("inheritance") ||
      ch.includes("mendel") ||
      ch.includes("pyramid") ||
      ch.includes("trophic") ||
      ch.includes("ecosystem") ||
      ch.includes("morphology") ||
      ch.includes("anatomy");

    if (isBiologyVisual) return true;
  }

  // 5. Chemistry
  if (sub.includes("chem") || (sub.includes("sci") && !sub.includes("social"))) {
    const isChemistryVisual =
      ch.includes("electrolysis") ||
      ch.includes("experimental") ||
      ch.includes("setup") ||
      ch.includes("metals and non-metals") ||
      ch.includes("chemical reactions and equations");

    if (isChemistryVisual) return true;
  }

  // 6. Social Science
  if (sub.includes("social") || sub.includes("geograph") || sub.includes("history")) {
    return (
      sec === "MAP_WORK" ||
      ch.includes("map") ||
      ch.includes("resource") ||
      ch.includes("drainage") ||
      ch.includes("climate") ||
      ch.includes("agriculture") ||
      ch.includes("mineral")
    );
  }

  return false;
}

/**
 * Returns the maximum number of diagrams permitted in an entire board examination paper
 * based on total marks.
 */
export function getMaxPaperDiagramBudget(totalMarks: number): number {
  if (totalMarks <= 30) return 1;
  if (totalMarks <= 50) return 2;
  return 3;
}
