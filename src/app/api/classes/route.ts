import { z } from "zod";
import { body, route } from "@/lib/api";
import {
  ensureClassAndSubject,
  inferClassOrder,
  normalizeAcademicSession,
  STANDARD_SCHOOL_CLASSES,
  syncClassesFromBooks,
  toAcademicClassDto,
} from "@/lib/classes";
import { DEFAULT_ACADEMIC_SESSION } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { academicClassSchema } from "@/lib/schemas";

const postClassUnionSchema = z.union([
  z.object({
    action: z.literal("SEED_STANDARD"),
    academicSession: z.string().optional().default(DEFAULT_ACADEMIC_SESSION),
    classNames: z.array(z.string()).optional(),
  }),
  z.object({
    action: z.literal("ROLLOVER"),
    sourceSession: z.string().min(1),
    targetSession: z.string().min(1),
  }),
  academicClassSchema,
]);

export const GET = route(async (req) => {
  const url = new URL(req.url);
  const sessionParam = url.searchParams.get("session");
  await syncClassesFromBooks(sessionParam);

  const where =
    sessionParam && sessionParam !== "ALL"
      ? { academicSession: normalizeAcademicSession(sessionParam) }
      : undefined;

  const rows = await prisma.academicClass.findMany({
    where,
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: {
      subjects: {
        orderBy: { name: "asc" },
      },
    },
  });

  return rows.map(toAcademicClassDto);
});

export const POST = route(async (req) => {
  const data = await body(req, postClassUnionSchema);

  if ("action" in data && data.action === "SEED_STANDARD") {
    const session = normalizeAcademicSession(data.academicSession);
    const filterSet = data.classNames && data.classNames.length > 0 ? new Set(data.classNames) : null;
    const presets = filterSet
      ? STANDARD_SCHOOL_CLASSES.filter((c) => filterSet.has(c.name))
      : STANDARD_SCHOOL_CLASSES;

    for (const preset of presets) {
      const ac = await prisma.academicClass.upsert({
        where: {
          academicSession_name: {
            academicSession: session,
            name: preset.name,
          },
        },
        update: {
          displayOrder: preset.displayOrder,
          stream: preset.stream,
        },
        create: {
          name: preset.name,
          displayOrder: preset.displayOrder,
          stream: preset.stream,
          academicSession: session,
          sectionsJson: JSON.stringify(["A", "B"]),
        },
      });

      for (const sub of preset.subjects) {
        await prisma.classSubject.upsert({
          where: {
            classId_name: {
              classId: ac.id,
              name: sub.name,
            },
          },
          update: sub.code ? { code: sub.code } : {},
          create: {
            classId: ac.id,
            name: sub.name,
            code: sub.code,
          },
        });
      }
    }

    const rows = await prisma.academicClass.findMany({
      where: { academicSession: session },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: { subjects: { orderBy: { name: "asc" } } },
    });
    return rows.map(toAcademicClassDto);
  }

  if ("action" in data && data.action === "ROLLOVER") {
    const sourceSession = normalizeAcademicSession(data.sourceSession);
    const targetSession = normalizeAcademicSession(data.targetSession);
    const sourceClasses = await prisma.academicClass.findMany({
      where: { academicSession: sourceSession },
      include: { subjects: true },
    });

    for (const sc of sourceClasses) {
      const targetClass = await prisma.academicClass.upsert({
        where: {
          academicSession_name: {
            academicSession: targetSession,
            name: sc.name,
          },
        },
        update: {},
        create: {
          name: sc.name,
          displayOrder: sc.displayOrder,
          stream: sc.stream,
          academicSession: targetSession,
          sectionsJson: sc.sectionsJson,
        },
      });

      for (const sub of sc.subjects) {
        await prisma.classSubject.upsert({
          where: {
            classId_name: {
              classId: targetClass.id,
              name: sub.name,
            },
          },
          update: {},
          create: {
            classId: targetClass.id,
            name: sub.name,
            code: sub.code,
          },
        });
      }
    }

    const rows = await prisma.academicClass.findMany({
      where: { academicSession: targetSession },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: { subjects: { orderBy: { name: "asc" } } },
    });
    return rows.map(toAcademicClassDto);
  }

  const session = normalizeAcademicSession(data.academicSession);
  const displayOrder = data.displayOrder ?? inferClassOrder(data.name);

  const created = await prisma.academicClass.upsert({
    where: {
      academicSession_name: {
        academicSession: session,
        name: data.name,
      },
    },
    update: {
      displayOrder,
      stream: data.stream || "",
      sectionsJson: JSON.stringify(data.sections || ["A"]),
    },
    create: {
      name: data.name,
      displayOrder,
      stream: data.stream || "",
      academicSession: session,
      sectionsJson: JSON.stringify(data.sections || ["A"]),
    },
  });

  if (data.subjects && data.subjects.length > 0) {
    for (const s of data.subjects) {
      await ensureClassAndSubject(session, data.name, s.name, s.code || "");
    }
  }

  const full = await prisma.academicClass.findUniqueOrThrow({
    where: { id: created.id },
    include: { subjects: { orderBy: { name: "asc" } } },
  });

  return toAcademicClassDto(full);
});
