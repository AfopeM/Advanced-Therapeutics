/**
 * Escapes characters that have special meaning in RTF.
 */
function escapeRtf(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}");
}

/**
 * Converts a plain-text script into a minimal RTF document string.
 */
function buildRtf(scriptText: string): string {
  const escaped = escapeRtf(scriptText).split("\n").join("\\par\n");

  return `{\\rtf1\\ansi{\\fonttbl\\f0 Arial;}\\f0\\fs24 ${escaped}}`;
}

/**
 * Triggers a file download of the filled script as an RTF file.
 * @param scriptText  The script with tokens already replaced by pill values.
 * @param filename    e.g. "John Doe - Device Confirmation.rtf"
 */
export function downloadRtf(scriptText: string, filename: string): void {
  const rtf = buildRtf(scriptText);
  const blob = new Blob([rtf], { type: "application/rtf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Builds the RTF filename from the patient name and session name.
 * e.g. "John Doe - Call Script.rtf"
 */
export function buildRtfFilename(
  patientName: string,
  sessionName: string,
): string {
  const safe = (s: string) => s.replace(/[/\\?%*:|"<>]/g, "-");
  return `${safe(patientName)} - ${safe(sessionName)}.rtf`;
}
