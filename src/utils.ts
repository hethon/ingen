export function getOrThrow<K, V>(map: Map<K, V>, key: K, context: string): V {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error(`internal error: expected a value for "${key}" (${context})`);
  }
  return value;
}
