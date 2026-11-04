import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { prisma } from "./prisma";
import { sessionUserId } from "./session";
import { auditContext, entityFromPath } from "./auditContext";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

import type { UserRole } from "./constants";
import { normalizeRole, type Assignment } from "./permissions";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  assignments: Assignment[];
};

export const sessionUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  assignments: { select: { className: true, subject: true } },
} satisfies Prisma.UserSelect;

type Ctx = { params: Promise<Record<string, string>> };

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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
        const row = id ? await prisma.user.findUnique({ where: { id }, select: sessionUserSelect }) : null;
        user = row ? { ...row, role: normalizeRole(row.role) } : null;
        if (!user) throw new HttpError(401, "Not signed in");
        if (!user.active) throw new HttpError(403, "Account is deactivated");
        // the Super Admin holds every right an Admin has; a route meant for the Super Admin alone lists only it
        if (opts.roles && !opts.roles.includes(user.role) && !(user.role === "SUPER_ADMIN" && opts.roles.includes("ADMIN"))) {
          throw new HttpError(403, "Insufficient permissions for this action");
        }
      }
      const params = ctx?.params ? await ctx.params : {};
      const changes = user && WRITE_METHODS.has(req.method);
      const audit = { audited: false };
      const result = changes
        ? await auditContext.run(audit, () => handler(req, params, user as SessionUser))
        : await handler(req, params, user as SessionUser);
      // every change is in the activity log: a general entry when the handler wrote no detailed one
      if (changes && !audit.audited && !(result instanceof Response && !result.ok)) {
        const path = new URL(req.url).pathname;
        const { entityType, entityId } = entityFromPath(path);
        const { recordAudit } = await import("./audit");
        await recordAudit(user!, "API_CHANGE", entityType as never, entityId, { method: req.method, path });
      }
      return result instanceof Response ? result : Response.json(result ?? { ok: true });
    } catch (e) {
      unstable_rethrow(e);
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
