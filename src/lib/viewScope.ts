import "server-only";
import { isActiveSubject, parseViewScope, type ViewScope } from "./schoolProfile";

/** The teacher's current view (stream + "show other subjects"), carried in the epb_view cookie. */
export function scopeFromRequest(req: Request): ViewScope {
  return parseViewScope(req.headers.get("cookie"));
}

export function keepActive<T>(items: T[], pick: (item: T) => { className?: string | null; subject?: string | null }, scope: ViewScope): T[] {
  return items.filter((it) => {
    const { className, subject } = pick(it);
    return isActiveSubject(className, subject, scope);
  });
}
