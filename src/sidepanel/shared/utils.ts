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

export function formatRelativeDate(timestamp: number): string {
  const diffDays = Math.floor((Date.now() - timestamp) / 86400000);
  const time = new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  if (diffDays === 0) return `Today • ${time}`;
  if (diffDays === 1) return `Yesterday • ${time}`;
  if (diffDays < 7) return `${diffDays} Days Ago • ${time}`;
  return `${new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })} • ${time}`;
}
