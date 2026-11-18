/**
 * Reading-order fixes for legacy HTML articles.
 *
 * Posts written before the structured block editor store one HTML blob. That
 * markup usually ends with the bibliography apparatus, and a summary added
 * later sits after the references. This helper moves summary/conclusion
 * sections back to their expected place: after the body and before footnotes
 * and references. The transformation is purely presentational; the stored
 * content is never rewritten.
 */

const SUMMARY_TITLE =
  /^(الخلاصة|خلاصة المقال|الملخص|ملخص المقال|الخلاصة التنفيذية|summary|executive summary|résumé|resume)$/;
const CONCLUSION_TITLE =
  /^(الخاتمة|خاتمة المقال|خاتمة البحث|الخاتمة والنتائج|conclusion|conclusions)$/;
const END_SECTION_TITLE =
  /^(الهوامش|هوامش|الحواشي|المراجع|قائمة المراجع|المصادر|المصادر والمراجع|المراجع والمصادر|footnotes|endnotes|notes|references|bibliography|références|references)$/;

function normalizeTitle(value: string): string {
  return value
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function groupTitle(group: Node[]): string {
  const element = group.find((node): node is Element => node.nodeType === 1);
  if (!element) return "";
  const heading = /^H[1-6]$/.test(element.tagName)
    ? element
    : element.querySelector("h1, h2, h3, h4, h5, h6");
  return normalizeTitle(heading?.textContent || "");
}

/**
 * Returns the same HTML with any summary/conclusion group that appears after
 * the footnotes/references moved in front of them. Runs only in the browser;
 * on the server the source is returned untouched.
 */
export function orderLegacyArticleSections(html: string): string {
  const source = String(html || "");
  if (!source || typeof DOMParser === "undefined") return source;

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(
      `<div id="__article_root">${source}</div>`,
      "text/html",
    );
  } catch {
    return source;
  }

  const root = doc.getElementById("__article_root");
  if (!root) return source;

  // Group the flat top-level nodes the way the article reads: a heading or a
  // wrapper section starts a group, following paragraphs/figures belong to it.
  const groups: Node[][] = [];
  root.childNodes.forEach((node) => {
    const startsGroup =
      node.nodeType === 1 &&
      (node as Element).matches("h1, h2, h3, h4, h5, h6, section, aside");
    if (startsGroup || groups.length === 0) groups.push([node]);
    else groups[groups.length - 1].push(node);
  });

  if (!groups.length) return source;

  const firstEndIndex = groups.findIndex((group) => END_SECTION_TITLE.test(groupTitle(group)));
  if (firstEndIndex === -1) return source;

  const trailingSections = groups.filter(
    (group, index) =>
      index > firstEndIndex &&
      (SUMMARY_TITLE.test(groupTitle(group)) || CONCLUSION_TITLE.test(groupTitle(group))),
  );
  if (!trailingSections.length) return source;

  const anchor = groups[firstEndIndex][0];
  trailingSections.forEach((group) => {
    group.forEach((node) => root.insertBefore(node, anchor));
  });

  return root.innerHTML;
}
