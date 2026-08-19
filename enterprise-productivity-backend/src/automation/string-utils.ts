/**
 * Safe stringification of values coming from dynamic JSON (workflow config /
 * trigger payloads) that avoids @typescript-eslint/no-base-to-string on
 * `unknown` values and never produces "[object Object]".
 */
export function toDisplayString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}
