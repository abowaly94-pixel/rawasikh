import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { articleBlockLabel, type ArticleBlock } from "@/lib/articleBlocks";
import {
  DEFAULT_ARTICLE_IMPORT_OPTIONS,
  importArticleFile,
  type ArticleImportMode,
  type ArticleImportOptions,
  type ArticleImportPayload,
  type ArticleImportResult,
  type ArticleImportStats,
} from "@/lib/articleImport";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTitle: string;
  hasBlocks: boolean;
  onImport: (payload: ArticleImportPayload) => void;
}

const OPTION_ROWS: {
  key: keyof ArticleImportOptions;
  label: string;
  hint: string;
}[] = [
  {
    key: "skipCover",
    label: "تخطي صفحة الغلاف",
    hint: "إزالة العنوان وبيانات الإعداد قبل أول عنوان داخل المقال.",
  },
  {
    key: "detectReferences",
    label: "تحويل قائمة المراجع",
    hint: "جمع المراجع في عنصر مراجع مستقل مع تقسيم عربي/أجنبي.",
  },
  {
    key: "detectSummary",
    label: "اكتشاف الخلاصة والخاتمة",
    hint: "تحويل القسم القصير في النهاية إلى عنصر خلاصة أو خاتمة.",
  },
  {
    key: "includeFootnotes",
    label: "استيراد الهوامش",
    hint: "ربط أرقام الهوامش في Word بمواضعها تلقائيًا.",
  },
  {
    key: "firstRowHeader",
    label: "اعتبار أول صف من الجدول عنوانًا",
    hint: "يُستخدم عندما لا يحدد Word صفًا للعناوين.",
  },
  {
    key: "repairArabic",
    label: "تصحيح رموز اللام-ألف في PDF",
    hint: "يعالج انعكاس «لا» إلى «ال» الشائع في ملفات PDF العربية.",
  },
];

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
};

const blockPreview = (block: ArticleBlock): string => {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "summary":
    case "conclusion":
      return block.text.replace(/\n+/g, " ").slice(0, 110);
    case "list":
      return block.items.find((item) => item.trim())?.slice(0, 110) || "";
    case "table":
      return block.caption || `${block.headers.length} أعمدة × ${block.rows.length} صفوف`;
    case "footnotes":
      return block.items.find((item) => item.text.trim())?.text.slice(0, 110) || "";
    case "references":
      return (
        block.groups
          .flatMap((group) => group.items)
          .find((item) => item.text.trim())
          ?.text.slice(0, 110) || ""
      );
    case "decoration":
      return "فاصل بصري هادئ";
  }
};

const STAT_ROWS: { key: keyof ArticleImportStats; label: string }[] = [
  { key: "headings", label: "عنوان" },
  { key: "paragraphs", label: "فقرة" },
  { key: "lists", label: "قائمة" },
  { key: "tables", label: "جدول" },
  { key: "footnotes", label: "هامش" },
  { key: "references", label: "مرجع" },
  { key: "words", label: "كلمة" },
];

const ArticleImportDialog = ({
  open,
  onOpenChange,
  currentTitle,
  hasBlocks,
  onImport,
}: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<ArticleImportOptions>(DEFAULT_ARTICLE_IMPORT_OPTIONS);
  const [result, setResult] = useState<ArticleImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<ArticleImportMode>(hasBlocks ? "append" : "replace");
  const [applyTitle, setApplyTitle] = useState(!currentTitle.trim());
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setResult(null);
    setError("");
    setBusy(false);
    setMode(hasBlocks ? "append" : "replace");
    setApplyTitle(!currentTitle.trim());
    setDragging(false);
    requestRef.current += 1;
  }, [open, hasBlocks, currentTitle]);

  useEffect(() => {
    if (!file) return;
    const request = requestRef.current + 1;
    requestRef.current = request;
    setBusy(true);
    setError("");
    importArticleFile(file, options)
      .then((imported) => {
        if (requestRef.current !== request) return;
        setResult(imported);
      })
      .catch((reason: unknown) => {
        if (requestRef.current !== request) return;
        setResult(null);
        setError(reason instanceof Error ? reason.message : "تعذر تحليل الملف.");
      })
      .finally(() => {
        if (requestRef.current === request) setBusy(false);
      });
  }, [file, options]);

  const chooseFile = (selected: File | null) => {
    if (!selected) return;
    setResult(null);
    setError("");
    setFile(selected);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0] || null);
  };

  const toggleOption = (key: keyof ArticleImportOptions, checked: boolean) => {
    setOptions((current) => ({ ...current, [key]: checked }));
  };

  const handleImport = () => {
    if (!result?.blocks.length) return;
    onImport({
      blocks: result.blocks,
      mode,
      title: applyTitle && result.title ? result.title : undefined,
    });
    onOpenChange(false);
  };

  const blockCount = result?.blocks.length || 0;
  const isPdf = file?.name.toLowerCase().endsWith(".pdf");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-4xl overflow-y-auto text-start"
      >
        <DialogHeader className="text-start sm:text-start">
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" />
            استيراد مقال من Word أو PDF
          </DialogTitle>
          <DialogDescription className="text-start leading-6">
            يُعالَج الملف داخل متصفحك ولا يُرفع إلى أي خادم. Word يعطي أفضل نتيجة
            للعناوين والجداول والهوامش؛ PDF يُستخرج كنص تقديري.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-3">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "rounded-2xl border-2 border-dashed px-5 py-7 text-center transition-colors",
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/20 hover:border-primary/50",
              )}
            >
              <UploadCloud className="mx-auto mb-3 h-9 w-9 text-primary/80" />
              <p className="text-sm font-bold text-foreground">
                {file ? file.name : "اسحب الملف هنا أو اختره من جهازك"}
              </p>
              {file ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatBytes(file.size)} — يمكنك اختيار ملف آخر لتغييره
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  docx أو pdf — بحد أقصى 30 ميجابايت
                </p>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                className="sr-only"
                onChange={(event) => {
                  chooseFile(event.target.files?.[0] || null);
                  event.target.value = "";
                }}
              />
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => inputRef.current?.click()}
                >
                  <FileText className="h-4 w-4" />
                  {file ? "تغيير الملف" : "اختيار ملف"}
                </Button>
                {file && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      setResult(null);
                      setError("");
                    }}
                  >
                    إلغاء الملف
                  </Button>
                )}
              </div>
            </div>

            {busy && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                جارٍ تحليل الملف واستخراج العناصر…
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="leading-6">{error}</span>
              </div>
            )}

            {result && !busy && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-foreground">نتيجة التحليل</p>
                  <Badge variant="secondary">{result.format.toUpperCase()}</Badge>
                  {result.stats.pages && (
                    <Badge variant="outline">{result.stats.pages} صفحة</Badge>
                  )}
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                    {blockCount} عنصر
                  </Badge>
                </div>

                {result.title && (
                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    <p className="text-[11px] text-muted-foreground">العنوان المكتشف</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-foreground">
                      {result.title}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Checkbox
                        id="import-apply-title"
                        checked={applyTitle}
                        onCheckedChange={(checked) => setApplyTitle(checked === true)}
                      />
                      <Label
                        htmlFor="import-apply-title"
                        className="cursor-pointer text-[11px] text-muted-foreground"
                      >
                        {currentTitle.trim()
                          ? "استبدال عنوان المقال الحالي بهذا العنوان"
                          : "استخدام هذا العنوان للمقال"}
                      </Label>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {STAT_ROWS.filter(
                    (row) => !(row.key === "words" && !result.stats.words),
                  ).map((row) => (
                    <div
                      key={row.key}
                      className="rounded-lg border border-border/70 bg-card px-2 py-1.5 text-center"
                    >
                      <p className="text-sm font-bold text-foreground">
                        {result.stats[row.key] ?? 0}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{row.label}</p>
                    </div>
                  ))}
                </div>

                {result.warnings.length > 0 && (
                  <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-3 text-[11px] leading-5 text-amber-900">
                    <div className="mb-1 flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      ملاحظات
                    </div>
                    <ul className="space-y-1">
                      {result.warnings.map((warning) => (
                        <li key={warning} className="flex gap-1.5">
                          <span aria-hidden="true">•</span>
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
                    معاينة أول العناصر
                  </p>
                  <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border bg-card p-2">
                    {result.blocks.slice(0, 14).map((block) => (
                      <div
                        key={block.id}
                        className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-[11px] hover:bg-muted/50"
                      >
                        <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[9px]">
                          {articleBlockLabel(block)}
                        </Badge>
                        <span className="min-w-0 leading-5 text-muted-foreground">
                          {blockPreview(block)}
                        </span>
                      </div>
                    ))}
                    {blockCount > 14 && (
                      <p className="px-2 py-1 text-[10px] text-muted-foreground">
                        … و{blockCount - 14} عنصرًا آخر
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-muted/15 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-gold-strong" />
                خيارات التحويل
              </p>
              <div className="space-y-2.5">
                {OPTION_ROWS.filter(
                  (row) => row.key !== "repairArabic" || isPdf,
                ).map((row) => (
                  <div key={row.key} className="flex items-start gap-2">
                    <Checkbox
                      id={`import-option-${row.key}`}
                      checked={options[row.key]}
                      onCheckedChange={(checked) =>
                        toggleOption(row.key, checked === true)
                      }
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <Label
                        htmlFor={`import-option-${row.key}`}
                        className="cursor-pointer text-[12px] font-semibold leading-5 text-foreground"
                      >
                        {row.label}
                      </Label>
                      <p className="text-[10px] leading-4 text-muted-foreground">{row.hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/15 p-3">
              <p className="mb-2 text-xs font-bold text-foreground">طريقة الإدراج</p>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setMode("replace")}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-xl border px-2.5 py-2 text-start transition-colors",
                    mode === "replace"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <CheckCircle2
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      mode === "replace" ? "text-primary" : "text-muted-foreground/40",
                    )}
                  />
                  <span>
                    <span className="block text-[12px] font-semibold text-foreground">
                      استبدال العناصر الحالية
                    </span>
                    <span className="block text-[10px] leading-4 text-muted-foreground">
                      الأنسب عند إنشاء مقال جديد أو إعادة بناء مقال قديم.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("append")}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-xl border px-2.5 py-2 text-start transition-colors",
                    mode === "append"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <CheckCircle2
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      mode === "append" ? "text-primary" : "text-muted-foreground/40",
                    )}
                  />
                  <span>
                    <span className="block text-[12px] font-semibold text-foreground">
                      إضافة إلى نهاية العناصر
                    </span>
                    <span className="block text-[10px] leading-4 text-muted-foreground">
                      يحتفظ بما كتبته ويضيف العناصر المستوردة بعده.
                    </span>
                  </span>
                </button>
              </div>
            </div>

            <p className="text-[10px] leading-5 text-muted-foreground">
              التنسيق المدعوم داخل النص: <code>**عريض**</code> و<code>*مائل*</code>{" "}
              و<code>[رابط](https://…)</code>. تُستورد الصور كملاحظة فقط؛ ارفع صورة
              الغلاف من الحقل المخصص.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            type="button"
            className="gap-2"
            disabled={!blockCount || busy}
            onClick={handleImport}
          >
            <FileUp className="h-4 w-4" />
            {mode === "replace"
              ? `استبدال المحتوى بـ ${blockCount} عنصرًا`
              : `إضافة ${blockCount} عنصرًا`}
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ArticleImportDialog;
