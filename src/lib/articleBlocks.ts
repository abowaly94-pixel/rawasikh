/**
 * Structured article blocks.
 *
 * A blog article can be authored as an ordered list of independent blocks
 * instead of one HTML blob. Each block owns its content and can be moved,
 * duplicated or deleted without touching the others. Footnotes and
 * references use stable ids, so an inline marker keeps pointing at the right
 * entry even after the sections around it are reordered.
 *
 * The helpers in this file are shared by three consumers:
 *  - the dashboard block editor,
 *  - the public article renderer (React),
 *  - `blocksToHtml` which generates the legacy `blog_posts.content` HTML
 *    (used by translations and search engines).
 */

export type ArticleAlign = "right" | "center" | "left";
export type ArticleNumbering = "western" | "arabic";
export type ArticleBlockType =
  | "heading"
  | "paragraph"
  | "list"
  | "table"
  | "footnotes"
  | "references"
  | "summary"
  | "conclusion"
  | "decoration";

export type DecorationShape = "divider" | "line" | "ornament" | "arrow" | "dots";
export type DecorationSize = "sm" | "md" | "lg";

export interface ArticleFootnote {
  id: string;
  text: string;
}

export interface ArticleReference {
  id: string;
  /** Short in-text label, e.g. "نور، 2024" or "١". */
  key: string;
  /** Full reference text. */
  text: string;
}

export interface ArticleReferenceGroup {
  id: string;
  title: string;
  items: ArticleReference[];
}

interface ArticleBlockBase {
  id: string;
}

export interface ArticleHeadingBlock extends ArticleBlockBase {
  type: "heading";
  level: 2 | 3;
  text: string;
  align: ArticleAlign;
}

export interface ArticleParagraphBlock extends ArticleBlockBase {
  type: "paragraph";
  text: string;
  align: ArticleAlign;
}

export interface ArticleListBlock extends ArticleBlockBase {
  type: "list";
  ordered: boolean;
  numbering: ArticleNumbering;
  items: string[];
}

export interface ArticleTableBlock extends ArticleBlockBase {
  type: "table";
  caption: string;
  headers: string[];
  rows: string[][];
}

export interface ArticleFootnotesBlock extends ArticleBlockBase {
  type: "footnotes";
  title: string;
  numbering: ArticleNumbering;
  items: ArticleFootnote[];
}

export interface ArticleReferencesBlock extends ArticleBlockBase {
  type: "references";
  title: string;
  /** Optional lead-in sentence shown under the section title (not numbered). */
  intro?: string;
  numbering: ArticleNumbering;
  groups: ArticleReferenceGroup[];
}

export interface ArticleSummaryBlock extends ArticleBlockBase {
  type: "summary";
  title: string;
  text: string;
}

export interface ArticleConclusionBlock extends ArticleBlockBase {
  type: "conclusion";
  title: string;
  text: string;
}

export interface ArticleDecorationBlock extends ArticleBlockBase {
  type: "decoration";
  shape: DecorationShape;
  color: string;
  size: DecorationSize;
  align: ArticleAlign;
}

export type ArticleBlock =
  | ArticleHeadingBlock
  | ArticleParagraphBlock
  | ArticleListBlock
  | ArticleTableBlock
  | ArticleFootnotesBlock
  | ArticleReferencesBlock
  | ArticleSummaryBlock
  | ArticleConclusionBlock
  | ArticleDecorationBlock;

export interface CollectedFootnote extends ArticleFootnote {
  number: number;
  numbering: ArticleNumbering;
  blockId: string;
}

export interface CollectedReference extends ArticleReference {
  number: number;
  numbering: ArticleNumbering;
  blockId: string;
  groupId: string;
  groupTitle: string;
}

export interface InlineContext {
  footnotesById: Map<string, CollectedFootnote>;
  footnotesByNumber: Map<number, CollectedFootnote>;
  referencesById: Map<string, CollectedReference>;
  referencesByKey: Map<string, CollectedReference>;
}

const DEFAULT_ALIGN: ArticleAlign = "right";
const DEFAULT_NUMBERING: ArticleNumbering = "arabic";
const DEFAULT_DECORATION_COLOR = "#b08d57";

export const ARTICLE_DECORATION_COLORS = [
  { label: "ذهبي هادئ", value: "#b08d57" },
  { label: "كحلي", value: "#1b2a4a" },
  { label: "أزرق رواسخ", value: "#1f47ad" },
  { label: "رمادي ورقي", value: "#6b7280" },
  { label: "أخضر داكن", value: "#2f5d50" },
];

export function makeArticleId(prefix = "blk"): string {
  try {
    return `${prefix}_${crypto.randomUUID()}`;
  } catch {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

const asString = (value: unknown): string =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const asAlign = (value: unknown): ArticleAlign =>
  value === "center" || value === "left" ? value : DEFAULT_ALIGN;

const asNumbering = (value: unknown): ArticleNumbering =>
  value === "western" ? "western" : DEFAULT_NUMBERING;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(asString) : [];

const asRows = (value: unknown): string[][] =>
  Array.isArray(value)
    ? value.filter(Array.isArray).map((row) => (row as unknown[]).map(asString))
    : [];

export function createArticleBlock(type: ArticleBlockType): ArticleBlock {
  const id = makeArticleId();
  switch (type) {
    case "heading":
      return { id, type, level: 2, text: "", align: DEFAULT_ALIGN };
    case "paragraph":
      return { id, type, text: "", align: DEFAULT_ALIGN };
    case "list":
      return {
        id,
        type,
        ordered: false,
        numbering: DEFAULT_NUMBERING,
        items: [""],
      };
    case "table":
      return {
        id,
        type,
        caption: "",
        headers: ["", "", ""],
        rows: [
          ["", "", ""],
          ["", "", ""],
        ],
      };
    case "footnotes":
      return {
        id,
        type,
        title: "الهوامش",
        numbering: DEFAULT_NUMBERING,
        items: [{ id: makeArticleId("fn"), text: "" }],
      };
    case "references":
      return {
        id,
        type,
        title: "المراجع",
        numbering: DEFAULT_NUMBERING,
        groups: [
          {
            id: makeArticleId("rg"),
            title: "",
            items: [
              { id: makeArticleId("ref"), key: "", text: "" },
            ],
          },
        ],
      };
    case "summary":
      return { id, type, title: "الخلاصة", text: "" };
    case "conclusion":
      return { id, type, title: "الخاتمة", text: "" };
    case "decoration":
      return {
        id,
        type,
        shape: "divider",
        color: DEFAULT_DECORATION_COLOR,
        size: "md",
        align: "center",
      };
  }
}

export function createHeadingBlock(level: 2 | 3): ArticleBlock {
  const block = createArticleBlock("heading");
  if (block.type === "heading") block.level = level;
  return block;
}

export function createListBlock(ordered: boolean): ArticleBlock {
  const block = createArticleBlock("list");
  if (block.type === "list") block.ordered = ordered;
  return block;
}

export function articleBlockLabel(block: ArticleBlock): string {
  switch (block.type) {
    case "heading":
      return block.level === 2 ? "عنوان رئيسي" : "عنوان فرعي";
    case "paragraph":
      return "فقرة";
    case "list":
      return block.ordered ? "قائمة مرقمة" : "قائمة نقطية";
    case "table":
      return "جدول";
    case "footnotes":
      return "الهوامش";
    case "references":
      return "المراجع";
    case "summary":
      return "الخلاصة";
    case "conclusion":
      return "الخاتمة";
    case "decoration":
      return "زخرفة / فاصل";
  }
}

/** Regenerate ids inside a duplicated block so anchors never collide. */
export function duplicateArticleBlock(block: ArticleBlock): ArticleBlock {
  const copy = JSON.parse(JSON.stringify(block)) as ArticleBlock;
  copy.id = makeArticleId();
  if (copy.type === "footnotes") {
    copy.items = copy.items.map((item) => ({ ...item, id: makeArticleId("fn") }));
  }
  if (copy.type === "references") {
    copy.groups = copy.groups.map((group) => ({
      ...group,
      id: makeArticleId("rg"),
      items: group.items.map((item) => ({ ...item, id: makeArticleId("ref") })),
    }));
  }
  return copy;
}

/**
 * Normalise whatever is stored in the `article_blocks` jsonb column. Invalid
 * blocks are dropped instead of crashing the public article page.
 */
export function parseArticleBlocks(raw: unknown): ArticleBlock[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];

  return value
    .map((entry): ArticleBlock | null => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      const id = asString(item.id) || makeArticleId();
      const type = item.type;

      switch (type) {
        case "heading": {
          return {
            id,
            type,
            level: item.level === 3 ? 3 : 2,
            text: asString(item.text),
            align: asAlign(item.align),
          };
        }
        case "paragraph": {
          return {
            id,
            type,
            text: asString(item.text),
            align: asAlign(item.align),
          };
        }
        case "list": {
          const items = asStringArray(item.items);
          return {
            id,
            type,
            ordered: Boolean(item.ordered),
            numbering: asNumbering(item.numbering),
            items: items.length ? items : [""],
          };
        }
        case "table": {
          const headers = asStringArray(item.headers);
          const rows = asRows(item.rows);
          const columnCount = Math.max(
            headers.length,
            ...rows.map((row) => row.length),
            1,
          );
          return {
            id,
            type,
            caption: asString(item.caption),
            headers: Array.from({ length: columnCount }, (_, col) => headers[col] ?? ""),
            rows: rows.map((row) =>
              Array.from({ length: columnCount }, (_, col) => row[col] ?? ""),
            ),
          };
        }
        case "footnotes": {
          const items = Array.isArray(item.items) ? item.items : [];
          return {
            id,
            type,
            title: asString(item.title) || "الهوامش",
            numbering: asNumbering(item.numbering),
            items: items
              .map((note) => {
                const value = (note ?? {}) as Record<string, unknown>;
                return { id: asString(value.id) || makeArticleId("fn"), text: asString(value.text) };
              })
              .filter((note) => note.text || note.id),
          };
        }
        case "references": {
          const groups = Array.isArray(item.groups) ? item.groups : [];
          return {
            id,
            type,
            title: asString(item.title) || "المراجع",
            numbering: asNumbering(item.numbering),
            groups: groups.map((group) => {
              const value = (group ?? {}) as Record<string, unknown>;
              const refs = Array.isArray(value.items) ? value.items : [];
              return {
                id: asString(value.id) || makeArticleId("rg"),
                title: asString(value.title),
                items: refs.map((ref) => {
                  const entry = (ref ?? {}) as Record<string, unknown>;
                  return {
                    id: asString(entry.id) || makeArticleId("ref"),
                    key: asString(entry.key),
                    text: asString(entry.text),
                  };
                }),
              };
            }),
          };
        }
        case "summary":
        case "conclusion": {
          return {
            id,
            type,
            title: asString(item.title) || (type === "summary" ? "الخلاصة" : "الخاتمة"),
            text: asString(item.text),
          };
        }
        case "decoration": {
          const shape = item.shape;
          const size = item.size;
          return {
            id,
            type,
            shape:
              shape === "line" || shape === "ornament" || shape === "arrow" || shape === "dots"
                ? shape
                : "divider",
            color: asString(item.color) || DEFAULT_DECORATION_COLOR,
            size: size === "sm" || size === "lg" ? size : "md",
            align: asAlign(item.align),
          };
        }
        default:
          return null;
      }
    })
    .filter((block): block is ArticleBlock => block !== null);
}

export function hasArticleBlockContent(blocks: ArticleBlock[]): boolean {
  return blocks.some((block) => {
    switch (block.type) {
      case "heading":
      case "paragraph":
      case "summary":
      case "conclusion":
        return Boolean(block.text.trim());
      case "list":
        return block.items.some((item) => item.trim());
      case "table":
        return (
          block.headers.some((header) => header.trim()) ||
          block.rows.some((row) => row.some((cell) => cell.trim()))
        );
      case "footnotes":
        return block.items.some((item) => item.text.trim());
      case "references":
        return block.groups.some((group) => group.items.some((item) => item.text.trim()));
      case "decoration":
        return true;
    }
  });
}

export function collectFootnotes(blocks: ArticleBlock[]): CollectedFootnote[] {
  const result: CollectedFootnote[] = [];
  let number = 0;
  blocks.forEach((block) => {
    if (block.type !== "footnotes") return;
    block.items.forEach((item) => {
      if (!item.text.trim()) return;
      number += 1;
      result.push({
        ...item,
        number,
        numbering: block.numbering,
        blockId: block.id,
      });
    });
  });
  return result;
}

export function collectReferences(blocks: ArticleBlock[]): CollectedReference[] {
  const result: CollectedReference[] = [];
  let number = 0;
  blocks.forEach((block) => {
    if (block.type !== "references") return;
    block.groups.forEach((group) => {
      group.items.forEach((item) => {
        if (!item.text.trim() && !item.key.trim()) return;
        number += 1;
        result.push({
          ...item,
          number,
          numbering: block.numbering,
          blockId: block.id,
          groupId: group.id,
          groupTitle: group.title,
        });
      });
    });
  });
  return result;
}

export function createInlineContext(blocks: ArticleBlock[]): InlineContext {
  const footnotes = collectFootnotes(blocks);
  const references = collectReferences(blocks);
  return {
    footnotesById: new Map(footnotes.map((note) => [note.id, note])),
    footnotesByNumber: new Map(footnotes.map((note) => [note.number, note])),
    referencesById: new Map(references.map((ref) => [ref.id, ref])),
    referencesByKey: new Map(
      references.filter((ref) => ref.key.trim()).map((ref) => [ref.key.trim(), ref]),
    ),
  };
}

export function articleAnchorId(id: string): string {
  return String(id || "item").replace(/[^a-zA-Z0-9_-]/g, "-");
}

export function formatArticleNumber(value: number, numbering: ArticleNumbering): string {
  if (numbering !== "arabic") return String(value);
  return String(value).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
}

export function referenceDisplayKey(ref: Pick<CollectedReference, "key" | "number" | "numbering">): string {
  const key = ref.key.trim();
  if (!key) return formatArticleNumber(ref.number, ref.numbering);
  return key;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeArticleHtml(value: string): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

function renderFootnoteMarker(note: CollectedFootnote | undefined, fallbackNumber?: string): string {
  if (!note) {
    // A manually typed [^n] that has no matching footnote entry. Keep it
    // visible as plain superscript so it is obvious it still needs a note.
    return fallbackNumber
      ? `<sup class="text-[0.72em] text-muted-foreground">${escapeArticleHtml(fallbackNumber)}</sup>`
      : `<sup class="text-[0.72em] text-muted-foreground" title="هامش غير موجود">؟</sup>`;
  }
  const anchor = articleAnchorId(note.id);
  const number = formatArticleNumber(note.number, note.numbering);
  return `<sup class="article-fn-mark"><a id="fnref-${anchor}" href="#fn-${anchor}" class="text-primary font-semibold no-underline hover:underline scroll-mt-28" title="الهامش ${number}">${number}</a></sup>`;
}

function renderReferenceMarker(ref: CollectedReference | undefined, fallbackKey: string): string {
  if (!ref) {
    return `<span class="text-muted-foreground" title="مرجع غير موجود">[${escapeArticleHtml(fallbackKey || "؟")}]</span>`;
  }
  const anchor = articleAnchorId(ref.id);
  const key = referenceDisplayKey(ref);
  return `<a href="#ref-${anchor}" class="article-ref-mark text-primary font-semibold no-underline hover:underline scroll-mt-28" title="المرجع: ${escapeArticleHtml(ref.text.slice(0, 120))}">[${escapeArticleHtml(key)}]</a>`;
}

/**
 * Render the inline markers inside a block.
 *
 * Supported markers (typed by the editor's toolbar or manually):
 *   [[note:note-id]]  stable footnote marker
 *   [^1]              footnote marker by order (backwards friendly)
 *   [[ref:ref-id]]    stable reference marker
 *   [[ref:key]]       reference marker by short key
 */
export function renderArticleInline(text: string, context: InlineContext): string {
  let html = escapeArticleHtml(text);
  html = html.replace(/\[\[note:([^\]]+)\]\]/g, (_match, id: string) =>
    renderFootnoteMarker(context.footnotesById.get(id.trim())),
  );
  html = html.replace(/\[\^(\d+)\]/g, (_match, number: string) =>
    renderFootnoteMarker(context.footnotesByNumber.get(Number(number)), number),
  );
  html = html.replace(/\[\[ref:([^\]]+)\]\]/g, (_match, id: string) => {
    const key = id.trim();
    const ref = context.referencesById.get(key) || context.referencesByKey.get(key);
    return renderReferenceMarker(ref, key);
  });
  // Lightweight inline formatting used by the file importer (and available to
  // authors typing in the editor): **bold**, *italic*, [label](https://url).
  // The text was escaped above, so only these generated tags reach the DOM.
  html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  html = html.replace(
    /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">$1</a>',
  );
  return html.replace(/\n/g, "<br />");
}

function alignStyle(align: ArticleAlign): string {
  return `text-align:${align}`;
}

function tableHtml(block: ArticleTableBlock, context: InlineContext): string {
  const headers = block.headers
    .map(
      (header) =>
        `<th class="border border-white/15 px-4 py-3 text-center font-bold align-top">${renderArticleInline(header, context)}</th>`,
    )
    .join("");
  const rows = block.rows
    .map(
      (row, rowIndex) =>
        `<tr class="${rowIndex % 2 === 1 ? "bg-muted/50" : "bg-card"}">${row
          .map(
            (cell) =>
              `<td class="whitespace-pre-line border border-border px-4 py-3 align-top text-muted-foreground">${renderArticleInline(cell, context)}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  const caption = block.caption.trim()
    ? `<caption class="caption-top pb-2 text-sm text-muted-foreground">${renderArticleInline(block.caption, context)}</caption>`
    : "";
  return `<div class="my-8 overflow-hidden rounded-xl border border-border shadow-sm"><div class="overflow-x-auto"><table class="w-full min-w-[640px] border-collapse text-start text-[13.5px] leading-7">${caption}<thead><tr class="bg-ink text-white">${headers}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function decorationHtml(block: ArticleDecorationBlock): string {
  const text =
    block.shape === "ornament"
      ? "✦"
      : block.shape === "dots"
        ? "• • •"
        : block.shape === "arrow"
          ? "←"
          : block.shape === "line"
            ? "—"
            : "◆";
  const size = block.size === "sm" ? "1rem" : block.size === "lg" ? "1.8rem" : "1.35rem";
  return `<div aria-hidden="true" style="${alignStyle(block.align)};color:${escapeArticleHtml(block.color)};font-size:${size};letter-spacing:0.5em;margin:1.75rem 0;opacity:0.8">${text}</div>`;
}

/** Serialise blocks to the legacy HTML `content` column. */
export function blocksToHtml(blocks: ArticleBlock[]): string {
  const context = createInlineContext(blocks);
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading": {
          const tag = block.level === 2 ? "h2" : "h3";
          return `<${tag} class="${block.level === 2 ? "mt-10 mb-4 text-2xl font-bold leading-[1.6] text-ink" : "mt-7 mb-3 text-xl font-bold leading-[1.6] text-ink"}" style="${alignStyle(block.align)}">${renderArticleInline(block.text, context)}</${tag}>`;
        }
        case "paragraph":
          return `<p class="mb-5 text-[16.5px] leading-[2.05] text-foreground/85" style="${alignStyle(block.align)}">${renderArticleInline(block.text, context)}</p>`;
        case "list": {
          const tag = block.ordered ? "ol" : "ul";
          const listStyle =
            block.ordered && block.numbering === "arabic" ? ' style="list-style-type:arabic-indic"' : "";
          const items = block.items
            .filter((item) => item.trim())
            .map((item) => `<li class="mb-1.5">${renderArticleInline(item, context)}</li>`)
            .join("");
          return `<${tag} class="mb-5 space-y-1 ps-7 text-[16.5px] leading-[1.95] text-foreground/85 ${block.ordered ? "list-decimal" : "list-disc"} marker:text-gold"${listStyle}>${items}</${tag}>`;
        }
        case "table":
          return tableHtml(block, context);
        case "footnotes": {
          const notes = collectFootnotes(blocks).filter((note) => note.blockId === block.id);
          if (!notes.length) return "";
          const items = notes
            .map((note) => {
              const anchor = articleAnchorId(note.id);
              return `<li id="fn-${anchor}" class="scroll-mt-28">${renderArticleInline(note.text, context)} <a href="#fnref-${anchor}" class="text-primary no-underline" title="العودة إلى موضع الهامش">↩</a></li>`;
            })
            .join("");
          return `<section class="mt-12 rounded-2xl border border-border bg-muted/30 p-5 md:p-6"><h3 class="mb-4 text-lg font-bold text-ink" style="${alignStyle("right")}">${renderArticleInline(block.title || "الهوامش", context)}</h3><ol start="${notes[0].number}" class="space-y-3 text-[14px] leading-8 text-muted-foreground" style="list-style-type:${block.numbering === "arabic" ? "arabic-indic" : "decimal"}">${items}</ol></section>`;
        }
        case "references": {
          const refs = collectReferences(blocks).filter((ref) => ref.blockId === block.id);
          if (!refs.length) return "";
          const groups = block.groups
            .map((group) => {
              const groupRefs = refs.filter((ref) => ref.groupId === group.id);
              if (!groupRefs.length) return "";
              const items = groupRefs
                .map((ref) => {
                  const anchor = articleAnchorId(ref.id);
                  return `<li id="ref-${anchor}" class="mb-2.5 scroll-mt-28">${escapeArticleHtml(referenceDisplayKey(ref))} — ${renderArticleInline(ref.text, context)}</li>`;
                })
                .join("");
              return `<div class="mt-5">${group.title.trim() ? `<h4 class="mb-2 text-sm font-bold text-gold-strong">${renderArticleInline(group.title, context)}</h4>` : ""}<ol start="${groupRefs[0].number}" class="space-y-1 text-[14px] leading-8 text-muted-foreground" style="list-style-type:${block.numbering === "arabic" ? "arabic-indic" : "decimal"}">${items}</ol></div>`;
            })
            .join("");
          return `<section class="mt-12 border-t border-border pt-8"><h3 class="mb-4 text-lg font-bold text-ink">${renderArticleInline(block.title || "المراجع", context)}</h3>${block.intro?.trim() ? `<p class="mb-3 text-[13.5px] leading-7 text-muted-foreground">${renderArticleInline(block.intro, context)}</p>` : ""}${groups}</section>`;
        }
        case "summary":
          return `<aside class="my-8 rounded-2xl border border-gold/30 bg-gold-soft/30 p-6"><h2 class="mb-3 text-lg font-bold text-gold-strong">${renderArticleInline(block.title || "الخلاصة", context)}</h2><div class="text-[16px] leading-8 text-foreground/85">${renderArticleInline(block.text, context)}</div></aside>`;
        case "conclusion":
          return `<section class="mt-10 border-t border-border pt-8"><h2 class="mb-4 text-2xl font-bold text-ink">${renderArticleInline(block.title || "الخاتمة", context)}</h2><div class="text-[16.5px] leading-[2.05] text-foreground/85">${renderArticleInline(block.text, context)}</div></section>`;
        case "decoration":
          return decorationHtml(block);
      }
    })
    .join("\n");
}

/* -------------------------------------------------------------------------- */
/* Importing existing HTML into blocks                                        */
/* -------------------------------------------------------------------------- */

function elementText(element: Element): string {
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  return (clone.textContent || "").replace(/\u00a0/g, " ").trim();
}

function elementAlign(element: Element): ArticleAlign {
  const align = (element as HTMLElement).style?.textAlign;
  return align === "center" || align === "left" || align === "right" ? align : DEFAULT_ALIGN;
}

/**
 * Best-effort conversion of the old HTML content into blocks. Used when a
 * post predates the block editor. Text is preserved; inline HTML styling
 * (links, colours, spans) is intentionally flattened.
 */
export function convertHtmlToArticleBlocks(source: string): ArticleBlock[] {
  const text = String(source || "").trim();
  if (!text) return [];

  if (typeof DOMParser === "undefined") {
    return text
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const block = createArticleBlock("paragraph") as ArticleParagraphBlock;
        block.text = part;
        return block;
      });
  }

  const doc = new DOMParser().parseFromString(`<div id="article-root">${text}</div>`, "text/html");
  const root = doc.getElementById("article-root");
  if (!root) return [];

  const blocks: ArticleBlock[] = [];

  const pushParagraph = (value: string, align: ArticleAlign = DEFAULT_ALIGN) => {
    if (!value) return;
    const block = createArticleBlock("paragraph") as ArticleParagraphBlock;
    block.text = value;
    block.align = align;
    blocks.push(block);
  };

  const walk = (nodes: NodeList) => {
    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const value = (node.textContent || "").trim();
        if (value) pushParagraph(value);
        return;
      }
      if (!(node instanceof Element)) return;

      const tag = node.tagName.toLowerCase();
      if (tag === "script" || tag === "style" || tag === "noscript") return;

      if (tag === "h1" || tag === "h2") {
        const block = createArticleBlock("heading") as ArticleHeadingBlock;
        block.level = 2;
        block.text = elementText(node);
        block.align = elementAlign(node);
        if (block.text) blocks.push(block);
        return;
      }

      if (tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") {
        const block = createArticleBlock("heading") as ArticleHeadingBlock;
        block.level = 3;
        block.text = elementText(node);
        block.align = elementAlign(node);
        if (block.text) blocks.push(block);
        return;
      }

      if (tag === "p") {
        pushParagraph(elementText(node), elementAlign(node));
        return;
      }

      if (tag === "ul" || tag === "ol") {
        const items = Array.from(node.querySelectorAll(":scope > li"))
          .map((item) => elementText(item))
          .filter(Boolean);
        if (!items.length) return;
        const block = createArticleBlock("list") as ArticleListBlock;
        block.ordered = tag === "ol";
        block.items = items;
        blocks.push(block);
        return;
      }

      if (tag === "table") {
        const rows = Array.from(node.querySelectorAll("tr"))
          .map((row) =>
            Array.from(row.querySelectorAll("th, td")).map((cell) => elementText(cell)),
          )
          .filter((row) => row.some(Boolean));
        if (!rows.length) return;
        const hasHeader = Boolean(node.querySelector("thead th")) ||
          Boolean(rows[0] && node.querySelector("tr:first-child th"));
        const block = createArticleBlock("table") as ArticleTableBlock;
        block.headers = hasHeader ? rows[0] : rows[0].map(() => "");
        block.rows = hasHeader ? rows.slice(1) : rows;
        const caption = node.querySelector("caption");
        block.caption = caption ? elementText(caption) : "";
        blocks.push(block);
        return;
      }

      if (tag === "figure") {
        const caption = node.querySelector("figcaption");
        const value = elementText(node);
        if (value) pushParagraph(value);
        if (caption && elementText(caption) !== value) pushParagraph(elementText(caption));
        return;
      }

      if (tag === "div" || tag === "section" || tag === "article" || tag === "main" || tag === "blockquote") {
        const hasBlockChildren = Array.from(node.children).some((child) =>
          /^(h1|h2|h3|h4|h5|h6|p|ul|ol|table|div|section|article|main|blockquote|figure)$/i.test(
            child.tagName,
          ),
        );
        if (hasBlockChildren) {
          walk(node.childNodes);
        } else {
          pushParagraph(elementText(node), elementAlign(node));
        }
        return;
      }

      const value = elementText(node);
      if (value) pushParagraph(value, elementAlign(node));
    });
  };

  walk(root.childNodes);
  return blocks;
}
