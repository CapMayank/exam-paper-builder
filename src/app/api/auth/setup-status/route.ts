import { route } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const GET = route(
  async () => {
    const userCount = await prisma.user.count();
    return {
      initialized: userCount > 0,
      schoolCodeConfigured: Boolean(process.env.SCHOOL_CODE),
    };
  },
  { auth: false },
);
