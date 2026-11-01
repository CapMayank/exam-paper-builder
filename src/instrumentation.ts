export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureCurriculumSeeded } = await import("@/lib/curriculumInit");
    try {
      await ensureCurriculumSeeded();
    } catch (err) {
      console.error("❌ [Instrumentation] Startup curriculum initialization error:", err);
    }
  }
}
