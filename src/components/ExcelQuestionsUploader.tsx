import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileSpreadsheet, Download, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type TableConfig = {
  questionsTable: "quiz_questions" | "exam_questions" | "school_assessment_questions";
  optionsTable: "question_options" | "exam_question_options" | "school_assessment_options";
  parentField: "quiz_id" | "exam_id" | "assessment_id";
  parentId: string;
};

interface Props {
  config: TableConfig;
  onSuccess?: () => void;
  startOrderIndex?: number;
}

const TEMPLATE_HEADERS = [
  "question_text",
  "question_type",
  "points",
  "option_1",
  "option_2",
  "option_3",
  "option_4",
  "correct_option",
  "correct_answer",
];

const TEMPLATE_SAMPLE = [
  {
    question_text: "ما هي عاصمة مصر؟",
    question_type: "multiple_choice",
    points: 1,
    option_1: "القاهرة",
    option_2: "الإسكندرية",
    option_3: "الجيزة",
    option_4: "أسوان",
    correct_option: 1,
    correct_answer: "",
  },
  {
    question_text: "الشمس تشرق من الشرق",
    question_type: "true_false",
    points: 1,
    option_1: "",
    option_2: "",
    option_3: "",
    option_4: "",
    correct_option: "",
    correct_answer: "true",
  },
  {
    question_text: "أكمل: 2 + 2 = ____",
    question_type: "fill_blank",
    points: 1,
    option_1: "",
    option_2: "",
    option_3: "",
    option_4: "",
    correct_option: "",
    correct_answer: "4",
  },
  {
    question_text: "اشرح أهمية القراءة",
    question_type: "short_answer",
    points: 5,
    option_1: "",
    option_2: "",
    option_3: "",
    option_4: "",
    correct_option: "",
    correct_answer: "",
  },
];

const VALID_TYPES = ["multiple_choice", "true_false", "fill_blank", "short_answer"];

const downloadTemplate = () => {
  const ws = XLSX.utils.json_to_sheet(TEMPLATE_SAMPLE, { header: TEMPLATE_HEADERS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Questions");
  // Instructions sheet
  const instructions = [
    ["تعليمات تعبئة الأسئلة"],
    [""],
    ["question_text", "نص السؤال (مطلوب)"],
    ["question_type", "النوع: multiple_choice | true_false | fill_blank | short_answer"],
    ["points", "الدرجة (رقم، الافتراضي 1)"],
    ["option_1..4", "الاختيارات (لـ multiple_choice فقط)"],
    ["correct_option", "رقم الإجابة الصحيحة 1-4 (لـ multiple_choice)"],
    ["correct_answer", "للـ true_false: true أو false | للباقي: نص الإجابة"],
    [""],
    ["ملاحظة", "الأسئلة المقالية (short_answer) تحتاج تصحيح يدوي"],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, wsInfo, "تعليمات");
  XLSX.writeFile(wb, "questions_template.xlsx");
};

const ExcelQuestionsUploader = ({ config, onSuccess, startOrderIndex = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; errors: string[] } | null>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    setUploading(false);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("اختر ملف Excel أولاً");
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const errors: string[] = [];
      let inserted = 0;
      let order = startOrderIndex;

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const lineNo = i + 2;
        const qText = String(r.question_text ?? "").trim();
        const qType = String(r.question_type ?? "").trim();
        if (!qText) {
          errors.push(`السطر ${lineNo}: نص السؤال فارغ`);
          continue;
        }
        if (!VALID_TYPES.includes(qType)) {
          errors.push(`السطر ${lineNo}: نوع غير صالح "${qType}"`);
          continue;
        }
        const points = Number(r.points) > 0 ? Number(r.points) : 1;

        let correctAnswer: string | null = null;
        if (qType === "fill_blank" || qType === "short_answer") {
          correctAnswer = String(r.correct_answer ?? "").trim() || null;
        } else if (qType === "true_false") {
          const v = String(r.correct_answer ?? "").trim().toLowerCase();
          if (["true", "صح", "1", "نعم"].includes(v)) correctAnswer = "true";
          else if (["false", "خطأ", "خطا", "0", "لا"].includes(v)) correctAnswer = "false";
          else {
            errors.push(`السطر ${lineNo}: correct_answer للسؤال true_false يجب أن يكون true أو false`);
            continue;
          }
        }

        // Insert question
        const baseInsert: any = {
          [config.parentField]: config.parentId,
          question_text: qText,
          question_type: qType,
          points,
          order_index: order++,
          correct_answer: correctAnswer,
        };

        const { data: inserted_q, error: qErr } = await (supabase as any)
          .from(config.questionsTable)
          .insert(baseInsert)
          .select()
          .single();

        if (qErr) {
          errors.push(`السطر ${lineNo}: ${qErr.message}`);
          continue;
        }

        // Insert options
        let opts: { option_text: string; is_correct: boolean; order_index: number }[] = [];
        if (qType === "multiple_choice") {
          const correctIdx = Number(r.correct_option);
          if (!correctIdx || correctIdx < 1 || correctIdx > 4) {
            errors.push(`السطر ${lineNo}: correct_option يجب أن يكون 1-4`);
          }
          for (let k = 1; k <= 4; k++) {
            const txt = String(r[`option_${k}`] ?? "").trim();
            if (txt) opts.push({ option_text: txt, is_correct: k === correctIdx, order_index: k - 1 });
          }
          if (opts.length < 2) {
            errors.push(`السطر ${lineNo}: يجب اختيارين على الأقل`);
          }
        } else if (qType === "true_false") {
          opts = [
            { option_text: "صح", is_correct: correctAnswer === "true", order_index: 0 },
            { option_text: "خطأ", is_correct: correctAnswer === "false", order_index: 1 },
          ];
        }

        if (opts.length > 0) {
          const optsRows = opts.map((o) => ({ ...o, question_id: inserted_q.id }));
          const { error: oErr } = await (supabase as any).from(config.optionsTable).insert(optsRows);
          if (oErr) errors.push(`السطر ${lineNo} (اختيارات): ${oErr.message}`);
        }
        inserted++;
      }

      setResult({ inserted, errors });
      if (inserted > 0) {
        toast.success(`تم رفع ${inserted} سؤال`);
        onSuccess?.();
      }
    } catch (e: any) {
      toast.error("فشل قراءة الملف: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="ml-2 h-4 w-4" />
        رفع من Excel
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>رفع أسئلة من ملف Excel</DialogTitle>
            <DialogDescription>
              قم بتنزيل القالب، عبئ الأسئلة، ثم ارفع الملف.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button variant="secondary" onClick={downloadTemplate} className="w-full">
              <Download className="ml-2 h-4 w-4" />
              تنزيل قالب Excel
            </Button>
            <div>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }}
              />
            </div>
            {result && (
              <Alert variant={result.errors.length > 0 ? "destructive" : "default"}>
                {result.errors.length === 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>
                  <div>تم إدراج {result.inserted} سؤال.</div>
                  {result.errors.length > 0 && (
                    <ul className="mt-2 list-disc pr-4 text-sm max-h-40 overflow-auto">
                      {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>إغلاق</Button>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              <Upload className="ml-2 h-4 w-4" />
              {uploading ? "جاري الرفع..." : "رفع الأسئلة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExcelQuestionsUploader;
