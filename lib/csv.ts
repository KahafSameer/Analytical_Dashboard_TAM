export function serializeCsv(rows: readonly (readonly unknown[])[]): string {
  return rows
    .map((row) => row.map((value) => {
      const text = String(value ?? "");
      const safeText = typeof value === "string" && /^\s*[=+\-@]/.test(text)
        ? `'${text}`
        : text;
      return `"${safeText.replaceAll('"', '""')}"`;
    }).join(","))
    .join("\r\n");
}
