import { body, route } from "@/lib/api";
import { ensureClassAndSubject, normalizeAcademicSession } from "@/lib/classes";
import { prisma } from "@/lib/prisma";
import { unifiedRolloverSchema } from "@/lib/schemas";

export const POST = route(
  async (req) => {
  const data = await body(req, unifiedRolloverSchema);
  const sourceSession = normalizeAcademicSession(data.sourceSession);
  const targetSession = normalizeAcademicSession(data.targetSession);

  let classesCloned = 0;
  let subjectsCloned = 0;
  let booksCloned = 0;
  let chaptersCloned = 0;
  let blueprintsCloned = 0;

  // 1. Roll over Academic Classes & Subjects
  if (data.includeClasses) {
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
        update: {
          displayOrder: sc.displayOrder,
          stream: sc.stream,
        },
        create: {
          name: sc.name,
          displayOrder: sc.displayOrder,
          stream: sc.stream,
          academicSession: targetSession,
          sectionsJson: sc.sectionsJson,
        },
      });
      classesCloned++;

      for (const sub of sc.subjects) {
        await prisma.classSubject.upsert({
          where: {
            classId_name: {
              classId: targetClass.id,
              name: sub.name,
            },
          },
          update: sub.code ? { code: sub.code } : {},
          create: {
            classId: targetClass.id,
            name: sub.name,
            code: sub.code,
          },
        });
        subjectsCloned++;
      }
    }
  }

  // 2. Roll over Textbooks & Syllabus Chapters
  const bookIdMap = new Map<string, string>(); // oldBookId -> newBookId
  const chapterIdMap = new Map<string, string>(); // oldChapterId -> newChapterId

  if (data.includeBooks) {
    const sourceBooks = await prisma.book.findMany({
      where: { academicSession: sourceSession },
      include: { chapters: { orderBy: { number: "asc" } } },
    });

    for (const sb of sourceBooks) {
      // Ensure target class & subject exist in target session
      await ensureClassAndSubject(targetSession, sb.className, sb.subject);

      // Check if book already exists in target session
      let targetBook = await prisma.book.findFirst({
        where: {
          academicSession: targetSession,
          className: sb.className,
          subject: sb.subject,
          title: sb.title,
        },
        include: { chapters: true },
      });

      if (!targetBook) {
        targetBook = await prisma.book.create({
          data: {
            title: sb.title,
            className: sb.className,
            subject: sb.subject,
            academicSession: targetSession,
            chapters: {
              create: sb.chapters.map((ch) => ({
                number: ch.number,
                title: ch.title,
              })),
            },
          },
          include: { chapters: true },
        });
        booksCloned++;
        chaptersCloned += sb.chapters.length;
      }

      bookIdMap.set(sb.id, targetBook.id);

      // Map chapter IDs by chapter number
      for (const srcCh of sb.chapters) {
        const targetCh = targetBook.chapters.find((c) => c.number === srcCh.number);
        if (targetCh) {
          chapterIdMap.set(srcCh.id, targetCh.id);
        }
      }
    }
  }

  // 3. Roll over Blueprints & Chapter Mark Allocations
  if (data.includeBlueprints) {
    const sourceBlueprints = await prisma.blueprint.findMany({
      where: { academicSession: sourceSession },
      include: {
        chapters: true,
        sections: true,
        book: { include: { chapters: true } },
      },
    });

    for (const srcBp of sourceBlueprints) {
      // Find matching target book
      let targetBookId = bookIdMap.get(srcBp.bookId);

      if (!targetBookId) {
        const found = await prisma.book.findFirst({
          where: {
            academicSession: targetSession,
            className: srcBp.book.className,
            subject: srcBp.book.subject,
          },
          include: { chapters: true },
        });
        if (found) {
          targetBookId = found.id;
          for (const ch of srcBp.book.chapters) {
            const tch = found.chapters.find((c) => c.number === ch.number);
            if (tch) chapterIdMap.set(ch.id, tch.id);
          }
        }
      }

      if (!targetBookId) continue;

      // Rename with target session tag
      let newName = srcBp.name;
      const sessionTagRegex = /\[\s*20\d\d[–-]\d\d\s*\]\s*/;
      if (sessionTagRegex.test(newName)) {
        newName = newName.replace(sessionTagRegex, `[${targetSession}] `);
      } else {
        newName = `[${targetSession}] ${newName}`;
      }

      // Check if blueprint with this name already exists in target session
      const existingBp = await prisma.blueprint.findFirst({
        where: {
          academicSession: targetSession,
          bookId: targetBookId,
          name: newName,
        },
      });

      if (!existingBp) {
        // Map chapter quotas to new target chapter IDs
        const targetChapters = srcBp.chapters
          .map((c) => {
            const mappedId = chapterIdMap.get(c.chapterId);
            return mappedId ? { chapterId: mappedId, marks: c.marks } : null;
          })
          .filter((c): c is { chapterId: string; marks: number } => c !== null);

        await prisma.blueprint.create({
          data: {
            name: newName,
            bookId: targetBookId,
            academicSession: targetSession,
            examType: srcBp.examType,
            durationMin: srcBp.durationMin,
            subjectCode: srcBp.subjectCode,
            chapters: { create: targetChapters },
            sections: {
              create: srcBp.sections.map((s) => ({
                position: s.position,
                title: s.title,
                type: s.type,
                count: s.count,
                marksEach: s.marksEach,
                instructions: s.instructions,
              })),
            },
          },
        });
        blueprintsCloned++;
      }
    }
  }

  return {
    ok: true,
    sourceSession,
    targetSession,
    summary: {
      classesCloned,
      subjectsCloned,
      booksCloned,
      chaptersCloned,
      blueprintsCloned,
    },
  };
  },
  { roles: ["ADMIN"] },
);
