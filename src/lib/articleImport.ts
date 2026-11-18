/**
 * Import a Word (.docx) or PDF article into structured article blocks.
 *
 * Everything runs in the browser: the file is never uploaded. Word gives the
 * highest fidelity because the document already carries semantic headings,
 * tables and real footnotes. PDF is text-only: it is read line by line, the
 * Arabic ligature artifacts produced by many PDF exporters are repaired, and
 * the caller is warned about anything that cannot be recovered (images,
 * tables, footnote anchors).
 */

import {
  createArticleBlock,
  makeArticleId,
  type ArticleBlock,
  type ArticleFootnotesBlock,
  type ArticleHeadingBlock,
  type ArticleListBlock,
  type ArticleNumbering,
  type ArticleParagraphBlock,
  type ArticleReferenceGroup,
  type ArticleReferencesBlock,
  type ArticleSummaryBlock,
  type ArticleTableBlock,
} from "@/lib/articleBlocks";

export type ArticleImportFormat = "docx" | "pdf";
export type ArticleImportMode = "append" | "replace";

export interface ArticleImportOptions {
  /** Drop the title/author block before the first heading. */
  skipCover: boolean;
  /** Turn a trailing references section into a references block. */
  detectReferences: boolean;
  /** Turn a short summary/conclusion section into its dedicated block. */
  detectSummary: boolean;
  /** Import Word footnotes and link their in-text markers. */
  includeFootnotes: boolean;
  /** Treat the first table row as a header when the document has no <th>. */
  firstRowHeader: boolean;
  /** Repair the reversed lam-alef ligatures common in Arabic PDF exports. */
  repairArabic: boolean;
}

export interface ArticleImportStats {
  headings: number;
  paragraphs: number;
  lists: number;
  tables: number;
  footnotes: number;
  references: number;
  words: number;
  skippedImages: number;
  pages?: number;
}

export interface ArticleImportResult {
  blocks: ArticleBlock[];
  title: string;
  format: ArticleImportFormat;
  stats: ArticleImportStats;
  warnings: string[];
}

export interface ArticleImportPayload {
  blocks: ArticleBlock[];
  title?: string;
  mode: ArticleImportMode;
}

export const DEFAULT_ARTICLE_IMPORT_OPTIONS: ArticleImportOptions = {
  skipCover: true,
  detectReferences: true,
  detectSummary: true,
  includeFootnotes: true,
  firstRowHeader: true,
  repairArabic: true,
};

const MAX_FILE_BYTES = 30 * 1024 * 1024;
const MAX_BLOCKS = 2000;
const MAX_PDF_PAGES = 200;
const MAX_PDF_TEXT = 1_500_000;

const ARABIC_LETTER = /[\u0621-\u064A\u0660-\u0669\u066E-\u06D3\u06FA-\u06FF]/;
const LATIN_LETTER = /[A-Za-z\u00C0-\u024F]/;

const stripPua = (value: string): string =>
  value.replace(/[\uE000-\uF8FF]/g, "");

const normalizeNewlines = (value: string): string =>
  value.replace(/\r\n?/g, "\n");

/** Clean a text run without touching meaningful line breaks. */
export function cleanImportText(value: string): string {
  return normalizeNewlines(String(value ?? ""))
    .replace(/\u00a0/g, " ")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
    .replace(/[\uE000-\uF8FF]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const countWords = (value: string): number =>
  stripPua(value)
    .replace(/\[\[(?:note|ref):[^\]]+\]\]/g, " ")
    .replace(/[*_[\]#>`]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

const isElement = (node: Node): node is Element => node.nodeType === Node.ELEMENT_NODE;

const tagOf = (node: Element): string => node.tagName.toLowerCase();

/**
 * Convert a DOM subtree into the plain-text inline format used by blocks:
 * `**bold**`, `*italic*` and `[label](https://url)`. Raw HTML is never kept.
 */
function inlineMarkup(node: Node): string {
  let result = "";
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      result += child.textContent ?? "";
      return;
    }
    if (!isElement(child)) return;
    const tag = tagOf(child);
    if (tag === "br") {
      result += "\n";
      return;
    }
    if (tag === "script" || tag === "style" || tag === "img" || tag === "svg" || tag === "picture") {
      return;
    }
    const inner = inlineMarkup(child);
    if (tag === "strong" || tag === "b") {
      const trimmed = inner.trim();
      if (trimmed) {
        const leading = /^\s/.test(inner) ? " " : "";
        const trailing = /\s$/.test(inner) ? " " : "";
        result += `${leading}**${trimmed}**${trailing}`;
      }
      return;
    }
    if (tag === "em" || tag === "i") {
      const trimmed = inner.trim();
      if (trimmed) {
        const leading = /^\s/.test(inner) ? " " : "";
        const trailing = /\s$/.test(inner) ? " " : "";
        result += `${leading}*${trimmed}*${trailing}`;
      }
      return;
    }
    if (tag === "a") {
      const href = (child.getAttribute("href") || "").trim();
      const label = inner.trim();
      if (/^https?:\/\//i.test(href)) {
        if (label && label !== href) result += `[${label}](${href})`;
        else result += label || href;
        return;
      }
      result += inner;
      return;
    }
    result += inner;
  });
  return result;
}

function cleanHeading(value: string): string {
  let text = cleanImportText(value).replace(/\n+/g, " ");
  text = text.replace(
    /^[\s\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}]+/u,
    "",
  );
  text = text.replace(/^[\s–—•·▪◦-]+/, "");
  // Headings are already emphasised; drop leftover **…** / *…* markers.
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1$2");
  return text.trim();
}

function cleanParagraph(value: string): string {
  return cleanImportText(value)
    .replace(/^[\s–—•·▪◦-]+/, "")
    .trim();
}

function detectListMarker(value: string): {
  ordered: boolean;
  numbering: ArticleNumbering;
  text: string;
} | null {
  const text = normalizeNewlines(value).replace(/^\s+/, "");
  if (!text) return null;

  // Word's manual bullets often arrive as a private-use glyph.
  const puaBullet = text.match(/^[\uE000-\uF8FF]\s*(.*)$/s);
  if (puaBullet && cleanImportText(puaBullet[1])) {
    return { ordered: false, numbering: "arabic", text: puaBullet[1].trim() };
  }

  const bullet = text.match(
    /^(?:[•·▪◦●○■□✓✔➤►▶*]|[–—-])\s+(.*)$/s,
  );
  if (bullet && cleanImportText(bullet[1])) {
    return { ordered: false, numbering: "arabic", text: bullet[1].trim() };
  }

  const numbered = text.match(/^\(?([0-9٠-٩]+)[).\-:]\s+(.*)$/s);
  if (numbered && cleanImportText(numbered[2])) {
    return {
      ordered: true,
      numbering: /[٠-٩]/.test(numbered[1]) ? "arabic" : "western",
      text: numbered[2].trim(),
    };
  }

  return null;
}

const REFERENCE_HEADING =
  /^(?:قائمة\s+)?(?:المراجع|المصادر|المراجع\s+والمصادر|قائمة\s+المصادر|Bibliography|References|Works\s+Cited)$/i;

const REFERENCE_GROUP_HEADING =
  /(?:المراجع|المصادر|العربية|الأجنبية|اللاتينية|الدوريات|الكتب|المقالات|References|Bibliography|Arabic|Foreign|Latin)/i;

const SUMMARY_HEADING =
  /^(?:خلاصة|ملخص|الخلاصة|ملخص\s+المقال|خلاصة\s+المقال)(?:\s|:|$)/;
const CONCLUSION_HEADING = /^(?:خاتمة|الخاتمة)(?:\s|:|$)/;
const MAIN_HEADING =
  /^(?:المحور|مقدمة|قسم\s+تطبيقي|عشر\s+وصايا|أدوات\s+وقواعد|خاتمة|الخاتمة|قائمة\s+المراجع|المراجع|المصادر|خلاصة|ملخص)/;

function normalizeHeadingLevels(blocks: ArticleBlock[]): ArticleBlock[] {
  return blocks.map((block, index) => {
    if (block.type !== "heading" || block.level !== 2) return block;
    const previous = blocks[index - 1];
    if (
      previous?.type === "heading" &&
      previous.level === 2 &&
      !MAIN_HEADING.test(block.text)
    ) {
      return { ...block, level: 3 };
    }
    return block;
  });
}

function buildHeading(parent: Element, level: 2 | 3): ArticleHeadingBlock | null {
  const text = cleanHeading(inlineMarkup(parent));
  if (!text) return null;
  const block = createArticleBlock("heading") as ArticleHeadingBlock;
  block.level = level;
  block.text = text;
  return block;
}

function buildParagraph(parent: Element): ArticleParagraphBlock | null {
  const text = cleanParagraph(inlineMarkup(parent));
  if (!text) return null;
  const block = createArticleBlock("paragraph") as ArticleParagraphBlock;
  block.text = text;
  return block;
}

function tableToBlock(table: Element, firstRowHeader: boolean): ArticleTableBlock | null {
  const rowElements = Array.from(table.querySelectorAll("tr"));
  const rows = rowElements
    .map((row) => {
      const cells: string[] = [];
      Array.from(row.querySelectorAll(":scope > th, :scope > td")).forEach((cell) => {
        const span = Math.max(1, Math.min(12, Number(cell.getAttribute("colspan") || 1)));
        const value = cleanImportText(inlineMarkup(cell)).replace(/\n+/g, " ").trim();
        for (let index = 0; index < span; index += 1) {
          cells.push(index === 0 ? value : "");
        }
      });
      return cells;
    })
    .filter((row) => row.some((cell) => cell.trim()));

  if (!rows.length) return null;

  const headerRow = table.querySelector("thead th") ?? table.querySelector("tr:first-child th");
  let headers: string[];
  let dataRows: string[][];

  if (headerRow) {
    headers = rows[0];
    dataRows = rows.slice(1);
  } else if (firstRowHeader && rows.length > 1) {
    headers = rows[0];
    dataRows = rows.slice(1);
  } else if (rows.length === 1 || rows[0].every((cell) => !cell.trim())) {
    headers = rows[0];
    dataRows = rows.slice(1);
  } else {
    headers = rows[0].map(() => "");
    dataRows = rows;
  }

  const columnCount = Math.max(headers.length, ...dataRows.map((row) => row.length), 1);
  const block = createArticleBlock("table") as ArticleTableBlock;
  block.caption = cleanImportText(
    table.querySelector("caption") ? inlineMarkup(table.querySelector("caption")!) : "",
  ).replace(/\n+/g, " ");
  block.headers = Array.from({ length: columnCount }, (_, index) => headers[index] ?? "");
  block.rows = dataRows.map((row) =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? ""),
  );
  return block;
}

interface ImportedFootnote {
  id: string;
  text: string;
}

function extractFootnotes(root: Element): ImportedFootnote[] {
  const notes: ImportedFootnote[] = [];
  const bySourceId = new Map<string, ImportedFootnote>();

  root.querySelectorAll('li[id^="footnote-"]').forEach((item) => {
    item.querySelectorAll('a[href^="#footnote-ref-"]').forEach((backlink) => backlink.remove());
    const sourceId = item.getAttribute("id") || "";
    if (!sourceId) return;
    const text = stripPua(inlineMarkup(item))
      .replace(/^\s*\(\s*\)\s*/, "")
      .replace(/\s*↑\s*$/, "")
      .trim();
    if (!text) return;
    const note: ImportedFootnote = { id: makeArticleId("fn"), text };
    bySourceId.set(sourceId, note);
    notes.push(note);
  });

  // Replace Word's superscript link with a stable block marker.
  root.querySelectorAll('sup a[href^="#footnote-"]').forEach((anchor) => {
    const target = (anchor.getAttribute("href") || "").slice(1);
    const note = bySourceId.get(target);
    const sup = anchor.closest("sup");
    if (!sup) return;
    if (note) sup.replaceWith(anchor.ownerDocument.createTextNode(`[[note:${note.id}]]`));
    else sup.remove();
  });

  // Drop the now-empty endnote list and its wrapper.
  root.querySelectorAll('li[id^="footnote-"]').forEach((item) => item.remove());
  root.querySelectorAll("ol, ul").forEach((list) => {
    if (!list.querySelector("li") && !cleanImportText(list.textContent || "")) list.remove();
  });

  return notes;
}

function detectCoverTitle(texts: string[]): string {
  const values = texts
    .map((text) => cleanImportText(text).replace(/\n+/g, " ").trim())
    .filter((text) => text && !/^[\s\-–—•·_]+$/.test(text));
  if (!values.length) return "";

  const first = values[0];
  const second = values[1];
  const skipSecond =
    !second ||
    second.length > 130 ||
    /^(?:إعداد|قسم|شركة|نوفمبر|دليل|سلسلة|مقالات|www\.|https?:|©)/i.test(second) ||
    /[.؟!]$/.test(first) ||
    first.includes(":") ||
    /^[\d٠-٩]/.test(second);

  return skipSecond ? first : `${first}: ${second}`;
}

/* -------------------------------------------------------------------------- */
/* Word                                                                       */
/* -------------------------------------------------------------------------- */

function blocksFromDocxHtml(
  html: string,
  options: ArticleImportOptions,
): { blocks: ArticleBlock[]; title: string; footnotes: number; images: number } {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = doc.body;
  const images = root.querySelectorAll("img").length;
  root.querySelectorAll("img, picture, svg").forEach((image) => image.remove());

  const notes = options.includeFootnotes ? extractFootnotes(root) : [];
  if (!options.includeFootnotes) {
    root.querySelectorAll('li[id^="footnote-"]').forEach((item) => item.remove());
    root.querySelectorAll('sup a[href^="#footnote-"]').forEach((anchor) => anchor.closest("sup")?.remove());
  }

  const firstHeading = root.querySelector("h1, h2, h3, h4, h5, h6");
  const leadingTexts: string[] = [];
  for (const child of Array.from(root.children)) {
    if (child === firstHeading) break;
    if (child.matches("h1, h2, h3, h4, h5, h6, ul, ol, table")) break;
    const text = cleanImportText(inlineMarkup(child));
    if (text) leadingTexts.push(text);
    if (leadingTexts.length >= 6) break;
  }
  const title = detectCoverTitle(leadingTexts);
  const skipCover = options.skipCover && Boolean(title) && Boolean(firstHeading);

  const blocks: ArticleBlock[] = [];
  let listBuffer: { ordered: boolean; numbering: ArticleNumbering; items: string[] } | null = null;
  let seenHeading = false;

  const flushList = () => {
    if (!listBuffer) return;
    const items = listBuffer.items.filter((item) => cleanImportText(item));
    if (items.length) {
      const block = createArticleBlock("list") as ArticleListBlock;
      block.ordered = listBuffer.ordered;
      block.numbering = listBuffer.numbering;
      block.items = items;
      blocks.push(block);
    }
    listBuffer = null;
  };

  const addListItem = (item: ReturnType<typeof detectListMarker>) => {
    if (!item) return;
    if (listBuffer && listBuffer.ordered !== item.ordered) flushList();
    if (!listBuffer) {
      listBuffer = { ordered: item.ordered, numbering: item.numbering, items: [] };
    }
    const text = cleanImportText(item.text);
    if (text) listBuffer.items.push(text);
  };

  const walk = (nodes: NodeList) => {
    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (skipCover && !seenHeading) return;
        const text = cleanParagraph(node.textContent || "");
        if (text) {
          flushList();
          const block = createArticleBlock("paragraph") as ArticleParagraphBlock;
          block.text = text;
          blocks.push(block);
        }
        return;
      }
      if (!isElement(node)) return;
      const tag = tagOf(node);
      if (tag === "script" || tag === "style" || tag === "noscript" || tag === "img") return;
      const isContainer = /^(div|section|article|main)$/.test(tag);
      if (skipCover && !seenHeading && !isContainer && !/^h[1-6]$/.test(tag)) return;

      if (/^h[1-6]$/.test(tag)) {
        const level = tag === "h1" ? 2 : 3;
        const heading = buildHeading(node, level);
        if (!heading) return;
        if (skipCover && !seenHeading) {
          // The first heading marks the start of the article body. Everything
          // before it is the title page and was already captured as `title`.
        }
        seenHeading = true;
        flushList();
        blocks.push(heading);
        return;
      }

      if (tag === "p") {
        const raw = inlineMarkup(node);
        const listItem = detectListMarker(raw);
        if (listItem) {
          addListItem(listItem);
          return;
        }
        const text = cleanParagraph(raw);
        if (!text) return;
        if (skipCover && !seenHeading) return;
        flushList();
        const block = createArticleBlock("paragraph") as ArticleParagraphBlock;
        block.text = text;
        blocks.push(block);
        return;
      }

      if (tag === "ul" || tag === "ol") {
        flushList();
        const items = Array.from(node.querySelectorAll(":scope > li"))
          .map((item) => {
            const clone = item.cloneNode(true) as Element;
            clone.querySelectorAll("ul, ol").forEach((nested) => nested.remove());
            return cleanParagraph(inlineMarkup(clone));
          })
          .filter(Boolean);
        if (items.length) {
          const block = createArticleBlock("list") as ArticleListBlock;
          block.ordered = tag === "ol";
          block.numbering = "arabic";
          block.items = items;
          blocks.push(block);
        }
        return;
      }

      if (tag === "table") {
        const table = tableToBlock(node, options.firstRowHeader);
        if (!table) return;
        flushList();
        blocks.push(table);
        return;
      }

      if (tag === "figure") {
        const caption = node.querySelector("figcaption");
        const value = cleanParagraph(inlineMarkup(node));
        if (value) {
          flushList();
          const block = createArticleBlock("paragraph") as ArticleParagraphBlock;
          block.text = value;
          blocks.push(block);
        }
        if (caption && cleanParagraph(inlineMarkup(caption)) !== value) {
          const block = createArticleBlock("paragraph") as ArticleParagraphBlock;
          block.text = cleanParagraph(inlineMarkup(caption));
          blocks.push(block);
        }
        return;
      }

      if (tag === "div" || tag === "section" || tag === "article" || tag === "main" || tag === "blockquote") {
        const hasBlockChildren = Array.from(node.children).some((child) =>
          /^(h[1-6]|p|ul|ol|table|div|section|article|main|blockquote|figure)$/i.test(child.tagName),
        );
        if (hasBlockChildren) walk(node.childNodes);
        else {
          const text = cleanParagraph(inlineMarkup(node));
          if (text) {
            if (skipCover && !seenHeading) return;
            flushList();
            const block = createArticleBlock("paragraph") as ArticleParagraphBlock;
            block.text = text;
            blocks.push(block);
          }
        }
        return;
      }

      const text = cleanParagraph(inlineMarkup(node));
      if (text) {
        if (skipCover && !seenHeading) return;
        flushList();
        const block = createArticleBlock("paragraph") as ArticleParagraphBlock;
        block.text = text;
        blocks.push(block);
      }
    });
  };

  walk(root.childNodes);
  flushList();

  const normalized = normalizeHeadingLevels(blocks);

  if (notes.length) {
    const block = createArticleBlock("footnotes") as ArticleFootnotesBlock;
    block.title = "الهوامش";
    block.numbering = "arabic";
    block.items = notes.map((note) => ({ id: note.id, text: note.text }));
    normalized.push(block);
  }

  return { blocks: normalized, title, footnotes: notes.length, images };
}

/* -------------------------------------------------------------------------- */
/* References and summary detection                                           */
/* -------------------------------------------------------------------------- */

function isReferenceHeading(text: string): boolean {
  return REFERENCE_HEADING.test(cleanHeading(text));
}

function isReferenceGroupHeading(text: string): boolean {
  const value = cleanHeading(text);
  return REFERENCE_GROUP_HEADING.test(value) && value.length <= 90;
}

function looksLikeReferenceEntry(text: string): boolean {
  const value = cleanImportText(text);
  if (!value || value.length < 8) return false;
  if (/^©/.test(value)) return false;
  if (/^https?:\/\/\S+$/i.test(value)) return false;
  if (/^www\.\S+$/i.test(value)) return false;
  if (/^[\d٠-٩\s.,،]+$/.test(value)) return false;
  return true;
}

function extractReferences(
  blocks: ArticleBlock[],
): { blocks: ArticleBlock[]; references: number } {
  const result: ArticleBlock[] = [];
  let references = 0;
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];
    if (block.type !== "heading" || !isReferenceHeading(block.text)) {
      result.push(block);
      index += 1;
      continue;
    }

    const section: ArticleBlock[] = [];
    let cursor = index + 1;
    while (cursor < blocks.length) {
      const next = blocks[cursor];
      if (next.type === "heading") {
        if (isReferenceGroupHeading(next.text)) {
          section.push(next);
          cursor += 1;
          continue;
        }
        break;
      }
      section.push(next);
      cursor += 1;
    }

    const groups: ArticleReferenceGroup[] = [];
    let current: ArticleReferenceGroup = { id: makeArticleId("rg"), title: "", items: [] };

    const pushEntry = (text: string) => {
      const value = cleanImportText(text);
      if (!looksLikeReferenceEntry(value)) return;
      current.items.push({ id: makeArticleId("ref"), key: "", text: value });
    };

    section.forEach((item) => {
      if (item.type === "heading") {
        if (current.items.length) groups.push(current);
        current = {
          id: makeArticleId("rg"),
          title: cleanHeading(item.text),
          items: [],
        };
        return;
      }
      if (item.type === "paragraph") {
        pushEntry(item.text);
        return;
      }
      if (item.type === "list") {
        item.items.forEach(pushEntry);
      }
    });
    if (current.items.length) groups.push(current);

    // A short sentence before the first group heading is section guidance
    // (e.g. the citation style), not a numbered reference. Keep it as the
    // block's intro so numbering still starts at 1.
    let intro = "";
    const leading = groups[0];
    if (leading && !leading.title.trim()) {
      const words = leading.items.reduce((total, item) => total + countWords(item.text), 0);
      if (words <= 40) {
        intro = leading.items.map((item) => item.text).join(" ");
        groups.shift();
      }
    }

    const count = groups.reduce((total, group) => total + group.items.length, 0);
    if (count >= 2) {
      const referencesBlock = createArticleBlock("references") as ArticleReferencesBlock;
      referencesBlock.title = cleanHeading(block.text) || "المراجع";
      referencesBlock.numbering = "arabic";
      if (intro) referencesBlock.intro = intro;
      referencesBlock.groups = groups;
      result.push(referencesBlock);
      references += count;
      index = cursor;
      continue;
    }

    result.push(block);
    index += 1;
  }

  return { blocks: result, references };
}

function extractSummaries(
  blocks: ArticleBlock[],
): { blocks: ArticleBlock[]; summaries: number } {
  const result: ArticleBlock[] = [];
  let summaries = 0;
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];
    if (block.type !== "heading") {
      result.push(block);
      index += 1;
      continue;
    }

    const heading = cleanHeading(block.text);
    const isSummary = SUMMARY_HEADING.test(heading);
    const isConclusion = !isSummary && CONCLUSION_HEADING.test(heading);
    if (!isSummary && !isConclusion) {
      result.push(block);
      index += 1;
      continue;
    }

    const paragraphs: ArticleParagraphBlock[] = [];
    let cursor = index + 1;
    while (cursor < blocks.length && blocks[cursor].type === "paragraph") {
      paragraphs.push(blocks[cursor] as ArticleParagraphBlock);
      cursor += 1;
    }

    if (!paragraphs.length) {
      result.push(block);
      index += 1;
      continue;
    }

    if (isSummary) {
      const summary = createArticleBlock("summary") as ArticleSummaryBlock;
      summary.title = heading;
      summary.text = paragraphs.map((paragraph) => paragraph.text).join("\n\n");
      result.push(summary);
    } else {
      const conclusion = createArticleBlock("conclusion") as ArticleSummaryBlock;
      conclusion.title = heading;
      conclusion.text = paragraphs.map((paragraph) => paragraph.text).join("\n\n");
      result.push(conclusion);
    }
    summaries += 1;
    index = cursor;
  }

  return { blocks: result, summaries };
}

function countStats(
  blocks: ArticleBlock[],
  extras: { footnotes: number; references: number; images: number; pages?: number },
): ArticleImportStats {
  let headings = 0;
  let paragraphs = 0;
  let lists = 0;
  let tables = 0;
  let words = 0;
  blocks.forEach((block) => {
    switch (block.type) {
      case "heading":
        headings += 1;
        words += countWords(block.text);
        break;
      case "paragraph":
        paragraphs += 1;
        words += countWords(block.text);
        break;
      case "list":
        lists += 1;
        words += block.items.reduce((total, item) => total + countWords(item), 0);
        break;
      case "table":
        tables += 1;
        words += block.headers.reduce((total, cell) => total + countWords(cell), 0);
        words += block.rows.reduce(
          (total, row) => total + row.reduce((sum, cell) => sum + countWords(cell), 0),
          0,
        );
        break;
      case "footnotes":
        words += block.items.reduce((total, item) => total + countWords(item.text), 0);
        break;
      case "references":
        words += block.groups.reduce(
          (total, group) =>
            total +
            group.items.reduce((sum, item) => sum + countWords(item.text), 0),
          0,
        );
        break;
      case "summary":
      case "conclusion":
        words += countWords(block.text);
        break;
      case "decoration":
        break;
    }
  });
  return {
    headings,
    paragraphs,
    lists,
    tables,
    footnotes: extras.footnotes,
    references: extras.references,
    words,
    skippedImages: extras.images,
    pages: extras.pages,
  };
}

/* -------------------------------------------------------------------------- */
/* PDF                                                                        */
/* -------------------------------------------------------------------------- */

interface PdfTextItem {
  str: string;
  dir?: string;
  width: number;
  height: number;
  transform: number[];
  fontName?: string;
  hasEOL?: boolean;
}

interface PdfLine {
  text: string;
  xStart: number;
  xEnd: number;
  y: number;
  size: number;
  page: number;
  pageWidth: number;
  pageHeight: number;
  isFootnote?: boolean;
}

const median = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const arabicCount = (value: string): number => (value.match(/[\u0621-\u064A\u066E-\u06D3]/g) || []).length;
const latinCount = (value: string): number => (value.match(/[A-Za-z\u00C0-\u024F]/g) || []).length;

function itemDirection(item: PdfTextItem, fallback: "rtl" | "ltr"): "rtl" | "ltr" | "neutral" {
  if (arabicCount(item.str) > 0) return "rtl";
  if (latinCount(item.str) > 0) return "ltr";
  if (/[0-9٠-٩]/.test(item.str)) return fallback;
  return "neutral";
}

function buildLineText(items: PdfTextItem[]): string {
  const content = items.filter((item) => item.str.trim());
  if (!content.length) return "";

  const joined = content.map((item) => item.str).join(" ");
  const base: "rtl" | "ltr" =
    arabicCount(joined) >= latinCount(joined) ? "rtl" : "ltr";

  const visual = [...content].sort((a, b) => a.transform[4] - b.transform[4]);
  const directed = visual.map((item) => ({
    item,
    dir: itemDirection(item, base),
  }));

  // Neutral punctuation inherits the closest directional run.
  let previous: "rtl" | "ltr" = base;
  directed.forEach((entry) => {
    if (entry.dir === "neutral") entry.dir = previous;
    else previous = entry.dir;
  });

  const runs: { dir: "rtl" | "ltr"; items: PdfTextItem[] }[] = [];
  directed.forEach((entry) => {
    const dir = entry.dir as "rtl" | "ltr";
    const last = runs[runs.length - 1];
    if (last && last.dir === dir) last.items.push(entry.item);
    else runs.push({ dir, items: [entry.item] });
  });

  const orderedRuns = base === "rtl" ? [...runs].reverse() : runs;
  const orderedItems: PdfTextItem[] = [];
  orderedRuns.forEach((run) => {
    const runItems = [...run.items].sort((a, b) =>
      run.dir === "rtl" ? b.transform[4] - a.transform[4] : a.transform[4] - b.transform[4],
    );
    runItems.forEach((item) => orderedItems.push(item));
  });

  // PDF exporters often emit one word per item and drop the spaces between
  // them. Restore a space only when the horizontal gap is wider than normal
  // glyph advance, so words split across items are not broken apart.
  let text = "";
  orderedItems.forEach((item, index) => {
    if (index === 0) {
      text = item.str;
      return;
    }
    const previous = orderedItems[index - 1];
    const gap = Math.max(
      0,
      Math.max(previous.transform[4], item.transform[4]) -
        Math.min(
          previous.transform[4] + Math.max(0, previous.width),
          item.transform[4] + Math.max(0, item.width),
        ),
    );
    const size = Math.max(previous.height, item.height) || 1;
    const combining = /^[\u064B-\u065F\u0670\u06D6-\u06ED]/.test(item.str);
    if (
      !combining &&
      gap > size * 0.16 &&
      !/\s$/.test(text) &&
      !/^\s/.test(item.str)
    ) {
      text += " ";
    }
    text += item.str;
  });

  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([\u064B-\u065F\u0670\u06D6-\u06ED])/g, "$1")
    .replace(/\s+([،؛؟!.,:»])/g, "$1")
    .replace(/([«(])\s+/g, "$1")
    .trim();
}

function buildPdfLine(items: PdfTextItem[], page: number, width: number, height: number): PdfLine | null {
  const content = items.filter((item) => item.str.trim());
  if (!content.length) return null;
  const text = buildLineText(content);
  if (!text || /^[l|]$/.test(text)) return null;
  if (/^[\u064B-\u065F\u0670\u06D6-\u06ED\s]+$/.test(text)) return null;

  const sizes = content.map((item) => item.height).filter((size) => size > 0);
  const xStarts = content.map((item) => item.transform[4]);
  const xEnds = content.map((item) => item.transform[4] + Math.max(0, item.width));
  return {
    text,
    xStart: Math.min(...xStarts),
    xEnd: Math.max(...xEnds),
    y: median(content.map((item) => item.transform[5])),
    size: sizes.length ? Math.max(...sizes) : 0,
    page,
    pageWidth: width,
    pageHeight: height,
  };
}

function groupPdfLines(
  items: PdfTextItem[],
  page: number,
  width: number,
  height: number,
): PdfLine[] {
  const grouped: PdfLine[] = [];
  let current: PdfTextItem[] = [];

  const flush = () => {
    const line = buildPdfLine(current, page, width, height);
    if (line) grouped.push(line);
    current = [];
  };

  items.forEach((item) => {
    if (item.str.trim()) current.push(item);
    if (item.hasEOL) flush();
  });
  flush();

  // A few exporters put a combining mark or a stray glyph on its own
  // "line". Merge it into the nearest line instead of emitting a one-letter
  // paragraph.
  const merged: PdfLine[] = [];
  grouped.forEach((line) => {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      Math.abs(previous.y - line.y) < 5 &&
      (line.text.length <= 2 || previous.text.length <= 2)
    ) {
      previous.text = `${previous.text} ${line.text}`.replace(/\s+/g, " ").trim();
      previous.xStart = Math.min(previous.xStart, line.xStart);
      previous.xEnd = Math.max(previous.xEnd, line.xEnd);
      previous.size = Math.max(previous.size, line.size);
      return;
    }
    merged.push(line);
  });

  return merged;
}

function repairLamAlef(value: string): string {
  // Word's PDF exporter renders the lam-alef ligature as alef + lam. The
  // sequence alef + (alef/hamza) + lam is effectively never genuine inside
  // an Arabic word, so swapping it back is safe and fixes words such as
  // "االصطناعي" -> "الاصطناعي" and "مقاالت" -> "مقالات".
  return value
    .replace(/(ا)([اأإآ])(ل)/g, "$1$3$2")
    // A bare article "ال" cannot stand alone, so it is a reversed "لا".
    .replace(/(^|[\s،؛:.!؟»"'(])ال(?=[\s،؛:.!؟»"')]|$)/g, "$1لا")
    // "إال" / "أال" / "آال" are reversed "إلا" / "ألا" / "آلا".
    .replace(/([إأآ])ال(?=[\s،؛:.!؟»"')]|$)/g, "$1لا");
}

/**
 * Strip a leading footnote number such as `1.`, `[1]` or `(1)`. Returns null
 * when the text does not start with a footnote marker.
 */
function stripFootnotePrefix(value: string): string | null {
  let text = value.trimStart();
  const bracketed = text.startsWith("[") || text.startsWith("(");
  if (bracketed) text = text.slice(1);
  const digits = text.match(/^[0-9٠-٩]+/);
  if (!digits) return null;
  let rest = text.slice(digits[0].length);
  const separator = rest.charAt(0);
  if (["]", ")", ".", ":", "-"].includes(separator)) {
    rest = rest.slice(1);
  } else if (!bracketed && !/^\s/.test(rest)) {
    // "2025" at the start of a line is a year, not a note marker.
    return null;
  }
  rest = rest.replace(/^\s+/, "");
  if (!rest || /^[0-9٠-٩]/.test(rest)) return null;
  if (!bracketed && !separator) return null;
  return rest;
}

function stripRepeatedPdfLines(pages: { lines: PdfLine[] }[]): void {
  const counts = new Map<string, number>();
  pages.forEach((page) => {
    page.lines.forEach((line) => {
      if (line.text.length > 120) return;
      counts.set(line.text, (counts.get(line.text) || 0) + 1);
    });
  });
  pages.forEach((page) => {
    page.lines = page.lines.filter((line) => {
      if (/^[\d٠-٩]+$/.test(line.text)) return false;
      const count = counts.get(line.text) || 0;
      return !(count >= 2 && line.text.length <= 120);
    });
  });
}

interface PdfFootnoteCandidate {
  text: string;
  page: number;
}

function collectPdfFootnotes(lines: PdfLine[], bodySize: number): PdfFootnoteCandidate[] {
  const notes: PdfFootnoteCandidate[] = [];
  const byPage = new Map<number, PdfLine[]>();
  lines.forEach((line) => {
    const list = byPage.get(line.page) || [];
    list.push(line);
    byPage.set(line.page, list);
  });

  byPage.forEach((pageLines, page) => {
    const sorted = [...pageLines].sort((a, b) => b.y - a.y);
    const bottomThreshold = (sorted[0]?.pageHeight || 0) * 0.19;
    let open = false;
    sorted.forEach((line) => {
      const isBottom = line.y < bottomThreshold;
      const isSmall = line.size > 0 && line.size < bodySize * 0.88;
      const noteText = stripFootnotePrefix(line.text);
      if (isBottom && isSmall && noteText) {
        notes.push({
          text: noteText,
          page,
        });
        line.isFootnote = true;
        open = true;
        return;
      }
      if (isBottom && isSmall && open && notes.length) {
        const last = notes[notes.length - 1];
        last.text = `${last.text} ${line.text}`.replace(/\s+/g, " ").trim();
        line.isFootnote = true;
      } else if (!isBottom || !isSmall) {
        open = false;
      }
    });
  });

  return notes.filter((note) => note.text.length > 4);
}

async function parsePdf(
  buffer: ArrayBuffer,
  options: ArticleImportOptions,
): Promise<ArticleImportResult> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  if (pdf.numPages > MAX_PDF_PAGES) {
    throw new Error(`الملف يحتوي ${pdf.numPages} صفحة، والحد الأقصى ${MAX_PDF_PAGES} صفحة.`);
  }

  const pages: { lines: PdfLine[]; pageNumber: number; width: number; height: number }[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = (content.items as unknown as PdfTextItem[])
      .filter((item) => item && typeof item.str === "string")
      .map((item) => ({
        ...item,
        str: item.str.split("\u0000").join(""),
      }));
    const lines = groupPdfLines(items, pageNumber, viewport.width, viewport.height)
      .filter((line) => {
        const top = line.pageHeight * 0.925;
        const bottom = line.pageHeight * 0.075;
        return line.y < top && line.y > bottom;
      })
      .filter((line) => !/^[\d٠-٩]+$/.test(line.text));
    pages.push({ lines, pageNumber, width: viewport.width, height: viewport.height });
    page.cleanup();
  }
  await loadingTask.destroy();

  const totalText = pages.reduce(
    (total, page) => total + page.lines.reduce((sum, line) => sum + line.text.length, 0),
    0,
  );
  if (totalText > MAX_PDF_TEXT) {
    throw new Error("نص الملف كبير جدًا للاستيراد. جرّب تقسيمه إلى أجزاء أو استخدم ملف Word.");
  }
  if (totalText < 120) {
    throw new Error(
      "لم نعثر على نص كافٍ في PDF. قد يكون الملف صورًا ممسوحة (Scan)؛ استخدم ملف Word أو PDF يحتوي نصًا قابلًا للتحديد.",
    );
  }

  stripRepeatedPdfLines(pages);

  // A divider page (section cover) contains only a couple of short lines.
  const contentPages = pages.filter((page) => {
    if (page.lines.length > 5) return true;
    const combined = page.lines.map((line) => line.text).join(" ").length;
    return combined > 160;
  });

  const allLines = contentPages
    .flatMap((page) => page.lines)
    .sort((a, b) => a.page - b.page || b.y - a.y);

  const bodySize = median(
    allLines.flatMap((line) => {
      const weight = Math.min(30, Math.max(1, line.text.length));
      return Array.from({ length: weight }, () => line.size);
    }),
  ) || median(allLines.map((line) => line.size)) || 12;

  const firstPage = pages[0]?.lines || [];
  const titleSizes = firstPage.map((line) => line.size);
  const maxTitleSize = titleSizes.length ? Math.max(...titleSizes) : 0;
  const titleCandidates = firstPage
    .filter(
      (line) =>
        line.size >= Math.max(bodySize * 1.15, maxTitleSize - 2) &&
        line.text.length > 2,
    )
    .sort((a, b) => b.y - a.y)
    .slice(0, 3)
    .map((line) => line.text);
  const titleCandidate = detectCoverTitle(titleCandidates);
  const title = options.repairArabic ? repairLamAlef(titleCandidate) : titleCandidate;

  const firstPageIsCover =
    firstPage.length > 0 &&
    firstPage.filter((line) => line.size <= bodySize * 1.08).length <= 1;
  const firstBodyHeading = firstPageIsCover
    ? allLines.find((line) => line.page !== 1 && line.size >= bodySize * 1.1 && line.text.length <= 170)
    : allLines.find((line) => line.size >= bodySize * 1.1 && line.text.length <= 170);
  const firstBodyHeadingIndex = firstBodyHeading ? allLines.indexOf(firstBodyHeading) : -1;
  const hasCover = Boolean(title) && firstPageIsCover && firstBodyHeadingIndex > 0;
  const startIndex = options.skipCover && hasCover ? firstBodyHeadingIndex : 0;

  const footnoteCandidates = options.includeFootnotes
    ? collectPdfFootnotes(allLines, bodySize)
    : [];
  const bodyLines = allLines.filter((line) => !line.isFootnote);

  const leftMargins = new Map<number, number>();
  bodyLines.forEach((line) => {
    if (line.size >= bodySize * 1.1) return;
    const current = leftMargins.get(line.page);
    leftMargins.set(line.page, current === undefined ? line.xStart : Math.min(current, line.xStart));
  });

  const blocks: ArticleBlock[] = [];
  let paragraph: { text: string; page: number; y: number; xStart: number; xEnd: number; size: number } | null = null;
  let list: { ordered: boolean; numbering: ArticleNumbering; items: string[] } | null = null;

  const flushParagraph = () => {
    if (!paragraph) return;
    const text = cleanImportText(paragraph.text);
    if (text) {
      const block = createArticleBlock("paragraph") as ArticleParagraphBlock;
      block.text = options.repairArabic ? repairLamAlef(text) : text;
      blocks.push(block);
    }
    paragraph = null;
  };

  const flushList = () => {
    if (!list) return;
    const items = list.items.map((item) => cleanImportText(item)).filter(Boolean);
    if (items.length) {
      const block = createArticleBlock("list") as ArticleListBlock;
      block.ordered = list.ordered;
      block.numbering = list.numbering;
      block.items = options.repairArabic ? items.map(repairLamAlef) : items;
      blocks.push(block);
    }
    list = null;
  };

  const isHeadingLine = (line: PdfLine): boolean =>
    line.size >= bodySize * 1.1 && line.text.length <= 170 && !/^[•·▪◦\-–—*]\s+/.test(line.text);

  const headingLevel = (line: PdfLine): 2 | 3 => {
    const text = cleanHeading(line.text);
    if (
      /^(?:المحور|مقدمة|خاتمة|قائمة\s+المراجع|المراجع|المصادر|خلاصة|ملخص|قسم\s+تطبيقي|عشر\s+وصايا|أدوات\s+وقواعد)/.test(
        text,
      )
    ) {
      return 2;
    }
    return line.size >= bodySize * 1.22 ? 2 : 3;
  };

  for (let index = startIndex; index < bodyLines.length; index += 1) {
    const line = bodyLines[index];
    const raw = line.text;

    if (isHeadingLine(line)) {
      flushParagraph();
      flushList();
      const heading = createArticleBlock("heading") as ArticleHeadingBlock;
      heading.level = headingLevel(line);
      const text = cleanHeading(raw);
      heading.text = options.repairArabic ? repairLamAlef(text) : text;
      if (heading.text) blocks.push(heading);
      continue;
    }

    const marker = detectListMarker(raw);
    if (marker) {
      flushParagraph();
      if (list && list.ordered !== marker.ordered) flushList();
      if (!list) list = { ordered: marker.ordered, numbering: marker.numbering, items: [] };
      const item = cleanParagraph(marker.text);
      if (item) list.items.push(item);
      continue;
    }

    if (list) {
      const previous = list.items[list.items.length - 1];
      const left = leftMargins.get(line.page) ?? line.xStart;
      const isContinuation =
        previous &&
        line.xStart > left + bodySize * 1.2 &&
        paragraph === null &&
        index > 0 &&
        bodyLines[index - 1].page === line.page &&
        bodyLines[index - 1].y - line.y <= bodySize * 1.75;
      if (isContinuation) {
        list.items[list.items.length - 1] = `${previous} ${raw}`.replace(/\s+/g, " ").trim();
        continue;
      }
      flushList();
    }

    if (paragraph) {
      const previousLine = bodyLines[index - 1];
      const left = leftMargins.get(line.page) ?? line.xStart;
      const pageWidth = line.pageWidth - 2 * left;
      const previousText = paragraph.text;
      const gap = paragraph.y - line.y;
      const samePage = paragraph.page === line.page;
      const indented = line.xStart > left + bodySize * 1.15;
      const previousShort = paragraph.xEnd - paragraph.xStart < pageWidth * 0.72;
      const previousEndsSentence = /[.؟!؛:]$/.test(previousText);
      const previousFull = paragraph.xEnd - paragraph.xStart >= pageWidth * 0.72;
      const newPageContinues =
        !samePage &&
        previousFull &&
        !previousEndsSentence &&
        line.xStart <= left + bodySize * 0.8;

      const shouldJoin =
        (samePage || newPageContinues) &&
        gap <= bodySize * 1.8 &&
        gap >= -bodySize * 0.5 &&
        !indented &&
        !(samePage && previousShort && previousEndsSentence);

      if (shouldJoin) {
        paragraph.text = `${paragraph.text} ${raw}`.replace(/\s+/g, " ").trim();
        paragraph.y = line.y;
        paragraph.xEnd = line.xEnd;
        continue;
      }
      flushParagraph();
    }

    paragraph = {
      text: raw,
      page: line.page,
      y: line.y,
      xStart: line.xStart,
      xEnd: line.xEnd,
      size: line.size,
    };
  }
  flushParagraph();
  flushList();

  if (footnoteCandidates.length) {
    const block = createArticleBlock("footnotes") as ArticleFootnotesBlock;
    block.title = "الهوامش";
    block.numbering = "arabic";
    block.items = footnoteCandidates.map((note) => ({
      id: makeArticleId("fn"),
      text: options.repairArabic ? repairLamAlef(note.text) : note.text,
    }));
    blocks.push(block);
  }

  const warnings: string[] = [
    "استيراد PDF نصي تقديري: قد تفقد الجداول والتنسيق البصري وروابط الهوامش. للحصول على أفضل نتيجة استخدم ملف Word.",
  ];
  if (options.repairArabic) {
    warnings.push(
      "طُبّق تصحيح تلقائي لرموز اللام-ألف الشائعة في PDF؛ راجع الكلمات المشكوك فيها.",
    );
  }
  if (footnoteCandidates.length) {
    warnings.push(
      "استُخرجت الهوامش في قسم مستقل دون ربطها بمواضعها داخل النص؛ اربطها يدويًا أو استخدم Word.",
    );
  }

  let prepared = blocks;
  let references = 0;
  let summaries = 0;
  if (options.detectReferences) {
    const extracted = extractReferences(prepared);
    prepared = extracted.blocks;
    references = extracted.references;
  }
  if (options.detectSummary) {
    const extracted = extractSummaries(prepared);
    prepared = extracted.blocks;
    summaries = extracted.summaries;
  }

  return {
    blocks: prepared.slice(0, MAX_BLOCKS),
    title,
    format: "pdf",
    stats: countStats(prepared, {
      footnotes: footnoteCandidates.length,
      references,
      images: 0,
      pages: pdf.numPages,
    }),
    warnings,
  };
}

/* -------------------------------------------------------------------------- */
/* Public entry point                                                         */
/* -------------------------------------------------------------------------- */

export async function importArticleFile(
  file: File,
  options: ArticleImportOptions = DEFAULT_ARTICLE_IMPORT_OPTIONS,
): Promise<ArticleImportResult> {
  const name = file.name.toLowerCase();
  if (!/\.(docx|pdf)$/.test(name)) {
    throw new Error("الصيغة غير مدعومة. اختر ملف Word بامتداد .docx أو ملف PDF.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("حجم الملف كبير جدًا. الحد الأقصى 30 ميجابايت.");
  }
  if (!file.size) throw new Error("الملف فارغ.");

  const buffer = await file.arrayBuffer();

  if (name.endsWith(".pdf")) {
    return parsePdf(buffer, options);
  }

  // Check if mammoth is available (some environments may not support image processing)
  let mammothAvailable = true;
  try {
    // Test if mammoth can be imported without requiring image processing
    await import("mammoth");
  } catch (importError) {
    console.warn("mammoth.js not available:", importError);
    mammothAvailable = false;
  }

  if (!mammothAvailable) {
    throw new Error(
      "صيغة .docx غير مدعومة في هذا البيئة. يدعم النظام ملفات PDF وWord (.docx) في بيئات المتصفحات القياسية. لإدارة ملفات Word، استخدم متصفحًا حديثًا أو قم بتحويلها إلى PDF.",
    );
  }

  const mammoth = await import("mammoth");
  let html = "";
  let messages: string[] = [];
  try {
    const result = await mammoth.convertToHtml(
      { arrayBuffer: buffer },
      { includeDefaultStyleMap: true, ignoreEmptyParagraphs: true },
    );
    html = result.value;
    messages = result.messages
      .map((message) => message.message)
      .filter((message) => !/unrecognised element|image of type|image.png/i.test(message));
  } catch (error) {
    throw new Error(
      `تعذر قراءة ملف Word: ${error instanceof Error ? error.message : "ملف غير صالح. تأكد أن الملف يحتوي على نص قابل للقراءة."}`,
    );
  }

  if (!html.trim()) throw new Error("لم نعثر على محتوى في ملف Word.");

  const converted = blocksFromDocxHtml(html, options);
  let blocks = converted.blocks;
  let references = 0;
  let summaries = 0;

  if (options.detectReferences) {
    const extracted = extractReferences(blocks);
    blocks = extracted.blocks;
    references = extracted.references;
  }
  if (options.detectSummary) {
    const extracted = extractSummaries(blocks);
    blocks = extracted.blocks;
    summaries = extracted.summaries;
  }

  const warnings: string[] = [];
  if (converted.images) {
    warnings.push(
      `تم تجاهل ${converted.images} صورة داخل ملف Word لأن محرر المقالات لا يحفظ الصور؛ أضفها يدويًا عند الحاجة.`,
    );
  }
  if (messages.length) {
    warnings.push(
      `هناك ${messages.length} عنصر بتنسيق غير معروف من Word تم تبسيطه إلى نص عادي.`,
    );
  }

  return {
    blocks: blocks.slice(0, MAX_BLOCKS),
    title: converted.title,
    format: "docx",
    stats: countStats(blocks, {
      footnotes: converted.footnotes,
      references,
      images: converted.images,
    }),
    warnings,
  };
}
