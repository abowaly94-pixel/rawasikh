import { useMemo, useRef, useState, type DragEvent } from "react";
import { ChevronDown, ChevronUp, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  BookOpen,
  CheckCircle2,
  FileUp,
  Heading2,
  Heading3,
  LayoutList,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Shapes,
  Sparkles,
  Superscript,
  Table2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import ArticleImportDialog from "@/components/dashboard/ArticleImportDialog";
import { DecorationView } from "@/components/blog/ArticleBlocks";
import { cn } from "@/lib/utils";
import {
  ARTICLE_DECORATION_COLORS,
  articleBlockLabel,
  collectFootnotes,
  collectReferences,
  createArticleBlock,
  createHeadingBlock,
  createListBlock,
  duplicateArticleBlock,
  formatArticleNumber,
  makeArticleId,
  type ArticleAlign,
  type ArticleBlock,
  type ArticleConclusionBlock,
  type ArticleDecorationBlock,
  type ArticleFootnotesBlock,
  type ArticleHeadingBlock,
  type ArticleListBlock,
  type ArticleNumbering,
  type ArticleParagraphBlock,
  type ArticleReferencesBlock,
  type ArticleSummaryBlock,
  type ArticleTableBlock,
  type CollectedFootnote,
  type CollectedReference,
} from "@/lib/articleBlocks";

interface Props {
  value: ArticleBlock[];
  onChange: (blocks: ArticleBlock[]) => void;
  title?: string;
  onTitleChange?: (title: string) => void;
}

const alignOptions: { value: ArticleAlign; label: string; icon: typeof AlignRight }[] = [
  { value: "right", label: "يمين", icon: AlignRight },
  { value: "center", label: "وسط", icon: AlignCenter },
  { value: "left", label: "يسار", icon: AlignLeft },
];

const AlignPicker = ({
  value,
  onChange,
}: {
  value: ArticleAlign;
  onChange: (align: ArticleAlign) => void;
}) => (
  <div className="flex items-center gap-1">
    <span className="ml-1 text-[11px] text-muted-foreground">المحاذاة</span>
    {alignOptions.map((option) => {
      const Icon = option.icon;
      return (
        <Button
          key={option.value}
          type="button"
          size="icon-sm"
          variant={value === option.value ? "secondary" : "ghost"}
          onClick={() => onChange(option.value)}
          title={option.label}
          aria-label={option.label}
        >
          <Icon className="h-4 w-4" />
        </Button>
      );
    })}
  </div>
);

const insertAtCursor = (
  element: HTMLTextAreaElement | null,
  currentValue: string,
  token: string,
  onChange: (value: string) => void,
) => {
  if (!element) {
    onChange(`${currentValue}${token}`);
    return;
  }
  const start = element.selectionStart ?? currentValue.length;
  const end = element.selectionEnd ?? start;
  const before = currentValue.slice(0, start);
  const after = currentValue.slice(end);
  const prefix = before && !/\s$/.test(before) ? " " : "";
  const suffix = after && !/^\s/.test(after) ? " " : "";
  const inserted = `${prefix}${token}${suffix}`;
  onChange(`${before}${inserted}${after}`);
  requestAnimationFrame(() => {
    const position = start + inserted.length;
    element.focus();
    element.setSelectionRange(position, position);
  });
};

interface InlineTextareaProps {
  value: string;
  onChange: (value: string) => void;
  footnotes: CollectedFootnote[];
  references: CollectedReference[];
  rows?: number;
  placeholder?: string;
  showToolbar?: boolean;
  className?: string;
}

const InlineTextarea = ({
  value,
  onChange,
  footnotes,
  references,
  rows = 4,
  placeholder,
  showToolbar = true,
  className,
}: InlineTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const referenceGroups = useMemo(() => {
    const groups = new Map<string, { title: string; items: CollectedReference[] }>();
    references.forEach((ref) => {
      const existing = groups.get(ref.groupId);
      if (existing) existing.items.push(ref);
      else groups.set(ref.groupId, { title: ref.groupTitle, items: [ref] });
    });
    return Array.from(groups.values());
  }, [references]);

  const insert = (token: string) => {
    insertAtCursor(textareaRef.current, value, token, onChange);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/70 bg-muted/30 px-1.5 py-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px]"
                disabled={!footnotes.length}
                title={
                  footnotes.length
                    ? "إدراج علامة هامش"
                    : "أضف قسم الهوامش أولًا ثم أدرج العلامة هنا"
                }
              >
                <Superscript className="h-3.5 w-3.5" />
                هامش
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 w-80 overflow-y-auto">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                اختر الهامش لإدراج علامته
              </DropdownMenuLabel>
              {footnotes.length === 0 ? (
                <DropdownMenuItem disabled>لا توجد هوامش بعد</DropdownMenuItem>
              ) : (
                footnotes.map((note) => (
                  <DropdownMenuItem
                    key={note.id}
                    onSelect={() => insert(`[[note:${note.id}]]`)}
                    className="items-start gap-2"
                  >
                    <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1 text-[11px] font-bold text-primary">
                      {formatArticleNumber(note.number, note.numbering)}
                    </span>
                    <span className="line-clamp-2 text-xs leading-5">{note.text || "هامش فارغ"}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px]"
                disabled={!references.length}
                title={
                  references.length
                    ? "إدراج إحالة إلى مرجع"
                    : "أضف قسم المراجع أولًا ثم أدرج الإحالة هنا"
                }
              >
                <BookOpen className="h-3.5 w-3.5" />
                إحالة
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 w-96 overflow-y-auto">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                اختر المرجع لإدراج إحالته
              </DropdownMenuLabel>
              {references.length === 0 ? (
                <DropdownMenuItem disabled>لا توجد مراجع بعد</DropdownMenuItem>
              ) : (
                referenceGroups.map((group, groupIndex) => (
                  <div key={`${group.title}-${groupIndex}`}>
                    {group.title.trim() && (
                      <DropdownMenuLabel className="text-[11px] text-gold-strong">
                        {group.title}
                      </DropdownMenuLabel>
                    )}
                    {group.items.map((ref) => (
                      <DropdownMenuItem
                        key={ref.id}
                        onSelect={() => insert(`[[ref:${ref.id}]]`)}
                        className="items-start gap-2"
                      >
                        <span className="mt-0.5 shrink-0 text-[11px] font-bold text-primary">
                          [{ref.key.trim() || formatArticleNumber(ref.number, ref.numbering)}]
                        </span>
                        <span className="line-clamp-2 text-xs leading-5">{ref.text || "مرجع فارغ"}</span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="ms-auto hidden text-[10px] text-muted-foreground sm:inline">
            العلامات تُربط تلقائيًا بالهامش أو المرجع
          </span>
        </div>
      )}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        dir="rtl"
        className="min-h-[80px] resize-y text-sm leading-7"
      />
    </div>
  );
};

const HeadingEditor = ({
  block,
  onChange,
  footnotes,
  references,
}: {
  block: ArticleHeadingBlock;
  onChange: (block: ArticleBlock) => void;
  footnotes: CollectedFootnote[];
  references: CollectedReference[];
}) => (
  <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
        {([2, 3] as const).map((level) => (
          <Button
            key={level}
            type="button"
            size="sm"
            variant={block.level === level ? "secondary" : "ghost"}
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => onChange({ ...block, level })}
          >
            {level === 2 ? <Heading2 className="h-3.5 w-3.5" /> : <Heading3 className="h-3.5 w-3.5" />}
            {level === 2 ? "رئيسي" : "فرعي"}
          </Button>
        ))}
      </div>
      <AlignPicker value={block.align} onChange={(align) => onChange({ ...block, align })} />
    </div>
    <InlineTextarea
      value={block.text}
      onChange={(text) => onChange({ ...block, text })}
      footnotes={footnotes}
      references={references}
      rows={2}
      placeholder={block.level === 2 ? "مثال: المحور الثالث — التحقق من المصادر" : "مثال: بروتوكول التحقق في خمس خطوات"}
    />
  </div>
);

const ParagraphEditor = ({
  block,
  onChange,
  footnotes,
  references,
}: {
  block: ArticleParagraphBlock;
  onChange: (block: ArticleBlock) => void;
  footnotes: CollectedFootnote[];
  references: CollectedReference[];
}) => (
  <div className="space-y-3">
    <div className="flex justify-end">
      <AlignPicker value={block.align} onChange={(align) => onChange({ ...block, align })} />
    </div>
    <InlineTextarea
      value={block.text}
      onChange={(text) => onChange({ ...block, text })}
      footnotes={footnotes}
      references={references}
      rows={5}
      placeholder="اكتب الفقرة هنا… يمكنك إدراج هامش أو إحالة من الأزرار أعلاه."
    />
  </div>
);

const ListEditor = ({
  block,
  onChange,
}: {
  block: ArticleListBlock;
  onChange: (block: ArticleBlock) => void;
}) => {
  const updateItem = (index: number, value: string) => {
    onChange({
      ...block,
      items: block.items.map((item, itemIndex) => (itemIndex === index ? value : item)),
    });
  };

  const addItem = () => onChange({ ...block, items: [...block.items, ""] });

  const removeItem = (index: number) => {
    if (block.items.length <= 1) {
      onChange({ ...block, items: [""] });
      return;
    }
    onChange({ ...block, items: block.items.filter((_, itemIndex) => itemIndex !== index) });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= block.items.length) return;
    const items = [...block.items];
    [items[index], items[target]] = [items[target], items[index]];
    onChange({ ...block, items });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
          <Button
            type="button"
            size="sm"
            variant={!block.ordered ? "secondary" : "ghost"}
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => onChange({ ...block, ordered: false })}
          >
            <List className="h-3.5 w-3.5" />
            نقطية
          </Button>
          <Button
            type="button"
            size="sm"
            variant={block.ordered ? "secondary" : "ghost"}
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => onChange({ ...block, ordered: true })}
          >
            <ListOrdered className="h-3.5 w-3.5" />
            مرقمة
          </Button>
        </div>
        {block.ordered && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">الأرقام</span>
            <Select
              value={block.numbering}
              onValueChange={(numbering) =>
                onChange({ ...block, numbering: numbering as ArticleNumbering })
              }
            >
              <SelectTrigger className="h-8 w-[122px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arabic">عربية (١، ٢)</SelectItem>
                <SelectItem value="western">غربية (1، 2)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {block.items.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="mt-2 w-7 shrink-0 text-center text-xs text-muted-foreground">
              {block.ordered
                ? block.numbering === "arabic"
                  ? formatArticleNumber(index + 1, "arabic")
                  : index + 1
                : "•"}
            </span>
            <Textarea
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              rows={2}
              dir="rtl"
              placeholder={`عنصر ${index + 1}`}
              className="min-h-[48px] flex-1 resize-y text-sm leading-7"
            />
            <div className="flex flex-col">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => moveItem(index, -1)}
                disabled={index === 0}
                title="تحريك لأعلى"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => moveItem(index, 1)}
                disabled={index === block.items.length - 1}
                title="تحريك لأسفل"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive"
                onClick={() => removeItem(index)}
                title="حذف العنصر"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-1">
        <Plus className="h-3.5 w-3.5" />
        إضافة عنصر للقائمة
      </Button>
    </div>
  );
};

const TableEditor = ({
  block,
  onChange,
}: {
  block: ArticleTableBlock;
  onChange: (block: ArticleBlock) => void;
}) => {
  const updateHeader = (col: number, value: string) => {
    onChange({
      ...block,
      headers: block.headers.map((header, index) => (index === col ? value : header)),
    });
  };

  const updateCell = (row: number, col: number, value: string) => {
    onChange({
      ...block,
      rows: block.rows.map((cells, rowIndex) =>
        rowIndex === row ? cells.map((cell, colIndex) => (colIndex === col ? value : cell)) : cells,
      ),
    });
  };

  const addRow = () => {
    onChange({ ...block, rows: [...block.rows, block.headers.map(() => "")] });
  };

  const addColumn = () => {
    onChange({
      ...block,
      headers: [...block.headers, ""],
      rows: block.rows.map((cells) => [...cells, ""]),
    });
  };

  const removeRow = (row: number) => {
    onChange({ ...block, rows: block.rows.filter((_, index) => index !== row) });
  };

  const removeColumn = (col: number) => {
    if (block.headers.length <= 1) return;
    onChange({
      ...block,
      headers: block.headers.filter((_, index) => index !== col),
      rows: block.rows.map((cells) => cells.filter((_, index) => index !== col)),
    });
  };

  const moveRow = (row: number, direction: -1 | 1) => {
    const target = row + direction;
    if (target < 0 || target >= block.rows.length) return;
    const rows = [...block.rows];
    [rows[row], rows[target]] = [rows[target], rows[row]];
    onChange({ ...block, rows });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[11px] text-muted-foreground">عنوان الجدول (اختياري)</Label>
        <Input
          value={block.caption}
          onChange={(event) => onChange({ ...block, caption: event.target.value })}
          placeholder="مثال: الأخطاء الشائعة وطرق تجنبها"
          className="mt-1 h-8 text-sm"
          dir="rtl"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] table-fixed border-collapse">
          <thead>
            <tr>
              <th className="w-8 border border-border bg-muted p-1" />
              {block.headers.map((header, col) => (
                <th key={col} className="border border-border bg-muted p-1.5 align-top">
                  <div className="flex items-start gap-1">
                    <Input
                      value={header}
                      onChange={(event) => updateHeader(col, event.target.value)}
                      placeholder={`عنوان العمود ${col + 1}`}
                      className="h-8 flex-1 bg-background text-xs font-bold"
                      dir="rtl"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 shrink-0 text-destructive"
                      onClick={() => removeColumn(col)}
                      disabled={block.headers.length <= 1}
                      title="حذف العمود"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="border border-border p-1 text-center align-middle">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] text-muted-foreground">{rowIndex + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6"
                      onClick={() => moveRow(rowIndex, -1)}
                      disabled={rowIndex === 0}
                      title="تحريك الصف لأعلى"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6"
                      onClick={() => moveRow(rowIndex, 1)}
                      disabled={rowIndex === block.rows.length - 1}
                      title="تحريك الصف لأسفل"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeRow(rowIndex)}
                      title="حذف الصف"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
                {row.map((cell, col) => (
                  <td key={col} className="border border-border p-1.5 align-top">
                    <Textarea
                      value={cell}
                      onChange={(event) => updateCell(rowIndex, col, event.target.value)}
                      rows={2}
                      placeholder="نص الخلية"
                      dir="rtl"
                      className="min-h-[54px] resize-y bg-background text-xs leading-6"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addRow} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          إضافة صف
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={addColumn} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          إضافة عمود
        </Button>
      </div>
    </div>
  );
};

const FootnotesEditor = ({
  block,
  onChange,
  allFootnotes,
}: {
  block: ArticleFootnotesBlock;
  onChange: (block: ArticleBlock) => void;
  allFootnotes: CollectedFootnote[];
}) => {
  const updateItem = (index: number, text: string) => {
    onChange({
      ...block,
      items: block.items.map((item, itemIndex) => (itemIndex === index ? { ...item, text } : item)),
    });
  };

  const addItem = () =>
    onChange({ ...block, items: [...block.items, { id: makeArticleId("fn"), text: "" }] });

  const removeItem = (index: number) => {
    if (block.items.length <= 1) {
      onChange({ ...block, items: [{ id: makeArticleId("fn"), text: "" }] });
      return;
    }
    onChange({ ...block, items: block.items.filter((_, itemIndex) => itemIndex !== index) });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= block.items.length) return;
    const items = [...block.items];
    [items[index], items[target]] = [items[target], items[index]];
    onChange({ ...block, items });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <div>
          <Label className="text-[11px] text-muted-foreground">عنوان قسم الهوامش</Label>
          <Input
            value={block.title}
            onChange={(event) => onChange({ ...block, title: event.target.value })}
            className="mt-1 h-8 text-sm"
            dir="rtl"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">شكل الأرقام</Label>
          <Select
            value={block.numbering}
            onValueChange={(numbering) =>
              onChange({ ...block, numbering: numbering as ArticleNumbering })
            }
          >
            <SelectTrigger className="mt-1 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arabic">عربية (١، ٢)</SelectItem>
              <SelectItem value="western">غربية (1، 2)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="rounded-lg bg-primary/5 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
        الترقيم تلقائي حسب ترتيب الهوامش في المقال. لإدراج علامة داخل فقرة، استخدم زر «هامش»
        أعلى مربع النص هناك.
      </p>

      <div className="space-y-2">
        {block.items.map((item, index) => {
          const collected = allFootnotes.find((note) => note.id === item.id);
          return (
            <div key={item.id} className="flex items-start gap-2 rounded-lg border border-border p-2">
              <span className="mt-2 inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1 text-[11px] font-bold text-primary">
                {collected ? formatArticleNumber(collected.number, collected.numbering) : "—"}
              </span>
              <Textarea
                value={item.text}
                onChange={(event) => updateItem(index, event.target.value)}
                rows={2}
                dir="rtl"
                placeholder="نص الهامش…"
                className="min-h-[48px] flex-1 resize-y text-sm leading-7"
              />
              <div className="flex flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  title="تحريك لأعلى"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === block.items.length - 1}
                  title="تحريك لأسفل"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  onClick={() => removeItem(index)}
                  title="حذف الهامش"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-1">
        <Plus className="h-3.5 w-3.5" />
        إضافة هامش
      </Button>
    </div>
  );
};

const ReferencesEditor = ({
  block,
  onChange,
  allReferences,
}: {
  block: ArticleReferencesBlock;
  onChange: (block: ArticleBlock) => void;
  allReferences: CollectedReference[];
}) => {
  const updateGroup = (groupId: string, patch: Partial<ArticleReferencesBlock["groups"][number]>) => {
    onChange({
      ...block,
      groups: block.groups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)),
    });
  };

  const addGroup = () =>
    onChange({
      ...block,
      groups: [
        ...block.groups,
        { id: makeArticleId("rg"), title: "", items: [{ id: makeArticleId("ref"), key: "", text: "" }] },
      ],
    });

  const removeGroup = (groupId: string) => {
    if (block.groups.length <= 1) {
      onChange({
        ...block,
        groups: [{ id: makeArticleId("rg"), title: "", items: [{ id: makeArticleId("ref"), key: "", text: "" }] }],
      });
      return;
    }
    onChange({ ...block, groups: block.groups.filter((group) => group.id !== groupId) });
  };

  const moveGroup = (groupId: string, direction: -1 | 1) => {
    const index = block.groups.findIndex((group) => group.id === groupId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= block.groups.length) return;
    const groups = [...block.groups];
    [groups[index], groups[target]] = [groups[target], groups[index]];
    onChange({ ...block, groups });
  };

  const addReference = (groupId: string) => {
    const group = block.groups.find((entry) => entry.id === groupId);
    if (!group) return;
    updateGroup(groupId, {
      items: [...group.items, { id: makeArticleId("ref"), key: "", text: "" }],
    });
  };

  const updateReference = (
    groupId: string,
    referenceId: string,
    patch: Partial<ArticleReferencesBlock["groups"][number]["items"][number]>,
  ) => {
    const group = block.groups.find((entry) => entry.id === groupId);
    if (!group) return;
    updateGroup(groupId, {
      items: group.items.map((item) => (item.id === referenceId ? { ...item, ...patch } : item)),
    });
  };

  const removeReference = (groupId: string, referenceId: string) => {
    const group = block.groups.find((entry) => entry.id === groupId);
    if (!group) return;
    if (group.items.length <= 1) {
      updateGroup(groupId, { items: [{ id: makeArticleId("ref"), key: "", text: "" }] });
      return;
    }
    updateGroup(groupId, { items: group.items.filter((item) => item.id !== referenceId) });
  };

  const moveReference = (groupId: string, referenceId: string, direction: -1 | 1) => {
    const group = block.groups.find((entry) => entry.id === groupId);
    if (!group) return;
    const index = group.items.findIndex((item) => item.id === referenceId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= group.items.length) return;
    const items = [...group.items];
    [items[index], items[target]] = [items[target], items[index]];
    updateGroup(groupId, { items });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <div>
          <Label className="text-[11px] text-muted-foreground">عنوان قسم المراجع</Label>
          <Input
            value={block.title}
            onChange={(event) => onChange({ ...block, title: event.target.value })}
            className="mt-1 h-8 text-sm"
            dir="rtl"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">شكل الأرقام</Label>
          <Select
            value={block.numbering}
            onValueChange={(numbering) =>
              onChange({ ...block, numbering: numbering as ArticleNumbering })
            }
          >
            <SelectTrigger className="mt-1 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arabic">عربية (١، ٢)</SelectItem>
              <SelectItem value="western">غربية (1، 2)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-[11px] text-muted-foreground">
          تمهيد قسم المراجع (اختياري)
        </Label>
        <Textarea
          value={block.intro || ""}
          onChange={(event) => onChange({ ...block, intro: event.target.value })}
          className="mt-1 min-h-[52px] text-sm leading-6"
          placeholder="مثال: وُثّقت المراجع وفق نظام APA، ورُتّبت العربية أولًا ثم الأجنبية."
          dir="rtl"
        />
      </div>

      <p className="rounded-lg bg-primary/5 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
        صنّف المراجع في مجموعات (مثل: مصادر عربية، مصادر أجنبية، تقارير). لكل مرجع «مفتاح
        إحالة» قصير يظهر داخل النص عند ربطه.
      </p>

      <div className="space-y-3">
        {block.groups.map((group, groupIndex) => {
          const collectedGroup = allReferences.filter((ref) => ref.groupId === group.id);
          return (
            <div key={group.id} className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground">
                  مجموعة {groupIndex + 1}
                </span>
                <Input
                  value={group.title}
                  onChange={(event) => updateGroup(group.id, { title: event.target.value })}
                  placeholder="اسم التصنيف (مثال: مصادر عربية)"
                  className="h-8 flex-1 bg-background text-xs"
                  dir="rtl"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveGroup(group.id, -1)}
                  disabled={groupIndex === 0}
                  title="تحريك المجموعة لأعلى"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveGroup(group.id, 1)}
                  disabled={groupIndex === block.groups.length - 1}
                  title="تحريك المجموعة لأسفل"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  onClick={() => removeGroup(group.id)}
                  title="حذف المجموعة"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {group.items.map((item, itemIndex) => {
                  const collected = collectedGroup.find((ref) => ref.id === item.id);
                  return (
                    <div key={item.id} className="rounded-lg border border-border bg-background p-2">
                      <div className="flex items-start gap-2">
                        <span className="mt-2 inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 px-1 text-[11px] font-bold text-gold-strong">
                          {collected
                            ? formatArticleNumber(collected.number, collected.numbering)
                            : "—"}
                        </span>
                        <Input
                          value={item.key}
                          onChange={(event) =>
                            updateReference(group.id, item.id, { key: event.target.value })
                          }
                          placeholder="مفتاح الإحالة"
                          className="h-8 w-32 shrink-0 text-xs"
                          dir="rtl"
                        />
                        <Textarea
                          value={item.text}
                          onChange={(event) =>
                            updateReference(group.id, item.id, { text: event.target.value })
                          }
                          rows={2}
                          dir="rtl"
                          placeholder="المرجع الكامل…"
                          className="min-h-[48px] flex-1 resize-y text-xs leading-6"
                        />
                        <div className="flex flex-col">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => moveReference(group.id, item.id, -1)}
                            disabled={itemIndex === 0}
                            title="تحريك المرجع لأعلى"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => moveReference(group.id, item.id, 1)}
                            disabled={itemIndex === group.items.length - 1}
                            title="تحريك المرجع لأسفل"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive"
                            onClick={() => removeReference(group.id, item.id)}
                            title="حذف المرجع"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2 gap-1"
                onClick={() => addReference(group.id)}
              >
                <Plus className="h-3.5 w-3.5" />
                إضافة مرجع
              </Button>
            </div>
          );
        })}
      </div>

      <Button type="button" size="sm" variant="outline" onClick={addGroup} className="gap-1">
        <Plus className="h-3.5 w-3.5" />
        إضافة مجموعة مراجع
      </Button>
    </div>
  );
};

const TextSectionEditor = ({
  block,
  onChange,
  footnotes,
  references,
}: {
  block: ArticleSummaryBlock | ArticleConclusionBlock;
  onChange: (block: ArticleBlock) => void;
  footnotes: CollectedFootnote[];
  references: CollectedReference[];
}) => (
  <div className="space-y-3">
    <div>
      <Label className="text-[11px] text-muted-foreground">
        {block.type === "summary" ? "عنوان الخلاصة" : "عنوان الخاتمة"}
      </Label>
      <Input
        value={block.title}
        onChange={(event) => onChange({ ...block, title: event.target.value })}
        className="mt-1 h-8 text-sm"
        dir="rtl"
      />
    </div>
    <InlineTextarea
      value={block.text}
      onChange={(text) => onChange({ ...block, text })}
      footnotes={footnotes}
      references={references}
      rows={5}
      placeholder={
        block.type === "summary"
          ? "خلاصة قصيرة مستقلة تختصر أهم ما في المقال…"
          : "خاتمة المقال وما ينتهي إليه الباحث…"
      }
    />
  </div>
);

const DecorationEditor = ({
  block,
  onChange,
}: {
  block: ArticleDecorationBlock;
  onChange: (block: ArticleBlock) => void;
}) => {
  const shapes: { value: ArticleDecorationBlock["shape"]; label: string }[] = [
    { value: "divider", label: "فاصل" },
    { value: "line", label: "خط" },
    { value: "ornament", label: "زخرفة" },
    { value: "arrow", label: "سهم" },
    { value: "dots", label: "نقاط" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {shapes.map((shape) => (
          <Button
            key={shape.value}
            type="button"
            size="sm"
            variant={block.shape === shape.value ? "secondary" : "outline"}
            className="h-8 px-3 text-xs"
            onClick={() => onChange({ ...block, shape: shape.value })}
          >
            {shape.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-[11px] text-muted-foreground">الحجم</Label>
          <Select
            value={block.size}
            onValueChange={(size) =>
              onChange({ ...block, size: size as ArticleDecorationBlock["size"] })
            }
          >
            <SelectTrigger className="mt-1 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">صغير</SelectItem>
              <SelectItem value="md">متوسط</SelectItem>
              <SelectItem value="lg">كبير</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">الموضع</Label>
          <div className="mt-1 flex h-8 items-center rounded-md border border-input px-1">
            <AlignPicker value={block.align} onChange={(align) => onChange({ ...block, align })} />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-[11px] text-muted-foreground">اللون</Label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {ARTICLE_DECORATION_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => onChange({ ...block, color: color.value })}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-transform",
                block.color.toLowerCase() === color.value.toLowerCase()
                  ? "scale-110 border-foreground"
                  : "border-transparent",
              )}
              style={{ backgroundColor: color.value }}
              title={color.label}
              aria-label={color.label}
            />
          ))}
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(block.color) ? block.color : "#b08d57"}
            onChange={(event) => onChange({ ...block, color: event.target.value })}
            className="h-8 w-9 cursor-pointer rounded border border-border bg-background p-0.5"
            title="لون مخصص"
          />
          <Input
            value={block.color}
            onChange={(event) => onChange({ ...block, color: event.target.value })}
            className="h-8 w-28 text-xs"
            dir="ltr"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="mb-1 text-[10px] text-muted-foreground">معاينة</p>
        <DecorationView block={block} />
      </div>

      <p className="text-[11px] leading-5 text-muted-foreground">
        الزخارف اختيارية؛ استخدمها باعتدال لأن المقال أكاديمي.
      </p>
    </div>
  );
};

const blockPreview = (block: ArticleBlock): string => {
  switch (block.type) {
    case "heading":
      return block.text.trim().slice(0, 90);
    case "paragraph":
      return block.text.trim().slice(0, 90);
    case "list":
      return block.items.find((item) => item.trim())?.trim().slice(0, 90) || "";
    case "table":
      return block.caption.trim() || `${block.headers.length} أعمدة × ${block.rows.length} صفوف`;
    case "footnotes":
      return block.items.find((item) => item.text.trim())?.text.trim().slice(0, 90) || "";
    case "references":
      return (
        block.groups
          .flatMap((group) => group.items)
          .find((item) => item.text.trim())
          ?.text.trim()
          .slice(0, 90) || ""
      );
    case "summary":
    case "conclusion":
      return block.text.trim().slice(0, 90);
    case "decoration":
      return "عنصر بصري هادئ";
  }
};

const blockIcon = (block: ArticleBlock) => {
  switch (block.type) {
    case "heading":
      return block.level === 2 ? Heading2 : Heading3;
    case "paragraph":
      return Pilcrow;
    case "list":
      return block.ordered ? ListOrdered : List;
    case "table":
      return Table2;
    case "footnotes":
      return Superscript;
    case "references":
      return BookOpen;
    case "summary":
      return Sparkles;
    case "conclusion":
      return CheckCircle2;
    case "decoration":
      return Shapes;
  }
};

const AddBlockMenu = ({ onAdd }: { onAdd: (block: ArticleBlock) => void }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button type="button" variant="outline" className="gap-2">
        <Plus className="h-4 w-4" />
        إضافة عنصر
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="max-h-[70vh] w-60 overflow-y-auto">
      <DropdownMenuLabel>نصوص وعناوين</DropdownMenuLabel>
      <DropdownMenuItem onSelect={() => onAdd(createHeadingBlock(2))}>
        <Heading2 className="h-4 w-4" />
        عنوان رئيسي
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAdd(createHeadingBlock(3))}>
        <Heading3 className="h-4 w-4" />
        عنوان فرعي
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAdd(createArticleBlock("paragraph"))}>
        <Pilcrow className="h-4 w-4" />
        فقرة
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAdd(createListBlock(false))}>
        <List className="h-4 w-4" />
        قائمة نقطية
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAdd(createListBlock(true))}>
        <ListOrdered className="h-4 w-4" />
        قائمة مرقمة
      </DropdownMenuItem>

      <DropdownMenuSeparator />
      <DropdownMenuLabel>بيانات</DropdownMenuLabel>
      <DropdownMenuItem onSelect={() => onAdd(createArticleBlock("table"))}>
        <Table2 className="h-4 w-4" />
        جدول قابل للتعديل
      </DropdownMenuItem>

      <DropdownMenuSeparator />
      <DropdownMenuLabel>هوامش ومراجع</DropdownMenuLabel>
      <DropdownMenuItem onSelect={() => onAdd(createArticleBlock("footnotes"))}>
        <Superscript className="h-4 w-4" />
        قسم الهوامش
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAdd(createArticleBlock("references"))}>
        <BookOpen className="h-4 w-4" />
        قسم المراجع
      </DropdownMenuItem>

      <DropdownMenuSeparator />
      <DropdownMenuLabel>خاتمة</DropdownMenuLabel>
      <DropdownMenuItem onSelect={() => onAdd(createArticleBlock("summary"))}>
        <Sparkles className="h-4 w-4" />
        خلاصة قصيرة
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAdd(createArticleBlock("conclusion"))}>
        <CheckCircle2 className="h-4 w-4" />
        خاتمة
      </DropdownMenuItem>

      <DropdownMenuSeparator />
      <DropdownMenuLabel>جمالي (اختياري)</DropdownMenuLabel>
      <DropdownMenuItem onSelect={() => onAdd(createArticleBlock("decoration"))}>
        <Minus className="h-4 w-4" />
        فاصل أو زخرفة هادئة
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const BlockCard = ({
  block,
  index,
  total,
  defaultOpen,
  onChange,
  onRemove,
  onDuplicate,
  onMove,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragOver,
  footnotes,
  references,
}: {
  block: ArticleBlock;
  index: number;
  total: number;
  defaultOpen: boolean;
  onChange: (block: ArticleBlock) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  isDragOver: boolean;
  footnotes: CollectedFootnote[];
  references: CollectedReference[];
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = blockIcon(block);
  const preview = blockPreview(block);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver();
      }}
      onDrop={onDrop}
      className={cn(
        "rounded-xl border border-border bg-card transition-shadow",
        isDragOver && "ring-2 ring-primary/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-3 py-2">
        <div
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          title="اسحب لإعادة الترتيب"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px]">
          <Icon className="h-3 w-3" />
          {articleBlockLabel(block)}
        </Badge>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="min-w-0 flex-1 truncate text-start text-xs text-muted-foreground hover:text-foreground"
          title={preview || articleBlockLabel(block)}
        >
          {!open && preview ? preview : ""}
        </button>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            title="تحريك العنصر لأعلى"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            title="تحريك العنصر لأسفل"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onDuplicate}
            title="نسخ العنصر"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-destructive"
            onClick={onRemove}
            title="حذف العنصر"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen((current) => !current)}
            title={open ? "طي العنصر" : "فتح العنصر"}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="p-3">
          {block.type === "heading" && (
            <HeadingEditor
              block={block}
              onChange={onChange}
              footnotes={footnotes}
              references={references}
            />
          )}
          {block.type === "paragraph" && (
            <ParagraphEditor
              block={block}
              onChange={onChange}
              footnotes={footnotes}
              references={references}
            />
          )}
          {block.type === "list" && <ListEditor block={block} onChange={onChange} />}
          {block.type === "table" && <TableEditor block={block} onChange={onChange} />}
          {block.type === "footnotes" && (
            <FootnotesEditor block={block} onChange={onChange} allFootnotes={footnotes} />
          )}
          {block.type === "references" && (
            <ReferencesEditor block={block} onChange={onChange} allReferences={references} />
          )}
          {(block.type === "summary" || block.type === "conclusion") && (
            <TextSectionEditor
              block={block}
              onChange={onChange}
              footnotes={footnotes}
              references={references}
            />
          )}
          {block.type === "decoration" && <DecorationEditor block={block} onChange={onChange} />}
        </div>
      )}
    </div>
  );
};

/**
 * The structured article editor. Every block is independent: drag the grip
 * (or use the arrow buttons) to reorder it, duplicate it, or delete it.
 */
const ArticleBlocksEditor = ({ value, onChange, title = "", onTitleChange }: Props) => {
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const footnotes = useMemo(() => collectFootnotes(value), [value]);
  const references = useMemo(() => collectReferences(value), [value]);

  const updateBlock = (index: number, block: ArticleBlock) => {
    onChange(value.map((current, currentIndex) => (currentIndex === index ? block : current)));
  };

  const addBlock = (block: ArticleBlock) => {
    onChange([...value, block]);
  };

  const removeBlock = (index: number) => {
    onChange(value.filter((_, currentIndex) => currentIndex !== index));
  };

  const duplicateBlock = (index: number) => {
    const next = [...value];
    next.splice(index + 1, 0, duplicateArticleBlock(value[index]));
    onChange(next);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetIndex: number) => {
    event.preventDefault();
    const sourceIndex = Number(event.dataTransfer.getData("text/plain"));
    setDragOver(null);
    if (Number.isNaN(sourceIndex) || sourceIndex === targetIndex) return;
    if (sourceIndex < 0 || sourceIndex >= value.length) return;
    const next = [...value];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/25 px-4 py-3">
        <div className="flex items-center gap-2">
          <LayoutList className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-bold text-foreground">محرر عناصر المقال</p>
            <p className="text-[11px] text-muted-foreground">
              كل محور أو قسم عنصر مستقل — أعد ترتيبه بالسحب أو بالأسهم.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Badge variant="outline">{value.length} عنصر</Badge>
          <Badge variant="outline">{footnotes.length} هامش</Badge>
          <Badge variant="outline">{references.length} مرجع</Badge>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => setImportOpen(true)}
          >
            <FileUp className="h-4 w-4" />
            استيراد Word/PDF
          </Button>
          <AddBlockMenu onAdd={addBlock} />
        </div>
      </div>

      <p className="text-[10px] leading-5 text-muted-foreground">
        يمكنك كتابة <code>**عريض**</code> و<code>*مائل*</code> و<code>[رابط](https://…)</code>{" "}
        داخل الفقرات، واستخدام <code>[[note:…]]</code> أو <code>[[ref:…]]</code> لربط
        الهوامش والمراجع.
      </p>

      {value.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/10 px-6 py-10 text-center">
          <LayoutList className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="font-semibold text-foreground">لا توجد عناصر بعد</p>
          <p className="mx-auto mt-1 max-w-md text-[12px] leading-6 text-muted-foreground">
            ابدأ بعنوان رئيسي ثم أضف الفقرات والقوائم والجداول. يمكنك إضافة الهوامش والمراجع
            والخلاصة والخاتمة في أي وقت، ثم سحب العناصر لإعادة ترتيبها. أو استورد مقالًا
            كاملًا من Word/PDF.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setImportOpen(true)}
            >
              <FileUp className="h-4 w-4" />
              استيراد من ملف
            </Button>
            <AddBlockMenu onAdd={addBlock} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {value.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              index={index}
              total={value.length}
              defaultOpen={value.length <= 20}
              onChange={(next) => updateBlock(index, next)}
              onRemove={() => removeBlock(index)}
              onDuplicate={() => duplicateBlock(index)}
              onMove={(direction) => moveBlock(index, direction)}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(index));
              }}
              onDragEnd={() => setDragOver(null)}
              onDragOver={() => setDragOver(index)}
              onDrop={(event) => handleDrop(event, index)}
              isDragOver={dragOver === index}
              footnotes={footnotes}
              references={references}
            />
          ))}
          <div className="flex justify-center pt-1">
            <AddBlockMenu onAdd={addBlock} />
          </div>
        </div>
      )}

      <ArticleImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        currentTitle={title}
        hasBlocks={value.length > 0}
        onImport={({ blocks, mode, title: importedTitle }) => {
          onChange(mode === "replace" ? blocks : [...value, ...blocks]);
          if (importedTitle && onTitleChange) onTitleChange(importedTitle);
        }}
      />
    </div>
  );
};

export default ArticleBlocksEditor;
