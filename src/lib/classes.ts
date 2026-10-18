import { DEFAULT_ACADEMIC_SESSION, inferClassOrder, sortClassNames } from "./constants";
import { prisma } from "./prisma";
import type { AcademicClassDto } from "./types";

export { inferClassOrder, sortClassNames };

export function normalizeAcademicSession(session?: string | null): string {
  if (!session || !session.trim()) return DEFAULT_ACADEMIC_SESSION;
  return session.trim().replace(/-/g, "–");
}

export { STANDARD_SCHOOL_CLASSES } from "./schoolCurriculum";


export function toAcademicClassDto(row: {
  id: string;
  name: string;
  displayOrder: number;
  stream: string;
  academicSession: string;
  sectionsJson: string;
  subjects: Array<{ id: string; classId: string; name: string; code: string }>;
}): AcademicClassDto {
  let sections = ["A"];
  try {
    const parsed = JSON.parse(row.sectionsJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      sections = parsed.map(String);
    }
  } catch {
    // fallback
  }
  return {
    id: row.id,
    name: row.name,
    displayOrder: row.displayOrder,
    stream: row.stream,
    academicSession: normalizeAcademicSession(row.academicSession),
    sections,
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
