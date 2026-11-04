/** Small fetch wrapper: JSON in/out, throws Error(message) from `{ error }`, bounces to /login on 401. */
export async function api<T = unknown>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // Hard navigation on purpose: drops all client state of the signed-out session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (res.status === 401 && !location.pathname.startsWith("/login")) location.href = "/login";
    throw Object.assign(new Error(data?.error ?? `Request failed (${res.status})`), { status: res.status });
  }
  return data as T;
}

/**
 * Runs `fn`, and runs it again after a pause when it failed with a transient server error (502 / 503: the AI was
 * busy or answered badly). Never retries a spent quota (429) or a bad request, which waiting cannot fix.
 */
export async function retryTransient<T>(
  fn: () => Promise<T>,
  opts: { delaysMs?: number[]; signal?: AbortSignal; onRetry?: (attempt: number, waitMs: number, err: Error) => void } = {},
): Promise<T> {
  const delays = opts.delaysMs ?? [8_000, 20_000];
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number }).status;
      const transient = status === 502 || status === 503;
      if (!transient || attempt >= delays.length || opts.signal?.aborted) throw err;
      opts.onRetry?.(attempt + 1, delays[attempt], err as Error);
      await new Promise((r) => setTimeout(r, delays[attempt]));
      if (opts.signal?.aborted) throw err;
    }
  }
}

export async function uploadImage(file: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", file, file instanceof File ? file.name : "drawing.png");
  const { name } = await api<{ name: string }>("/api/uploads", { method: "POST", body: form });
  return name;
}

export const imageUrl = (name: string) => `/api/uploads/${name}`;
