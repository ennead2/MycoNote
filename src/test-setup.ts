import "@testing-library/jest-dom/vitest";

// jsdom 環境では Node.js ネイティブの structuredClone が Blob を正しくクローンしない問題を修正。
// fake-indexeddb が Blob を structuredClone 経由で保存するため、
// jsdom の Blob クラスを認識できる独自実装でグローバルをオーバーライドする。
const nativeStructuredClone = globalThis.structuredClone;
globalThis.structuredClone = function patchedStructuredClone<T>(value: T, options?: StructuredSerializeOptions): T {
  if (value instanceof Blob) {
    // jsdom の Blob は new Blob([...], {type}) でコピー可能
    return new Blob([value], { type: value.type }) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => patchedStructuredClone(item, options)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) {
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(value as object)) {
        result[key] = patchedStructuredClone((value as Record<string, unknown>)[key], options);
      }
      return result as T;
    }
  }
  return nativeStructuredClone(value, options);
};
