import { DEFAULT_ACADEMIC_SESSION, inferClassOrder, sortClassNames } from "./constants";
import { prisma } from "./prisma";
import type { AcademicClassDto } from "./types";

export { inferClassOrder, sortClassNames };

export function normalizeAcademicSession(session?: string | null): string {
  if (!session || !session.trim()) return DEFAULT_ACADEMIC_SESSION;
  return session.trim().replace(/-/g, "–");
}

export const STANDARD_SCHOOL_CLASSES: Array<{
  name: string;
  displayOrder: number;
  stream: string;
  subjects: Array<{ name: string; code: string }>;
}> = [
  {
    name: "Nursery",
    displayOrder: -2,
    stream: "Pre-Primary",
    subjects: [
      { name: "English", code: "NUR-ENG" },
      { name: "Hindi", code: "NUR-HIN" },
      { name: "Mathematics", code: "NUR-MAT" },
      { name: "General Awareness (EVS)", code: "NUR-EVS" },
      { name: "Art & Craft", code: "NUR-ART" },
    ],
  },
  {
    name: "LKG",
    displayOrder: -1,
    stream: "Pre-Primary",
    subjects: [
      { name: "English", code: "LKG-ENG" },
      { name: "Hindi", code: "LKG-HIN" },
      { name: "Mathematics", code: "LKG-MAT" },
      { name: "General Awareness (EVS)", code: "LKG-EVS" },
      { name: "Rhymes & Conversation", code: "LKG-RHY" },
    ],
  },
  {
    name: "UKG",
    displayOrder: 0,
    stream: "Pre-Primary",
    subjects: [
      { name: "English", code: "UKG-ENG" },
      { name: "Hindi", code: "UKG-HIN" },
      { name: "Mathematics", code: "UKG-MAT" },
      { name: "Environmental Studies (EVS)", code: "UKG-EVS" },
      { name: "General Knowledge", code: "UKG-GK" },
    ],
  },
  {
    name: "Class 1",
    displayOrder: 1,
    stream: "Primary",
    subjects: [
      { name: "English", code: "101" },
      { name: "Hindi", code: "102" },
      { name: "Mathematics", code: "103" },
      { name: "EVS", code: "104" },
    ],
  },
  {
    name: "Class 2",
    displayOrder: 2,
    stream: "Primary",
    subjects: [
      { name: "English", code: "201" },
      { name: "Hindi", code: "202" },
      { name: "Mathematics", code: "203" },
      { name: "EVS", code: "204" },
    ],
  },
  {
    name: "Class 3",
    displayOrder: 3,
    stream: "Primary",
    subjects: [
      { name: "English", code: "301" },
      { name: "Hindi", code: "302" },
      { name: "Mathematics", code: "303" },
      { name: "EVS", code: "304" },
    ],
  },
  {
    name: "Class 4",
    displayOrder: 4,
    stream: "Primary",
    subjects: [
      { name: "English", code: "401" },
      { name: "Hindi", code: "402" },
      { name: "Mathematics", code: "403" },
      { name: "EVS", code: "404" },
    ],
  },
  {
    name: "Class 5",
    displayOrder: 5,
    stream: "Primary",
    subjects: [
      { name: "English", code: "501" },
      { name: "Hindi", code: "502" },
      { name: "Mathematics", code: "503" },
      { name: "EVS", code: "504" },
    ],
  },
  {
    name: "Class 6",
    displayOrder: 6,
    stream: "Middle",
    subjects: [
      { name: "English", code: "184" },
      { name: "Hindi", code: "002" },
      { name: "Sanskrit", code: "122" },
      { name: "Mathematics", code: "041" },
      { name: "Science", code: "086" },
      { name: "Social Science", code: "087" },
    ],
  },
  {
    name: "Class 7",
    displayOrder: 7,
    stream: "Middle",
    subjects: [
      { name: "English", code: "184" },
      { name: "Hindi", code: "002" },
      { name: "Sanskrit", code: "122" },
      { name: "Mathematics", code: "041" },
      { name: "Science", code: "086" },
      { name: "Social Science", code: "087" },
    ],
  },
  {
    name: "Class 8",
    displayOrder: 8,
    stream: "Middle",
    subjects: [
      { name: "English", code: "184" },
      { name: "Hindi", code: "002" },
      { name: "Sanskrit", code: "122" },
      { name: "Mathematics", code: "041" },
      { name: "Science", code: "086" },
      { name: "Social Science", code: "087" },
    ],
  },
  {
    name: "Class 9",
    displayOrder: 9,
    stream: "Secondary",
    subjects: [
      { name: "English", code: "184" },
      { name: "Hindi", code: "002" },
      { name: "Mathematics", code: "041" },
      { name: "Science", code: "086" },
      { name: "Social Science", code: "087" },
      { name: "Information Technology", code: "402" },
    ],
  },
  {
    name: "Class 10",
    displayOrder: 10,
    stream: "Secondary",
    subjects: [
      { name: "English", code: "184" },
      { name: "Hindi", code: "002" },
      { name: "Mathematics", code: "041" },
      { name: "Science", code: "086" },
      { name: "Social Science", code: "087" },
      { name: "Information Technology", code: "402" },
    ],
  },
  {
    name: "Class 11",
    displayOrder: 11,
    stream: "Senior Secondary",
    subjects: [
      { name: "English Core", code: "301" },
      { name: "Hindi Core", code: "302" },
      { name: "Physics", code: "042" },
      { name: "Chemistry", code: "043" },
      { name: "Mathematics", code: "041" },
      { name: "Biology", code: "044" },
      { name: "Accountancy", code: "055" },
      { name: "Business Studies", code: "054" },
      { name: "Economics", code: "030" },
    ],
  },
  {
    name: "Class 12",
    displayOrder: 12,
    stream: "Senior Secondary",
    subjects: [
      { name: "English Core", code: "301" },
      { name: "Hindi Core", code: "302" },
      { name: "Physics", code: "042" },
      { name: "Chemistry", code: "043" },
      { name: "Mathematics", code: "041" },
      { name: "Biology", code: "044" },
      { name: "Accountancy", code: "055" },
      { name: "Business Studies", code: "054" },
      { name: "Economics", code: "030" },
    ],
  },
];

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
