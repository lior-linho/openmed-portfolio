export function updateByPath<T extends Record<string, any>>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".").filter(Boolean);
  if (keys.length === 0) return obj;

  // shallow copy root
  const out: any = { ...obj };
  let cur: any = out;
  let src: any = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (src == null || typeof src !== "object" || !(k in src)) {
      throw new Error(`Invalid path: ${path}`);
    }
    cur[k] = { ...src[k] }; // structural sharing
    cur = cur[k];
    src = src[k];
  }

  const last = keys[keys.length - 1];
  if (src == null || typeof src !== "object" || !(last in src)) {
    throw new Error(`Invalid path: ${path}`);
  }

  cur[last] = value;
  return out;
}
