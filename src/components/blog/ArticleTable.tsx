type ArticleTableData = {
  headers?: string[] | null;
  rows?: string[][] | null;
};

/**
 * Normalises whatever came out of the `table_data` jsonb column into a
 * rectangular { headers, rows } shape. Stored rows may be shorter or longer
 * than the header list, so every row is aligned to the headers.
 */
const normalizeTable = (data: unknown) => {
  if (!data || typeof data !== "object") return { headers: [] as string[], rows: [] as string[][] };
  const value = data as ArticleTableData;

  const headers = Array.isArray(value.headers)
    ? value.headers.map((header) => String(header ?? "").trim())
    : [];
  if (headers.length === 0) return { headers, rows: [] as string[][] };

  const rows = Array.isArray(value.rows)
    ? value.rows
        .filter((row) => Array.isArray(row))
        .map((row) => headers.map((_, col) => String(row?.[col] ?? "").trim()))
    : [];

  return { headers, rows };
};

const hasArticleTableData = (data: unknown) => {
  const { headers, rows } = normalizeTable(data);
  return headers.some(Boolean) || rows.some((row) => row.some(Boolean));
};

/**
 * Formatted table rendered inside a blog article. The look follows the
 * editorial tables used in Rawasikh articles: navy header, thin borders and
 * subtle zebra rows.
 */
const ArticleTable = ({ data }: { data: unknown }) => {
  if (!hasArticleTableData(data)) return null;
  const { headers, rows } = normalizeTable(data);

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-border shadow-sm" dir="auto">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-start text-[13.5px] leading-7">
          <thead>
            <tr className="bg-[#1b2a4a] text-white">
              {headers.map((header, col) => (
                <th key={col} className="border border-white/15 px-4 py-3 text-center font-bold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 1 ? "bg-muted/50" : "bg-card"}>
                {row.map((cell, col) => (
                  <td
                    key={col}
                    className="whitespace-pre-line border border-border px-4 py-3 align-top text-muted-foreground"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ArticleTable;
