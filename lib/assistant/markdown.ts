/** Minimal, safe Markdown block parser for assistant answers (rendered as React elements). */

export type MarkdownListItem = { text: string; children: string[] };
export type MarkdownBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "rule" }
  | { type: "list"; ordered: boolean; start: number; items: MarkdownListItem[] }
  | { type: "table"; header: string[]; rows: string[][] };

const MAX_TABLE_COLUMNS = 6;
const MAX_TABLE_ROWS = 40;

const isTableRow = (line: string) => /^\s*\|(?:[^|\n]*\|)+[^|\n]*$/.test(line);
const isTableSeparator = (line: string) => /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$/.test(line);

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

export function parseBlocks(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].replace(/\t/g, "    ").trimEnd();
    if (!line.trim()) continue;

    // GitHub-style table: a header row followed by a |---|---| separator.
    if (isTableRow(line) && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const header = splitTableRow(line).slice(0, MAX_TABLE_COLUMNS);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && isTableRow(lines[index])) {
        const cells = splitTableRow(lines[index]);
        if (rows.length < MAX_TABLE_ROWS) rows.push(header.map((_, column) => cells[column] ?? ""));
        index += 1;
      }
      index -= 1;
      blocks.push({ type: "table", header, rows });
      continue;
    }

    const indent = line.length - line.trimStart().length;
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+)$/);
    const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
    const numbered = line.match(/^\s*(\d{1,3})[.)]\s+(.+)$/);
    const previous = blocks.at(-1);
    const lastItem = previous?.type === "list" ? previous.items.at(-1) : undefined;

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) blocks.push({ type: "rule" });
    else if (heading) blocks.push({ type: "heading", text: heading[1].replace(/\*\*/g, "") });
    else if ((bullet || numbered) && indent >= 2 && lastItem) {
      // Indented sub-item: nest it under the current item instead of breaking the list.
      lastItem.children.push(bullet ? bullet[1] : numbered![2]);
    } else if (bullet || numbered) {
      const ordered = Boolean(numbered && !bullet);
      const text = bullet ? bullet[1] : numbered![2];
      if (previous?.type === "list" && previous.ordered === ordered) previous.items.push({ text, children: [] });
      else blocks.push({ type: "list", ordered, start: numbered ? Number(numbered[1]) : 1, items: [{ text, children: [] }] });
    } else if (indent >= 2 && lastItem) {
      // Continuation line of a list item.
      if (lastItem.children.length) lastItem.children[lastItem.children.length - 1] += ` ${line.trim()}`;
      else lastItem.text += ` ${line.trim()}`;
    } else blocks.push({ type: "paragraph", text: line.trim() });
  }
  return blocks;
}
