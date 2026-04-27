export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getUniqueSessionName(
  baseName: string,
  existingSessions: Record<string, { name: string }>,
): string {
  const names = Object.values(existingSessions).map((s) => s.name);
  if (!names.includes(baseName)) return baseName;

  let counter = 2;
  while (names.includes(`${baseName} (${counter})`)) {
    counter++;
  }
  return `${baseName} (${counter})`;
}
