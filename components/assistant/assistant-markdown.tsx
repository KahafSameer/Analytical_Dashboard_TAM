"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { resolveAnswerLink } from "@/lib/assistant/links";
import { parseBlocks } from "@/lib/assistant/markdown";

/** Inline formatting: links, **bold**, *italic*, `code`. Produces React nodes only (never HTML). */
function renderInline(text: string, knownUrls: ReadonlySet<string>, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\[([^\]\n]{1,200})\]\(([^)\s]{1,2048})\)|\*\*([^*\n]+)\*\*|`([^`\n]+)`|(?<![\w*])\*([^*\n]+)\*(?![\w*])/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${index++}`;
    if (match[1] !== undefined) {
      const link = resolveAnswerLink(match[2], knownUrls);
      const label = renderInline(match[1], knownUrls, `${key}l`);
      if (link?.kind === "internal") nodes.push(<Link key={key} href={link.href}>{label}</Link>);
      else if (link?.kind === "external") nodes.push(<a key={key} href={link.href} target="_blank" rel="noopener noreferrer nofollow">{label}</a>);
      else nodes.push(<span key={key}>{label}</span>);
    } else if (match[3] !== undefined) {
      nodes.push(<strong key={key}>{renderInline(match[3], knownUrls, `${key}b`)}</strong>);
    } else if (match[4] !== undefined) {
      nodes.push(<code key={key}>{match[4]}</code>);
    } else if (match[5] !== undefined) {
      nodes.push(<em key={key}>{match[5]}</em>);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/**
 * Block text with line breaks: models often write `<br>` inside table cells. Only that exact
 * token becomes a <br> element; no other markup is interpreted.
 */
function renderText(text: string, knownUrls: ReadonlySet<string>, keyPrefix: string): ReactNode[] {
  return text.split(/<br\s*\/?>/i).flatMap((part, index) => [
    ...(index > 0 ? [<br key={`${keyPrefix}-br${index}`} />] : []),
    ...renderInline(part, knownUrls, `${keyPrefix}-p${index}`),
  ]);
}

export function AssistantMarkdown({ content, knownUrls }: { content: string; knownUrls: ReadonlySet<string> }) {
  return (
    <div className="assistant-message-text">
      {parseBlocks(content).map((block, index) => {
        const key = `b${index}`;
        if (block.type === "rule") return <hr key={key} />;
        if (block.type === "heading") return <p key={key} className="assistant-md-heading" dir="auto">{renderInline(block.text, knownUrls, key)}</p>;
        if (block.type === "paragraph") return <p key={key} dir="auto">{renderText(block.text, knownUrls, key)}</p>;
        if (block.type === "table") {
          return (
            // Scrollable on narrow screens; focusable so keyboard users can scroll it.
            <div key={key} className="assistant-md-table" role="region" aria-label="Table" tabIndex={0}>
              <table dir="auto">
                <thead>
                  <tr>{block.header.map((cell, cellIndex) => <th key={cellIndex} scope="col" dir="auto">{renderText(cell, knownUrls, `${key}-h${cellIndex}`)}</th>)}</tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} dir="auto">{renderText(cell, knownUrls, `${key}-${rowIndex}-${cellIndex}`)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        const items = block.items.map((item, itemIndex) => (
          <li key={itemIndex}>
            {renderText(item.text, knownUrls, `${key}-${itemIndex}`)}
            {item.children.length > 0 && (
              <ul>
                {item.children.map((child, childIndex) => <li key={childIndex}>{renderInline(child, knownUrls, `${key}-${itemIndex}-${childIndex}`)}</li>)}
              </ul>
            )}
          </li>
        ));
        return block.ordered
          ? <ol key={key} dir="auto" start={block.start}>{items}</ol>
          : <ul key={key} dir="auto">{items}</ul>;
      })}
    </div>
  );
}
