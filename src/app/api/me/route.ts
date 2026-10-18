import { route } from "@/lib/api";

export const GET = route(async (_req, _params, user) => user);
