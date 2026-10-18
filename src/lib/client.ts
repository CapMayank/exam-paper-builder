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
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export async function uploadImage(file: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", file, file instanceof File ? file.name : "drawing.png");
  const { name } = await api<{ name: string }>("/api/uploads", { method: "POST", body: form });
  return name;
}

export const imageUrl = (name: string) => `/api/uploads/${name}`;
