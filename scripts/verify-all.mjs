// Comprehensive Functional & Quality Verification Suite for Exam Paper Builder
import { parseMathSegments } from "../src/lib/math.ts";
import { parseBulkQuestions } from "../src/lib/bulkImport.ts";
import { permuteMcqOptions, nextSetIdentifier, shuffle } from "../src/lib/multiset.ts";
import { validateBlueprint, blueprintTotalMarks, whyCannotAdd } from "../src/lib/blueprint.ts";
import { imposeBooklet, paginate, bookletPageCount } from "../src/lib/layout.ts";

const base = process.argv[2] ?? "http://localhost:3100";
let failures = 0;
let passes = 0;

function assert(name, condition, extra = "") {
  if (condition) {
    passes++;
    console.log(`  ✓ PASS: ${name}`);
  } else {
    failures++;
    console.error(`  ✗ FAIL: ${name}${extra ? " -> " + extra : ""}`);
  }
}

console.log("\n=======================================================");
console.log(" EXAM PAPER BUILDER — DEEP FUNCTIONALITY VERIFICATION");
console.log("=======================================================\n");

// -----------------------------------------------------------------
// 1. MATH RENDERING (KaTeX) VERIFICATION
// -----------------------------------------------------------------
console.log("1. Verifying KaTeX Mathematical & Chemical Formula Rendering:");
{
  const inlineSample = "Calculate velocity using $v = u + at$ where acceleration is constant.";
  const inlineSegments = parseMathSegments(inlineSample);
  const mathSeg = inlineSegments.find((s) => s.type === "math");
  assert("Inline math parsed as type: 'math'", !!mathSeg);
  assert("Inline math segment contains KaTeX rendered html", mathSeg?.html.includes('class="katex"'));
  assert("Inline math preserves preceding text", inlineSegments[0].type === "text" && inlineSegments[0].text.includes("Calculate velocity using"));

  const displaySample = "The quadratic formula is: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$";
  const displaySegments = parseMathSegments(displaySample);
  const displayMathSeg = displaySegments.find((s) => s.type === "math");
  assert("Display math segment marked with display: true", displayMathSeg?.display === true);
  assert("Display math contains katex-display", displayMathSeg?.html.includes('katex-display'));

  const chemicalSample = "Balanced reaction: $2H_2 + O_2 \\rightarrow 2H_2O$";
  const chemSegments = parseMathSegments(chemicalSample);
  const chemMathSeg = chemSegments.find((s) => s.type === "math");
  assert("Chemical equations render with KaTeX", chemMathSeg?.html.includes('class="katex"'));

  const emptySegments = parseMathSegments("");
  assert("Handles empty strings gracefully", emptySegments.length === 0);

  const plainSegments = parseMathSegments("Plain text without any math delimiters.");
  assert("Plain text parsed as single text segment", plainSegments.length === 1 && plainSegments[0].type === "text");
}

// -----------------------------------------------------------------
// 2. BULK INGESTION PARSER VERIFICATION
// -----------------------------------------------------------------
console.log("\n2. Verifying Bulk Question Ingestion Parser:");
{
  const rawText = `Type: MCQ
Q: What is the SI unit of power?
A: Joule
B: Watt
C: Newton
D: Pascal
Ans: B
Diff: EASY

---

Type: SHORT
Q: Define electric current and state its formula: $I = \\frac{q}{t}$.
Ans: Rate of flow of electric charges. Measured in Amperes.
Space: 25
Diff: MEDIUM

---

Type: LONG
Q: Explain the working of an AC generator with a neat diagram.
Ans: Works on electromagnetic induction. Coil rotates in magnetic field inducing alternating EMF.
Space: 50
Diff: HARD

---

Type: DRAWING
Q: Draw the ray diagram for a concave mirror when object is at C.
Ans: Image formed at C, real, inverted, same size.
Space: 60
Diff: MEDIUM`;

  const parsed = parseBulkQuestions(rawText, "SHORT");
  assert("Parsed all 4 questions from raw text", parsed.length === 4);
  assert("First question correctly identified as MCQ", parsed[0].type === "MCQ");
  assert("MCQ has 4 options", parsed[0].options.length === 4 && parsed[0].options[1] === "Watt");
  assert("MCQ answer parsed as B", parsed[0].answer === "B");
  assert("MCQ difficulty is EASY", parsed[0].difficulty === "EASY");

  assert("Second question is SHORT with math", parsed[1].type === "SHORT" && parsed[1].text.includes("$I = \\frac{q}{t}$"));
  assert("Second question spaceMm is 25", parsed[1].spaceMm === 25);

  assert("Third question is LONG", parsed[2].type === "LONG" && parsed[2].spaceMm === 50);
  assert("Fourth question is DRAW (aliased from DRAWING)", parsed[3].type === "DRAW" && parsed[3].spaceMm === 60);

  // Fallback defaults test
  const untypedText = `Q: Quick question without type specified?\nAns: Answer here.`;
  const fallbackParsed = parseBulkQuestions(untypedText, "SHORT");
  assert("Uses fallback type when unspecified", fallbackParsed.length === 1 && fallbackParsed[0].type === "SHORT");
}

// -----------------------------------------------------------------
// 3. MULTI-SET GENERATION & OPTION PERMUTATION VERIFICATION
// -----------------------------------------------------------------
console.log("\n3. Verifying Multi-Set Generation & Answer Key Synchronization:");
{
  assert("nextSetIdentifier generates SET B from SET A", nextSetIdentifier("SET A") === "SET B");
  assert("nextSetIdentifier generates SET C from SET B", nextSetIdentifier("SET B") === "SET C");
  assert("nextSetIdentifier generates SET 2 from Set 1", nextSetIdentifier("Set 1") === "SET 2");

  const originalOptions = ["Concave Mirror", "Convex Mirror", "Plane Mirror", "Cylindrical Mirror"];
  const originalAnswer = "A"; // "Concave Mirror"
  
  // Test 10 iterations of permuteMcqOptions to ensure answer key always tracks the correct text
  let trackedCorrectlyAllTimes = true;
  for (let i = 0; i < 10; i++) {
    const permuted = permuteMcqOptions(originalOptions, originalAnswer);
    const newIdx = permuted.answer.charCodeAt(0) - 65;
    if (permuted.options[newIdx] !== "Concave Mirror") {
      trackedCorrectlyAllTimes = false;
      break;
    }
  }
  assert("permuteMcqOptions preserves correct answer across 10 random permutations", trackedCorrectlyAllTimes);

  const shuffledArr = shuffle([1, 2, 3, 4, 5]);
  assert("shuffle preserves array length", shuffledArr.length === 5);
  assert("shuffle contains all original elements", [1, 2, 3, 4, 5].every((x) => shuffledArr.includes(x)));
}

// -----------------------------------------------------------------
// 4. BLUEPRINT ARITHMETIC & CONSTRAINT ENGINE
// -----------------------------------------------------------------
console.log("\n4. Verifying Blueprint Arithmetic Engine:");
{
  const validDef = {
    sections: [
      { id: "s1", type: "MCQ", count: 10, marksEach: 1 },
      { id: "s2", type: "SHORT", count: 5, marksEach: 2 },
    ],
    chapters: [
      { chapterId: "c1", marks: 10 },
      { chapterId: "c2", marks: 10 },
    ],
  };
  assert("Section marks sum correctly to 20", blueprintTotalMarks(validDef.sections) === 20);

  const errors = validateBlueprint(validDef);
  assert("Valid balanced blueprint has 0 validation errors", errors.length === 0);

  const imbalancedDef = {
    sections: [{ id: "s1", type: "MCQ", count: 5, marksEach: 1 }],
    chapters: [{ chapterId: "c1", marks: 10 }],
  };
  const imbalancedErrors = validateBlueprint(imbalancedDef);
  assert("Imbalanced blueprint caught by validator", imbalancedErrors.length > 0 && imbalancedErrors[0].includes("match"));

  // whyCannotAdd checks
  const placed = [{ sectionId: "s1", chapterId: "c1" }];
  const reasonWrongType = whyCannotAdd(validDef, placed, { sectionId: "s1", chapterId: "c1", type: "LONG" });
  assert("whyCannotAdd catches wrong question type", reasonWrongType !== null && reasonWrongType.includes("only accepts"));
}

// -----------------------------------------------------------------
// 5. PURE PRINT LAYOUT & SADDLE-STITCH IMPOSITION ENGINE
// -----------------------------------------------------------------
console.log("\n5. Verifying A3 Booklet Imposition & Pagination Engine:");
{
  assert("Booklet page count rounds up to multiple of 4 (1 -> 4)", bookletPageCount(1) === 4);
  assert("Booklet page count rounds up to multiple of 4 (5 -> 8)", bookletPageCount(5) === 8);

  // 4-page booklet test: Front should have [Page 4, Page 1] (index [3, 0]), Back has [Page 2, Page 3] (index [1, 2])
  const sheets4 = imposeBooklet(4);
  assert("4-page document generates 1 A3 sheet (2 sides)", sheets4.length === 1);
  assert("Sheet 1 Front contains Page 4 (left) and Page 1 (right)", sheets4[0].front[0] === 3 && sheets4[0].front[1] === 0);
  assert("Sheet 1 Back contains Page 2 (left) and Page 3 (right)", sheets4[0].back[0] === 1 && sheets4[0].back[1] === 2);

  // 8-page booklet test
  const sheets8 = imposeBooklet(8);
  assert("8-page document generates 2 A3 sheets", sheets8.length === 2);
  assert("Sheet 1 Front contains Page 8 and Page 1", sheets8[0].front[0] === 7 && sheets8[0].front[1] === 0);
  assert("Sheet 2 Front contains Page 6 and Page 3", sheets8[1].front[0] === 5 && sheets8[1].front[1] === 2);

  // Pagination greedy packing with keepWithNext
  const heights = [40, 50, 30, 40];
  const keepWithNext = [true, false, false, false];
  const pages = paginate(heights, keepWithNext, 100);
  assert("Glues keepWithNext item with next item", pages[0].includes(0) && pages[0].includes(1));
}

// -----------------------------------------------------------------
// 6. RUNNING DEV SERVER & ENDPOINT VERIFICATION
// -----------------------------------------------------------------
console.log("\n6. Verifying Live Server Endpoints & Data Payloads:");
async function runServerChecks() {
  let cookie = "";
  const authCall = async (method, path, body) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const sc = res.headers.get("set-cookie");
    if (sc) cookie = sc.split(";")[0];
    return res;
  };

  // Login with seeded credentials
  const loginRes = await authCall("POST", "/api/auth/login", {
    email: "teacher@school.edu",
    password: "password123",
  });
  assert("Teacher login succeeds", loginRes.status === 200);

  // Check GET /api/papers
  const papersRes = await authCall("GET", "/api/papers");
  const papers = await papersRes.json();
  assert("GET /api/papers returns list of papers", Array.isArray(papers) && papers.length > 0);

  const targetPaper = papers[0];
  console.log(`  -> Testing with Paper ID: ${targetPaper.id} ("${targetPaper.title}")`);

  // Verify Single Paper Data via API
  const paperDetailRes = await authCall("GET", `/api/papers/${targetPaper.id}`);
  assert("GET /api/papers/[id] returns HTTP 200", paperDetailRes.status === 200);
  const paperDetail = await paperDetailRes.json();
  assert("Paper data has schoolName", typeof paperDetail.schoolName === "string");
  assert("Paper data has title", typeof paperDetail.title === "string");
  assert("Paper data has blueprint with sections", paperDetail.blueprint.sections.length > 0);
  assert("Paper data has items array", Array.isArray(paperDetail.items));
  assert("Paper data has progress calculation", typeof paperDetail.progress.totalMarks === "number");

  // Verify Print Preview Page Route
  const printPageRes = await authCall("GET", `/papers/${targetPaper.id}/print`);
  assert("GET /papers/[id]/print returns HTTP 200", printPageRes.status === 200);

  // Verify Solutions / Marking Scheme Route
  const solPageRes = await authCall("GET", `/papers/${targetPaper.id}/solutions`);
  assert("GET /papers/[id]/solutions returns HTTP 200", solPageRes.status === 200);

  // Verify Main App Pages
  const dashboardRes = await authCall("GET", `/`);
  assert("GET / (Dashboard) returns HTTP 200", dashboardRes.status === 200);

  const papersPageRes = await authCall("GET", `/papers`);
  assert("GET /papers returns HTTP 200", papersPageRes.status === 200);

  const questionsPageRes = await authCall("GET", `/questions`);
  assert("GET /questions returns HTTP 200", questionsPageRes.status === 200);

  const blueprintsPageRes = await authCall("GET", `/blueprints`);
  assert("GET /blueprints returns HTTP 200", blueprintsPageRes.status === 200);

  const booksPageRes = await authCall("GET", `/books`);
  assert("GET /books returns HTTP 200", booksPageRes.status === 200);

  console.log("\n=======================================================");
  console.log(` RESULTS: ${passes} Passed, ${failures} Failed`);
  console.log("=======================================================\n");

  if (failures > 0) {
    process.exit(1);
  }
}

runServerChecks().catch((err) => {
  console.error("Execution error during checks:", err);
  process.exit(1);
});
