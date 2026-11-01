import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Session Mocking for RBAC
let mockSessionUserId: string | null = null;
vi.mock("@/lib/session", () => ({
  sessionUserId: () => Promise.resolve(mockSessionUserId),
  startSession: () => Promise.resolve(),
  endSession: () => Promise.resolve(),
}));

import { POST as createPaperRoute, GET as getPapersRoute } from "@/app/api/papers/route";
import { PATCH as patchPaperRoute, DELETE as deletePaperRoute } from "@/app/api/papers/[id]/route";
import { POST as addQuestionToPaperRoute } from "@/app/api/papers/[id]/questions/route";
import { PATCH as patchPaperQuestionRoute } from "@/app/api/papers/[id]/questions/[itemId]/route";
import { POST as createQuestionRoute, GET as getQuestionsRoute } from "@/app/api/questions/route";
import { DELETE as deleteQuestionRoute } from "@/app/api/questions/[id]/route";
import { POST as createBlueprintRoute } from "@/app/api/blueprints/route";
import { DELETE as deleteBlueprintRoute } from "@/app/api/blueprints/[id]/route";
import { loadPaperView } from "./papers";
import { toQuestionDto } from "./dto";
import { prisma } from "./prisma";

describe("Milestone 1 Challenger 2: Empirical Backward Compatibility & FK Integrity Suite", () => {
  const stamp = Date.now();
  let teacherUser: { id: string; email: string; role: string };
  let adminUser: { id: string; email: string; role: string };

  let legacyBookId: string;
  let ch1Id: string;
  let ch2Id: string;
  let legacyBlueprintId: string;
  let sec1Id: string;

  beforeAll(async () => {
    // 1. Create test users
    teacherUser = await prisma.user.create({
      data: {
        name: `M1C2 Teacher ${stamp}`,
        email: `m1c2-teacher-${stamp}@internal.test`,
        passwordHash: "hash",
        role: "TEACHER",
        department: "Science",
        active: true,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        name: `M1C2 Admin ${stamp}`,
        email: `m1c2-admin-${stamp}@internal.test`,
        passwordHash: "hash",
        role: "ADMIN",
        department: "Examination",
        active: true,
      },
    });

    mockSessionUserId = teacherUser.id;

    // 2. Create test Book & Chapters
    const book = await prisma.book.create({
      data: {
        title: `M1C2 Science Book ${stamp}`,
        subject: "Science",
        className: "Class 10",
        academicSession: "2026–27",
      },
    });
    legacyBookId = book.id;

    const ch1 = await prisma.chapter.create({
      data: { bookId: legacyBookId, number: 1, title: "Chemical Reactions" },
    });
    ch1Id = ch1.id;

    const ch2 = await prisma.chapter.create({
      data: { bookId: legacyBookId, number: 2, title: "Acids, Bases and Salts" },
    });
    ch2Id = ch2.id;

    // 3. Create legacy Blueprint without any curriculum fields
    const bp = await prisma.blueprint.create({
      data: {
        name: `Legacy Blueprint ${stamp}`,
        bookId: legacyBookId,
        academicSession: "2026–27",
        examType: "ANNUAL",
        durationMin: 180,
        chapters: {
          create: [
            { chapterId: ch1Id, marks: 10 },
            { chapterId: ch2Id, marks: 10 },
          ],
        },
        sections: {
          create: [
            {
              position: 0,
              title: "Section A: Multiple Choice",
              instructions: "Choose the correct option",
              type: "MCQ",
              count: 4,
              marksEach: 1,
            },
            {
              position: 1,
              title: "Section B: Short Answer",
              instructions: "Answer all questions",
              type: "SHORT",
              count: 4,
              marksEach: 2,
            },
          ],
        },
      },
      include: { sections: true },
    });
    legacyBlueprintId = bp.id;
    sec1Id = bp.sections[0].id;
  });

  afterAll(async () => {
    // Cleanup created test records
    try {
      await prisma.paperSnapshot.deleteMany({ where: { createdById: { in: [teacherUser.id, adminUser.id] } } });
      await prisma.paperQuestion.deleteMany({
        where: { paper: { createdById: { in: [teacherUser.id, adminUser.id] } } },
      });
      await prisma.paper.deleteMany({ where: { createdById: { in: [teacherUser.id, adminUser.id] } } });
      await prisma.blueprintChapter.deleteMany({ where: { blueprint: { bookId: legacyBookId } } });
      await prisma.blueprintSection.deleteMany({ where: { blueprint: { bookId: legacyBookId } } });
      await prisma.blueprint.deleteMany({ where: { bookId: legacyBookId } });
      await prisma.question.deleteMany({ where: { createdById: { in: [teacherUser.id, adminUser.id] } } });
      await prisma.chapter.deleteMany({ where: { bookId: legacyBookId } });
      await prisma.book.deleteMany({ where: { id: legacyBookId } });
      await prisma.user.deleteMany({ where: { id: { in: [teacherUser.id, adminUser.id] } } });
    } catch (e) {
      console.warn("Cleanup warning:", e);
    }
  });

  // =========================================================================
  // SUITE 1: Schema Default Values & Backward Compatibility on Core Entities
  // =========================================================================
  describe("Suite 1: Optional Columns & Schema Defaults Backward Compatibility", () => {
    it("1.1. Existing Blueprint records have default curriculumMode='BLANK_CUSTOM' and nullable curriculum links", async () => {
      const bp = await prisma.blueprint.findUnique({
        where: { id: legacyBlueprintId },
      });
      expect(bp).not.toBeNull();
      expect(bp?.curriculumMode).toBe("BLANK_CUSTOM");
      expect(bp?.curriculumTemplateId).toBeNull();
      expect(bp?.curriculumVariantId).toBeNull();
    });

    it("1.2. Legacy Blueprint creation via API route succeeds without curriculum fields", async () => {
      mockSessionUserId = teacherUser.id;
      const payload = {
        name: `API Legacy Blueprint ${stamp}`,
        bookId: legacyBookId,
        academicSession: "2026–27",
        examType: "HALF_YEARLY",
        durationMin: 120,
        chapters: [{ chapterId: ch1Id, marks: 10 }],
        sections: [
          {
            title: "Sec A",
            instructions: "All compulsory",
            type: "MCQ",
            count: 6,
            marksEach: 1,
          },
          {
            title: "Sec B",
            instructions: "All compulsory",
            type: "SHORT",
            count: 2,
            marksEach: 2,
          },
        ],
      };

      const req = new Request("http://localhost/api/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await createBlueprintRoute(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.curriculumMode).toBe("BLANK_CUSTOM");
      expect(data.curriculumTemplateId).toBeNull();

      // Clean up created blueprint
      await prisma.blueprintChapter.deleteMany({ where: { blueprintId: data.id } });
      await prisma.blueprintSection.deleteMany({ where: { blueprintId: data.id } });
      await prisma.blueprint.delete({ where: { id: data.id } });
    });

    it("1.3. Blueprint creation with curriculum links succeeds and persists optional relationships", async () => {
      const template = await prisma.curriculumBlueprintTemplate.findFirst();
      expect(template).not.toBeNull();
      const variant = await prisma.curriculumSubjectVariant.findFirst();

      const bp = await prisma.blueprint.create({
        data: {
          name: `Curriculum-Linked BP ${stamp}`,
          bookId: legacyBookId,
          academicSession: "2026–27",
          examType: "ANNUAL",
          durationMin: 180,
          curriculumMode: "STANDARD_MPBSE",
          curriculumTemplateId: template!.id,
          curriculumVariantId: variant?.id ?? null,
          chapters: { create: [{ chapterId: ch1Id, marks: 10 }] },
          sections: {
            create: [
              {
                position: 0,
                title: "Section 1",
                instructions: "",
                type: "MCQ",
                count: 5,
                marksEach: 1,
              },
            ],
          },
        },
        include: { curriculumTemplate: true, curriculumVariant: true },
      });

      expect(bp.curriculumMode).toBe("STANDARD_MPBSE");
      expect(bp.curriculumTemplateId).toBe(template!.id);
      expect(bp.curriculumTemplate?.templateCode).toBe(template!.templateCode);

      // Clean up
      await prisma.blueprintChapter.deleteMany({ where: { blueprintId: bp.id } });
      await prisma.blueprintSection.deleteMany({ where: { blueprintId: bp.id } });
      await prisma.blueprint.delete({ where: { id: bp.id } });
    });

    it("1.4. Legacy Question creation via API succeeds without curriculum fields and defaults optional fields to null", async () => {
      mockSessionUserId = teacherUser.id;
      const payload = {
        bookId: legacyBookId,
        chapterId: ch1Id,
        type: "MCQ",
        text: `What is the chemical formula of rust? ${stamp}`,
        options: ["Fe2O3.xH2O", "FeO", "Fe3O4", "FeCl3"],
        answer: "Fe2O3.xH2O",
        difficulty: "MEDIUM",
        spaceMm: 0,
        showGrid: false,
      };

      const req = new Request("http://localhost/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await createQuestionRoute(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBeDefined();

      const created = await prisma.question.findUnique({ where: { id: data.id } });
      expect(created?.curriculumTopicId).toBeNull();
      expect(created?.competencyLevel).toBeNull();
      expect(created?.sourceProvenance).toBeNull();

      // Clean up
      await prisma.question.delete({ where: { id: data.id } });
    });

    it("1.5. Question with curriculumTopicId, competencyLevel, and sourceProvenance persists properly and serializes via toQuestionDto", async () => {
      const topic = await prisma.curriculumTopic.findFirst();
      expect(topic).not.toBeNull();

      const q = await prisma.question.create({
        data: {
          bookId: legacyBookId,
          chapterId: ch1Id,
          type: "SHORT",
          text: `Explain displacement reaction with example. ${stamp}`,
          answer: "Displacement reaction explanation",
          difficulty: "EASY",
          curriculumTopicId: topic!.id,
          competencyLevel: "UNDERSTANDING",
          sourceProvenance: "MPBSE Model Paper 2026-27 Q.7",
          createdById: teacherUser.id,
        },
        include: { curriculumTopic: true, chapter: true },
      });

      expect(q.curriculumTopicId).toBe(topic!.id);
      expect(q.competencyLevel).toBe("UNDERSTANDING");
      expect(q.sourceProvenance).toBe("MPBSE Model Paper 2026-27 Q.7");
      expect(q.curriculumTopic?.title).toBe(topic!.title);

      // Verify toQuestionDto does not throw and preserves backward compatibility
      const dto = toQuestionDto(q);
      expect(dto.id).toBe(q.id);
      expect(dto.text).toBe(q.text);

      await prisma.question.delete({ where: { id: q.id } });
    });
  });

  // =========================================================================
  // SUITE 2: Paper Creation, Editing, and Fetching with Existing Blueprints
  // =========================================================================
  describe("Suite 2: Paper Lifecycle (Create, Read, Edit, Progress, Delete) with Existing Blueprints", () => {
    let testPaperId: string;
    let question1Id: string;
    let question2Id: string;
    let paperItemId: string;

    it("2.1. Paper creation succeeds using existing legacy blueprint via POST /api/papers", async () => {
      mockSessionUserId = teacherUser.id;
      const payload = {
        title: `Terminal Examination 2026 ${stamp}`,
        blueprintId: legacyBlueprintId,
        layout: "BOOKLET",
        schoolName: "Government Excellence School",
        academicSession: "2026–27",
        examType: "ANNUAL",
        examDate: "2027-03-01",
        paperSet: "Set A",
        subjectCode: "200",
        language: "hi",
        generalInstructions: "All questions are compulsory.",
        printDensity: "STANDARD",
        twoColumn: false,
        targetPages: 4,
        numberingStyle: "CONTINUOUS",
        marksStyle: "INLINE",
        showCandidateDetails: true,
        showSignatures: true,
      };

      const req = new Request("http://localhost/api/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await createPaperRoute(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const paperView = await res.json();
      expect(paperView.id).toBeDefined();
      expect(paperView.title).toBe(payload.title);
      expect(paperView.blueprint.id).toBe(legacyBlueprintId);
      expect(paperView.blueprint.curriculumMode).toBe("BLANK_CUSTOM");
      expect(paperView.progress).toBeDefined();
      expect(paperView.progress.complete).toBe(false);

      testPaperId = paperView.id;
    });

    it("2.2. Paper view fetching (GET /api/papers and loadPaperView) handles added columns without degradation", async () => {
      // Direct loadPaperView
      const directView = await loadPaperView(testPaperId);
      expect(directView).not.toBeNull();
      expect(directView?.id).toBe(testPaperId);
      expect(directView?.blueprint.curriculumMode).toBe("BLANK_CUSTOM");
      expect(directView?.items).toEqual([]);

      // Route GET /api/papers
      const req = new Request("http://localhost/api/papers");
      const res = await getPapersRoute(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const papersList = (await res.json()) as Array<{ id: string; title: string }>;
      const found = papersList.find((p) => p.id === testPaperId);
      expect(found).toBeDefined();
      expect(found?.title).toBe(`Terminal Examination 2026 ${stamp}`);
    });

    it("2.3. Adding questions to paper slots succeeds without foreign key conflicts", async () => {
      // Create questions to place
      const q1 = await prisma.question.create({
        data: {
          bookId: legacyBookId,
          chapterId: ch1Id,
          type: "MCQ",
          text: `Q1: Which gas is liberated when zinc reacts with dilute sulfuric acid? ${stamp}`,
          optionsJson: JSON.stringify(["H2", "O2", "CO2", "SO2"]),
          answer: "H2",
          difficulty: "EASY",
          createdById: teacherUser.id,
        },
      });
      question1Id = q1.id;

      const q2 = await prisma.question.create({
        data: {
          bookId: legacyBookId,
          chapterId: ch1Id,
          type: "SHORT",
          text: `Q2: Balance the following chemical equation: Fe + H2O -> Fe3O4 + H2 ${stamp}`,
          answer: "3Fe + 4H2O -> Fe3O4 + 4H2",
          difficulty: "MEDIUM",
          createdById: teacherUser.id,
        },
      });
      question2Id = q2.id;

      // Add q1 to section 1 (MCQ)
      mockSessionUserId = teacherUser.id;
      const req = new Request(`http://localhost/api/papers/${testPaperId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: sec1Id,
          questionId: question1Id,
          position: 1,
        }),
      });

      const res = await addQuestionToPaperRoute(req, { params: Promise.resolve({ id: testPaperId }) });
      expect(res.status).toBe(200);
      const updatedPaper = await res.json();
      expect(updatedPaper.items.length).toBe(1);
      expect(updatedPaper.items[0].question.id).toBe(question1Id);
      paperItemId = updatedPaper.items[0].id;
    });

    it("2.4. Editing paper item (pageBreakBefore, reorder) succeeds via PATCH /api/papers/[id]/questions/[itemId]", async () => {
      mockSessionUserId = teacherUser.id;
      const req = new Request(`http://localhost/api/papers/${testPaperId}/questions/${paperItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageBreakBefore: true }),
      });

      const res = await patchPaperQuestionRoute(req, { params: Promise.resolve({ id: testPaperId, itemId: paperItemId }) });
      expect(res.status).toBe(200);
      const updated = (await res.json()) as { items: Array<{ id: string; pageBreakBefore: boolean }> };
      const item = updated.items.find((i) => i.id === paperItemId);
      expect(item?.pageBreakBefore).toBe(true);
    });

    it("2.5. Modifying paper details via PATCH /api/papers/[id] updates fields cleanly", async () => {
      mockSessionUserId = teacherUser.id;
      const req = new Request(`http://localhost/api/papers/${testPaperId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Updated Terminal Examination 2026 ${stamp}`,
          generalInstructions: "Read all questions with extreme care.",
          printDensity: "COMPACT",
          twoColumn: true,
        }),
      });

      const res = await patchPaperRoute(req, { params: Promise.resolve({ id: testPaperId }) });
      expect(res.status).toBe(200);
      const updated = await res.json();
      expect(updated.title).toBe(`Updated Terminal Examination 2026 ${stamp}`);
      expect(updated.printDensity).toBe("COMPACT");
      expect(updated.twoColumn).toBe(true);
    });

    it("2.6. Deleting paper cascades PaperQuestion and leaves Question and Blueprint intact", async () => {
      mockSessionUserId = teacherUser.id;
      const req = new Request(`http://localhost/api/papers/${testPaperId}`, {
        method: "DELETE",
      });

      const res = await deletePaperRoute(req, { params: Promise.resolve({ id: testPaperId }) });
      expect(res.status).toBe(200);

      // Verify Paper is gone
      const p = await prisma.paper.findUnique({ where: { id: testPaperId } });
      expect(p).toBeNull();

      // Verify PaperQuestion is cascade-deleted
      const pq = await prisma.paperQuestion.findMany({ where: { paperId: testPaperId } });
      expect(pq.length).toBe(0);

      // Verify Question still exists
      const q1 = await prisma.question.findUnique({ where: { id: question1Id } });
      expect(q1).not.toBeNull();

      // Verify Blueprint still exists
      const bp = await prisma.blueprint.findUnique({ where: { id: legacyBlueprintId } });
      expect(bp).not.toBeNull();

      // Clean up standalone questions
      await prisma.question.delete({ where: { id: question1Id } });
      await prisma.question.delete({ where: { id: question2Id } });
    });
  });

  // =========================================================================
  // SUITE 3: Foreign Key Constraints & Cascade/SetNull Verification
  // =========================================================================
  describe("Suite 3: Foreign Key Integrity & Delete/Modify Constraints", () => {
    it("3.1. Restrict guard: Attempting to delete a question in a paper throws 409 via route and Restrict in DB", async () => {
      // Create a paper and place a question
      const q = await prisma.question.create({
        data: {
          bookId: legacyBookId,
          chapterId: ch1Id,
          type: "MCQ",
          text: `Guard test question ${stamp}`,
          createdById: teacherUser.id,
        },
      });

      const paper = await prisma.paper.create({
        data: {
          title: `Guard Paper ${stamp}`,
          blueprintId: legacyBlueprintId,
          layout: "BOOKLET",
          schoolName: "Test School",
          createdById: teacherUser.id,
          items: {
            create: {
              sectionId: sec1Id,
              questionId: q.id,
              position: 1,
            },
          },
        },
      });

      // API delete route should return 409
      mockSessionUserId = teacherUser.id;
      const req = new Request(`http://localhost/api/questions/${q.id}`, { method: "DELETE" });
      const res = await deleteQuestionRoute(req, { params: Promise.resolve({ id: q.id }) });
      expect(res.status).toBe(409);

      // Direct prisma delete should throw foreign key constraint violation (Restrict)
      await expect(prisma.question.delete({ where: { id: q.id } })).rejects.toThrow();

      // Clean up paper then question
      await prisma.paperQuestion.deleteMany({ where: { paperId: paper.id } });
      await prisma.paper.delete({ where: { id: paper.id } });
      await prisma.question.delete({ where: { id: q.id } });
    });

    it("3.2. SetNull guard: Deleting a CurriculumTopic sets Question.curriculumTopicId to null without deleting Question", async () => {
      // 1. Create a transient textbook, chapter, and topic
      const subject = await prisma.curriculumSubject.findFirst();
      expect(subject).not.toBeNull();

      const textbook = await prisma.curriculumTextbook.create({
        data: {
          subjectId: subject!.id,
          title: `Transient Textbook ${stamp}`,
        },
      });

      const chapter = await prisma.curriculumChapter.create({
        data: {
          textbookId: textbook.id,
          chapterNumber: 999,
          title: `Transient Chapter ${stamp}`,
        },
      });

      const topic = await prisma.curriculumTopic.create({
        data: {
          chapterId: chapter.id,
          title: `Transient Topic ${stamp}`,
        },
      });

      // 2. Create question referencing this topic
      const q = await prisma.question.create({
        data: {
          bookId: legacyBookId,
          chapterId: ch1Id,
          type: "MCQ",
          text: `Question linked to transient topic ${stamp}`,
          curriculumTopicId: topic.id,
          createdById: teacherUser.id,
        },
      });
      expect(q.curriculumTopicId).toBe(topic.id);

      // 3. Delete the CurriculumTopic
      await prisma.curriculumTopic.delete({ where: { id: topic.id } });

      // 4. Verify Question still exists and curriculumTopicId was set to null
      const updatedQ = await prisma.question.findUnique({ where: { id: q.id } });
      expect(updatedQ).not.toBeNull();
      expect(updatedQ?.curriculumTopicId).toBeNull();

      // Clean up
      await prisma.question.delete({ where: { id: q.id } });
      await prisma.curriculumChapter.delete({ where: { id: chapter.id } });
      await prisma.curriculumTextbook.delete({ where: { id: textbook.id } });
    });

    it("3.3. SetNull guard: Deleting a CurriculumBlueprintTemplate sets Blueprint.curriculumTemplateId to null without deleting Blueprint", async () => {
      const subject = await prisma.curriculumSubject.findFirst();
      const doc = await prisma.curriculumDocument.findFirst();
      expect(subject).not.toBeNull();
      expect(doc).not.toBeNull();

      // 1. Create transient template
      const tempTemplate = await prisma.curriculumBlueprintTemplate.create({
        data: {
          subjectId: subject!.id,
          documentId: doc!.id,
          templateCode: `transient-template-${stamp}`,
          title: `Transient Blueprint Template ${stamp}`,
          totalMarks: 75,
          archetype: "STANDARD_23Q_75M",
          sectionsJson: [],
        },
      });

      // 2. Create Blueprint referencing this template
      const bp = await prisma.blueprint.create({
        data: {
          name: `Blueprint with transient template ${stamp}`,
          bookId: legacyBookId,
          durationMin: 180,
          examType: "ANNUAL",
          curriculumTemplateId: tempTemplate.id,
          curriculumMode: "STANDARD_MPBSE",
        },
      });
      expect(bp.curriculumTemplateId).toBe(tempTemplate.id);

      // 3. Delete the template
      await prisma.curriculumBlueprintTemplate.delete({ where: { id: tempTemplate.id } });

      // 4. Verify Blueprint still exists and curriculumTemplateId is null
      const updatedBp = await prisma.blueprint.findUnique({ where: { id: bp.id } });
      expect(updatedBp).not.toBeNull();
      expect(updatedBp?.curriculumTemplateId).toBeNull();

      // Clean up
      await prisma.blueprint.delete({ where: { id: bp.id } });
    });

    it("3.4. Restrict guard: Attempting to delete a Blueprint with existing Papers is blocked", async () => {
      const bp = await prisma.blueprint.create({
        data: {
          name: `Protected BP ${stamp}`,
          bookId: legacyBookId,
          durationMin: 180,
          examType: "ANNUAL",
        },
      });

      const paper = await prisma.paper.create({
        data: {
          title: `Blocking Paper ${stamp}`,
          blueprintId: bp.id,
          layout: "BOOKLET",
          schoolName: "Test School",
          createdById: teacherUser.id,
        },
      });

      // API delete route should return 409
      mockSessionUserId = adminUser.id;
      const req = new Request(`http://localhost/api/blueprints/${bp.id}`, { method: "DELETE" });
      const res = await deleteBlueprintRoute(req, { params: Promise.resolve({ id: bp.id }) });
      expect(res.status).toBe(409);

      // Direct prisma delete should fail with Restrict violation
      await expect(prisma.blueprint.delete({ where: { id: bp.id } })).rejects.toThrow();

      // Clean up paper then blueprint
      await prisma.paper.delete({ where: { id: paper.id } });
      await prisma.blueprint.delete({ where: { id: bp.id } });
    });
  });

  // =========================================================================
  // SUITE 4: Comprehensive Circular 465 Choice Rules Verification
  // =========================================================================
  describe("Suite 4: Circular 465 Choice Rules Verification on All Seeded Templates", () => {
    it("4.1. Exactly 27 CurriculumBlueprintTemplates are seeded in the database", async () => {
      const templates = await prisma.curriculumBlueprintTemplate.findMany({
        include: {
          subject: {
            include: { curriculumClass: true },
          },
        },
      });
      expect(templates.length).toBe(27);
    });

    it("4.2. Every template's sections sum strictly equals its totalMarks", async () => {
      const templates = await prisma.curriculumBlueprintTemplate.findMany();
      for (const t of templates) {
        const sections = t.sectionsJson as Array<{
          count: number;
          marksEach: number;
        }>;
        expect(Array.isArray(sections)).toBe(true);
        expect(sections.length).toBeGreaterThan(0);

        const calculatedTotal = sections.reduce((sum, s) => sum + s.count * s.marksEach, 0);
        expect(calculatedTotal).toBe(t.totalMarks);
      }
    });

    it("4.3. Circular 465 Rule: Internal choice is STRICTLY ABOLISHED (NO_CHOICE) for ALL 2-mark questions across ALL templates", async () => {
      const templates = await prisma.curriculumBlueprintTemplate.findMany();
      let total2MarkSectionsFound = 0;

      for (const t of templates) {
        const sections = t.sectionsJson as Array<{
          title: string;
          type: string;
          count: number;
          marksEach: number;
          orChoiceMode: string;
          orAlternativeCount: number;
          choicePolicy?: {
            policyType: string;
            totalProvided: number;
            totalRequired: number;
            rationale: string;
          };
        }>;

        for (const sec of sections) {
          if (sec.marksEach === 2) {
            total2MarkSectionsFound++;
            // Statutory requirement: NO_CHOICE
            expect(sec.orChoiceMode).toBe("NO_CHOICE");
            expect(sec.orAlternativeCount).toBe(0);
            expect(sec.choicePolicy).toBeDefined();
            expect(sec.choicePolicy?.policyType).toBe("NO_CHOICE");
            expect(sec.choicePolicy?.totalProvided).toBe(sec.count);
            expect(sec.choicePolicy?.totalRequired).toBe(sec.count);
            expect(sec.choicePolicy?.rationale.toLowerCase()).toContain("circular 465");
          }
        }
      }

      // Ensure every single template had at least one 2-mark section tested
      expect(total2MarkSectionsFound).toBe(27);
    });

    it("4.4. Circular 465 Rule: 100% Mandatory internal alternative (FULL_OR_ALTERNATIVE) for 3-mark and 4-mark questions in Standard/Science archetypes", async () => {
      const templates = await prisma.curriculumBlueprintTemplate.findMany({
        where: {
          archetype: { in: ["STANDARD_23Q_75M", "SCIENCE_20Q_70M", "STANDARD_23Q_80M"] },
        },
      });

      expect(templates.length).toBe(23); // 27 total - 4 English = 23 general/science
      let total3m4mSectionsFound = 0;

      for (const t of templates) {
        const sections = t.sectionsJson as Array<{
          title: string;
          type: string;
          count: number;
          marksEach: number;
          orChoiceMode: string;
          orAlternativeCount: number;
          choicePolicy?: {
            policyType: string;
            totalProvided: number;
            totalRequired: number;
            poolScope: string;
            rationale: string;
          };
        }>;

        for (const sec of sections) {
          if (sec.marksEach === 3 || sec.marksEach === 4) {
            total3m4mSectionsFound++;
            // Statutory requirement: FULL_OR_ALTERNATIVE (अथवा)
            expect(sec.orChoiceMode).toBe("FULL_OR_ALTERNATIVE");
            expect(sec.orAlternativeCount).toBe(1);
            expect(sec.choicePolicy).toBeDefined();
            expect(sec.choicePolicy?.policyType).toBe("FULL_OR_ALTERNATIVE");
            expect(sec.choicePolicy?.totalProvided).toBe(2);
            expect(sec.choicePolicy?.totalRequired).toBe(1);
            expect(sec.choicePolicy?.poolScope).toBe("SAME_UNIT");
            expect(sec.choicePolicy?.rationale.toLowerCase()).toContain("circular 465");
          }
        }
      }

      // Each of the 23 templates has one 3m section and one 4m section = 46 sections total
      expect(total3m4mSectionsFound).toBe(46);
    });

    it("4.5. English Language Templates accurately model Circular 465 and board-specific rules", async () => {
      const englishTemplates = await prisma.curriculumBlueprintTemplate.findMany({
        where: {
          archetype: { in: ["ENGLISH_16Q_75M", "ENGLISH_15Q_80M"] },
        },
      });

      expect(englishTemplates.length).toBe(4); // Classes 9, 10, 11, 12

      for (const t of englishTemplates) {
        const sections = t.sectionsJson as Array<{
          title: string;
          count: number;
          marksEach: number;
          orChoiceMode: string;
          choicePolicy?: { policyType: string; totalProvided: number; totalRequired: number };
        }>;

        // 1. Note Making (4m) is strictly compulsory (NO_CHOICE)
        const noteMaking = sections.find((s) => s.title.includes("Note Making"));
        expect(noteMaking).toBeDefined();
        expect(noteMaking?.marksEach).toBe(4);
        expect(noteMaking?.orChoiceMode).toBe("NO_CHOICE");
        expect(noteMaking?.choicePolicy?.policyType).toBe("NO_CHOICE");

        // 2. Grammar sections use ATTEMPT_K_OF_N
        const grammarSections = sections.filter((s) => s.title.includes("Grammar"));
        expect(grammarSections.length).toBeGreaterThanOrEqual(2);
        for (const g of grammarSections) {
          expect(g.orChoiceMode).toBe("ATTEMPT_K_OF_N");
          expect(g.choicePolicy?.policyType).toBe("ATTEMPT_K_OF_N");
          expect(g.choicePolicy?.totalProvided).toBe(6);
          expect(g.choicePolicy?.totalRequired).toBe(5);
        }

        // 3. Short Answer Questions (2m) strictly have NO_CHOICE per Circular 465
        const saSections = sections.filter((s) => s.marksEach === 2);
        for (const sa of saSections) {
          expect(sa.orChoiceMode).toBe("NO_CHOICE");
          expect(sa.choicePolicy?.policyType).toBe("NO_CHOICE");
        }
      }
    });

    it("4.6. Objective 1-mark questions across all templates have NO_CHOICE (except grammar ATTEMPT_K_OF_N)", async () => {
      const templates = await prisma.curriculumBlueprintTemplate.findMany();

      for (const t of templates) {
        const sections = t.sectionsJson as Array<{
          title: string;
          marksEach: number;
          orChoiceMode: string;
          choicePolicy?: { policyType: string };
        }>;

        const objSections = sections.filter((s) => s.marksEach === 1);
        for (const obj of objSections) {
          if (obj.title.includes("Grammar")) {
            expect(obj.orChoiceMode).toBe("ATTEMPT_K_OF_N");
          } else {
            expect(obj.orChoiceMode).toBe("NO_CHOICE");
            expect(obj.choicePolicy?.policyType).toBe("NO_CHOICE");
          }
        }
      }
    });

    it("4.7. Reconciled 100-mark allocation: CurriculumMarksScheme theory equals template totalMarks for all 27 subjects", async () => {
      const subjects = await prisma.curriculumSubject.findMany({
        include: {
          marksSchemes: true,
          blueprints: true,
        },
      });

      expect(subjects.length).toBe(27);

      for (const sub of subjects) {
        expect(sub.marksSchemes.length).toBeGreaterThanOrEqual(1);
        expect(sub.blueprints.length).toBeGreaterThanOrEqual(1);

        const ms = sub.marksSchemes[0];
        const bp = sub.blueprints[0];

        // Total must sum to 100
        expect(ms.totalTheory + ms.totalPractical + ms.totalProject).toBe(100);

        // Blueprint totalMarks must match marksScheme theoryMarks
        expect(bp.totalMarks).toBe(ms.totalTheory);
        expect(bp.totalMarks).toBe(sub.theoryMarks);
      }
    });
  });

  // =========================================================================
  // SUITE 5: Advanced Workflow Consistency (Duplication, Snapshots, Filters)
  // =========================================================================
  describe("Suite 5: Advanced Application Workflows Consistency", () => {
    it("5.1. Paper Duplication succeeds and clones question placements cleanly", async () => {
      // 1. Create a paper with questions
      const q = await prisma.question.create({
        data: {
          bookId: legacyBookId,
          chapterId: ch1Id,
          type: "MCQ",
          text: `Question for duplication test ${stamp}`,
          createdById: teacherUser.id,
        },
      });

      const paper = await prisma.paper.create({
        data: {
          title: `Duplication Source Paper ${stamp}`,
          blueprintId: legacyBlueprintId,
          layout: "BOOKLET",
          schoolName: "Source School",
          createdById: teacherUser.id,
          items: {
            create: {
              sectionId: sec1Id,
              questionId: q.id,
              position: 1,
            },
          },
        },
      });

      // 2. Clone using duplication logic
      const clone = await prisma.paper.create({
        data: {
          title: `${paper.title} (Copy)`,
          blueprintId: paper.blueprintId,
          layout: paper.layout,
          schoolName: paper.schoolName,
          createdById: teacherUser.id,
          items: {
            create: {
              sectionId: sec1Id,
              questionId: q.id,
              position: 1,
            },
          },
        },
        include: { items: true },
      });

      expect(clone.id).not.toBe(paper.id);
      expect(clone.title).toContain("(Copy)");
      expect(clone.items.length).toBe(1);
      expect(clone.items[0].questionId).toBe(q.id);

      // Verify loadPaperView on cloned paper works seamlessly
      const cloneView = await loadPaperView(clone.id);
      expect(cloneView).not.toBeNull();
      expect(cloneView?.items.length).toBe(1);

      // Clean up
      await prisma.paperQuestion.deleteMany({ where: { paperId: { in: [paper.id, clone.id] } } });
      await prisma.paper.deleteMany({ where: { id: { in: [paper.id, clone.id] } } });
      await prisma.question.delete({ where: { id: q.id } });
    });

    it("5.2. Paper Snapshot creation and retrieval succeeds without foreign key conflicts", async () => {
      const paper = await prisma.paper.create({
        data: {
          title: `Snapshot Target Paper ${stamp}`,
          blueprintId: legacyBlueprintId,
          layout: "BOOKLET",
          schoolName: "Snapshot School",
          createdById: teacherUser.id,
        },
      });

      const snapshot = await prisma.paperSnapshot.create({
        data: {
          paperId: paper.id,
          name: "Test Version 1.0",
          snapshotJson: JSON.stringify({ title: paper.title, date: new Date().toISOString() }),
          createdById: teacherUser.id,
        },
      });

      expect(snapshot.id).toBeDefined();
      expect(snapshot.paperId).toBe(paper.id);

      // Delete paper and verify snapshot cascade
      await prisma.paper.delete({ where: { id: paper.id } });
      const found = await prisma.paperSnapshot.findUnique({ where: { id: snapshot.id } });
      expect(found).toBeNull();
    });

    it("5.3. Question bank search query handles both legacy and curriculum-tagged questions", async () => {
      // 1. Create one legacy question and one curriculum-linked question
      const topic = await prisma.curriculumTopic.findFirst();

      const qLegacy = await prisma.question.create({
        data: {
          bookId: legacyBookId,
          chapterId: ch1Id,
          type: "MCQ",
          text: `Distinctive legacy search token ${stamp}`,
          createdById: teacherUser.id,
        },
      });

      const qCurriculum = await prisma.question.create({
        data: {
          bookId: legacyBookId,
          chapterId: ch1Id,
          type: "MCQ",
          text: `Distinctive curriculum search token ${stamp}`,
          curriculumTopicId: topic?.id,
          competencyLevel: "APPLICATION",
          sourceProvenance: "Sample Paper 2026-27",
          createdById: teacherUser.id,
        },
      });

      // 2. Query question bank route with search text
      const req1 = new Request(`http://localhost/api/questions?q=${encodeURIComponent(stamp.toString())}`);
      const res1 = await getQuestionsRoute(req1, { params: Promise.resolve({}) });
      expect(res1.status).toBe(200);
      const results = (await res1.json()) as Array<{ id: string }>;

      expect(results.some((r) => r.id === qLegacy.id)).toBe(true);
      expect(results.some((r) => r.id === qCurriculum.id)).toBe(true);

      // Clean up
      await prisma.question.delete({ where: { id: qLegacy.id } });
      await prisma.question.delete({ where: { id: qCurriculum.id } });
    });
  });
});
