import { DEFAULT_ACADEMIC_SESSION, inferClassOrder, sortClassNames } from "./constants";
import { prisma } from "./prisma";
import type { AcademicClassDto, SectionDetail } from "./types";

export { inferClassOrder, sortClassNames };

export function normalizeAcademicSession(session?: string | null): string {
  if (!session || !session.trim()) return DEFAULT_ACADEMIC_SESSION;
  return session.trim().replace(/-/g, "–");
}

export { STANDARD_SCHOOL_CLASSES } from "./schoolCurriculum";

export function normalizeSectionDetails(
  sections?: Array<string | { name?: unknown; studentCount?: unknown }> | null
): SectionDetail[] {
  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    return [{ name: "A", studentCount: 40 }];
  }
  const result: SectionDetail[] = [];
  for (const item of sections) {
    if (typeof item === "string") {
      const trimmed = item.trim();
      result.push({ name: trimmed || "A", studentCount: 40 });
    } else if (item && typeof item === "object") {
      const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : "A";
      const studentCount =
        typeof item.studentCount === "number" && Number.isFinite(item.studentCount) && item.studentCount >= 1
          ? Math.min(500, Math.floor(item.studentCount))
          : 40;
      result.push({ name, studentCount });
    } else {
      result.push({ name: String(item), studentCount: 40 });
    }
  }
  return result.length > 0 ? result : [{ name: "A", studentCount: 40 }];
}

export function toAcademicClassDto(row: {
  id: string;
  name: string;
  displayOrder: number;
  stream: string;
  academicSession: string;
  sectionsJson: string;
  subjects: Array<{ id: string; classId: string; name: string; code: string }>;
}): AcademicClassDto {
  let sectionDetails: SectionDetail[] = [{ name: "A", studentCount: 40 }];
  try {
    const parsed = JSON.parse(row.sectionsJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      sectionDetails = normalizeSectionDetails(parsed);
    }
  } catch {
    // fallback
  }
  const sections = sectionDetails.map((s) => s.name);
  return {
    id: row.id,
    name: row.name,
    displayOrder: row.displayOrder,
    stream: row.stream,
    academicSession: normalizeAcademicSession(row.academicSession),
    sections,
    sectionDetails,
    subjects: row.subjects,
  };
}

/**
 * Ensures an AcademicClass and ClassSubject exist for the given session, className, and subject.
 */
export async function ensureClassAndSubject(
  academicSession: string,
  className: string,
  subject?: string,
  subjectCode = ""
) {
  const session = normalizeAcademicSession(academicSession);
  const cleanClass = className.trim();
  if (!cleanClass) return null;

  const ac = await prisma.academicClass.upsert({
    where: {
      academicSession_name: {
        academicSession: session,
        name: cleanClass,
      },
    },
    update: {},
    create: {
      name: cleanClass,
      displayOrder: inferClassOrder(cleanClass),
      academicSession: session,
      sectionsJson: JSON.stringify(["A"]),
    },
  });

  if (subject && subject.trim()) {
    const cleanSub = subject.trim();
    await prisma.classSubject.upsert({
      where: {
        classId_name: {
          classId: ac.id,
          name: cleanSub,
        },
      },
      update: subjectCode ? { code: subjectCode } : {},
      create: {
        classId: ac.id,
        name: cleanSub,
        code: subjectCode,
      },
    });
  }

  return ac;
}

/**
 * Syncs existing Book records into AcademicClass & ClassSubject tables so no existing
 * books/blueprints/papers are ever orphaned from the class hierarchy.
 */
export async function syncClassesFromBooks(sessionFilter?: string | null) {
  const books = await prisma.book.findMany({
    select: { className: true, subject: true, academicSession: true },
  });

  const pairs = new Map<string, { session: string; className: string; subjects: Set<string> }>();
  for (const b of books) {
    const sess = normalizeAcademicSession(b.academicSession);
    if (sessionFilter && sessionFilter !== "ALL" && sess !== normalizeAcademicSession(sessionFilter)) {
      continue;
    }
    const key = `${sess}::${b.className.trim()}`;
    const existing = pairs.get(key) ?? { session: sess, className: b.className.trim(), subjects: new Set<string>() };
    if (b.subject.trim()) existing.subjects.add(b.subject.trim());
    pairs.set(key, existing);
  }

  for (const entry of pairs.values()) {
    const ac = await ensureClassAndSubject(entry.session, entry.className);
    if (ac) {
      for (const sub of entry.subjects) {
        await prisma.classSubject.upsert({
          where: { classId_name: { classId: ac.id, name: sub } },
          update: {},
          create: { classId: ac.id, name: sub, code: "" },
        });
      }
    }
  }
}
