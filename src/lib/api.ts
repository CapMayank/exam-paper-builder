import "server-only";
import { ZodError } from "zod";
import { prisma } from "./prisma";
import { sessionUserId } from "./session";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

import type { UserRole } from "./constants";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  active: boolean;
};

type Ctx = { params: Promise<Record<string, string>> };

/**
 * Wraps a route handler: requires a logged-in user, parses errors into JSON `{ error }`.
 * Handler receives (request, params, user) and returns any JSON-serialisable value.
 */
export function route(
  handler: (req: Request, params: Record<string, string>, user: SessionUser) => Promise<unknown>,
  opts: { auth?: boolean; roles?: UserRole[] } = { auth: true },
) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      let user = null as SessionUser | null;
      if (opts.auth !== false) {
        const id = await sessionUserId(req);
        user = id
          ? ((await prisma.user.findUnique({
              where: { id },
              select: { id: true, name: true, email: true, role: true, department: true, active: true },
            })) as SessionUser | null)
          : null;
        if (!user) throw new HttpError(401, "Not signed in");
        if (!user.active) throw new HttpError(403, "Account is deactivated");
        if (opts.roles && !opts.roles.includes(user.role)) {
          throw new HttpError(403, "Insufficient permissions for this action");
        }
      }
      const params = ctx?.params ? await ctx.params : {};
      const result = await handler(req, params, user as SessionUser);
      return result instanceof Response ? result : Response.json(result ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) {
        const msg = e.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
        return Response.json({ error: msg }, { status: 400 });
      }
      console.error(e);
      return Response.json({ error: "Something went wrong on the server" }, { status: 500 });
    }
  };
}

export async function body<T>(req: Request, schema: { parse: (v: unknown) => T }): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON");
  }
  return schema.parse(json);
}
