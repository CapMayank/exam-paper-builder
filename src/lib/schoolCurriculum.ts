export interface StandardClassPreset {
  name: string;
  displayOrder: number;
  stream: string;
  subjects: Array<{ name: string; code: string }>;
}

export const STANDARD_SCHOOL_CLASSES: StandardClassPreset[] = [
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

export const EDUCATIONAL_STAGES = [
  { id: "ALL", label: "All Stages", sublabel: "Nursery – 12th" },
  { id: "Pre-Primary", label: "Pre-Primary", sublabel: "Nursery – UKG" },
  { id: "Primary", label: "Primary", sublabel: "Classes 1 – 5" },
  { id: "Middle", label: "Middle", sublabel: "Classes 6 – 8" },
  { id: "Secondary", label: "Secondary", sublabel: "Classes 9 & 10" },
  { id: "Senior Secondary", label: "Sr. Secondary", sublabel: "Classes 11 & 12" },
] as const;

export function getEducationalStage(className: string, stream?: string | null): string {
  if (stream && stream.trim()) {
    const s = stream.trim().toLowerCase();
    if (s.includes("pre-primary") || s.includes("prenursery") || s.includes("nursery") || s.includes("kindergarten")) return "Pre-Primary";
    if (s.includes("primary")) return "Primary";
    if (s.includes("middle")) return "Middle";
    if (s.includes("senior") || s.includes("sr")) return "Senior Secondary";
    if (s.includes("secondary")) return "Secondary";
    return stream.trim();
  }
  const lower = className.trim().toLowerCase();
  if (lower.includes("nursery") || lower.includes("lkg") || lower.includes("ukg") || lower.includes("playgroup") || lower.includes("pp")) {
    return "Pre-Primary";
  }
  const numMatch = lower.match(/\b(1[0-2]|[1-9])\b/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (n >= 1 && n <= 5) return "Primary";
    if (n >= 6 && n <= 8) return "Middle";
    if (n >= 9 && n <= 10) return "Secondary";
    if (n >= 11 && n <= 12) return "Senior Secondary";
  }
  return "General";
}

export function getStandardPresetForClass(className: string): StandardClassPreset | null {
  const clean = className.trim().toLowerCase();
  return (
    STANDARD_SCHOOL_CLASSES.find((c) => c.name.toLowerCase() === clean) ||
    STANDARD_SCHOOL_CLASSES.find((c) => clean.includes(c.name.toLowerCase())) ||
    null
  );
}

export function getMissingStandardSubjects(
  className: string,
  existingSubjectNames: string[]
): Array<{ name: string; code: string }> {
  const preset = getStandardPresetForClass(className);
  if (!preset) return [];
  const existingSet = new Set(existingSubjectNames.map((s) => s.trim().toLowerCase()));
  return preset.subjects.filter((s) => !existingSet.has(s.name.trim().toLowerCase()));
}

/**
 * Canonical subject matcher that accounts for:
 * 1. Exact match (case insensitive)
 * 2. Bilingual slash separator (e.g. "Mathematics / गणित" matching "Mathematics")
 * 3. Standard school curriculum aliases (e.g. Maths, Mathematics, Ganit)
 */
export function isSubjectMatching(subjectA?: string | null, subjectB?: string | null): boolean {
  if (!subjectA || !subjectB) return false;
  if (subjectA === "ALL" || subjectB === "ALL") return true;
  const a = subjectA.trim().toLowerCase();
  const b = subjectB.trim().toLowerCase();
  if (a === b) return true;

  const aParts = a.split("/").map((s) => s.trim());
  const bParts = b.split("/").map((s) => s.trim());
  if (aParts.some((ap) => bParts.includes(ap))) return true;

  const aliases: Array<string[]> = [
    ["math", "maths", "mathematics", "ganit", "गणित"],
    ["science", "sci", "vigyan", "विज्ञान"],
    ["social science", "social studies", "sst", "samajik vigyan", "सामाजिक विज्ञान"],
    ["evs", "environmental studies", "environmental science", "paryavaran", "पर्यावरण"],
    ["english", "eng", "angrezi", "अंग्रेजी"],
    ["hindi", "hin", "हिंदी", "हिन्दी"],
    ["sanskrit", "sans", "संस्कृत"],
    ["computer", "information technology", "it", "cs", "computer science"],
  ];
  for (const group of aliases) {
    const aInGroup = aParts.some((p) => group.includes(p));
    const bInGroup = bParts.some((p) => group.includes(p));
    if (aInGroup && bInGroup) return true;
  }

  return false;
}

/**
 * Normalizes preset or imported subject names to match an existing class/subject context,
 * stripping out unwanted bilingual slash suffixes when appropriate.
 */
export function normalizePresetSubject(presetSubject: string, targetSubject?: string): string {
  if (targetSubject && isSubjectMatching(presetSubject, targetSubject)) {
    return targetSubject.trim();
  }
  if (presetSubject.includes("/")) {
    return presetSubject.split("/")[0].trim();
  }
  return presetSubject.trim();
}
