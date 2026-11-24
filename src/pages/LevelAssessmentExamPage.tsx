import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, CheckCircle, XCircle, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { publicBanks, type PublicQuestion } from "@/lib/level-assessment/banks";
import { selectForm } from "@/lib/level-assessment/scoring";

type Competency = {
  sub_code: string;
  name: string;
  score_pct: number;
  recommendation?: string;
};

type Report = {
  skill: string;
  score: number;
  level: string;
  level_description: string;
  completion_flag: string;
  competencies: Competency[];
  strengths: string[];
  development_areas: string[];
  skills_needing_training: string[];
  training_recommendations: string[];
};

const LevelAssessmentExamPage = () => {
  const { skillCode } = useParams<{ skillCode: string }>();
  const bank = publicBanks.find((b) => b.skill_code === skillCode);
  const [form, setForm] = useState<string[]>([]);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    if (!bank) return;
    const attemptId = crypto.randomUUID();
    const formIds = selectForm(bank.questions, attemptId);
    setForm(formIds);
    const qMap = new Map(bank.questions.map((q) => [q.question_id, q]));
    setQuestions(formIds.map((id) => qMap.get(id)).filter(Boolean) as PublicQuestion[]);
  }, [bank, bank?.skill_code]);

  const handleAnswer = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const submit = async () => {
    if (!bank || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("level-assessment-grade", {
        body: { skill_code: bank.skill_code, form, answers },
      });
      if (error) throw new Error(error.message);
      setReport(data as Report);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const current: PublicQuestion | undefined = questions[currentIndex];

  if (report) {
    const strengths = report.strengths.map((s) => ({ title: s, color: "bg-green-100" }));
    const development = report.development_areas.map((s) => ({ title: s, color: "bg-red-100" }));
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Header />
        <main className="shell py-10 lg:py-12">
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardHeader className="text-center">
                <div
                  className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${report.score >= 70 ? "bg-green-100" : report.score >= 55 ? "bg-amber-100" : "bg-red-100"}`}
                >
                  {report.score >= 70 ? <Trophy className="h-10 w-10 text-green-600" /> : report.score >= 55 ? <CheckCircle className="h-10 w-10 text-amber-600" /> : <XCircle className="h-10 w-10 text-red-600" />}
                </div>
                <CardTitle className="text-2xl">نتيجتك: {report.level}</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">{report.skill}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-5xl font-bold">{report.score} / 100</p>
                  <p className="text-xl text-muted-foreground">{report.level_description}</p>
                  {report.completion_flag && (
                    <p className="text-sm text-muted-foreground mt-2">{report.completion_flag}</p>
                  )}
                </div>
                {strengths.length > 0 && (
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-bold mb-2">نقاط القوة</p>
                    <ul className="list-disc pr-6 space-y-1 text-sm">
                      {strengths.map((s, i) => <li key={i}>{s.title}</li>)}
                    </ul>
                  </div>
                )}
                {development.length > 0 && (
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-bold mb-2">مجالات التطوير</p>
                    <ul className="list-disc pr-6 space-y-1 text-sm">
                      {development.map((s, i) => <li key={i}>{s.title}</li>)}
                    </ul>
                  </div>
                )}
                {report.competencies.length > 0 && (
                  <div>
                    <p className="font-bold mb-3">ملخص الكفاءات</p>
                    <div className="space-y-3">
                      {report.competencies.map((c, i) => (
                        <div key={i} className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{c.name}</p>
                            {c.recommendation && (
                              <p className="text-xs text-muted-foreground mt-1">{c.recommendation}</p>
                            )}
                          </div>
                          <span className="text-sm font-bold text-primary">{c.score_pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {report.training_recommendations && report.training_recommendations.length > 0 && (
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-bold mb-2">اقتراحات التدريب</p>
                    <ul className="list-disc pr-6 space-y-1 text-sm">
                      {report.training_recommendations.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!bank) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Header />
        <main className="shell py-10">
          <p>الاختبار غير موجود</p>
        </main>
        <Footer />
      </div>
    );
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      <main className="shell py-8 lg:py-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">{bank.skill_name}</h1>
            <p className="text-muted-foreground">شكل الاختبار: 25 سؤال</p>
          </div>
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>السؤال {currentIndex + 1} من {questions.length}</span>
              <span>تم الإجابة على {answeredCount} من {questions.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          {current && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg leading-relaxed">{current.stem}</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={answers[current.question_id] || ""}
                  onValueChange={(value) => handleAnswer(current.question_id, value)}
                  className="space-y-3"
                >
                  {[
                    { key: "option_a" as const, label: "أ", value: "A" },
                    { key: "option_b" as const, label: "ب", value: "B" },
                    { key: "option_c" as const, label: "ج", value: "C" },
                    { key: "option_d" as const, label: "د", value: "D" },
                  ].map((opt) => (
                    <div key={opt.value} className="flex items-start gap-3">
                      <RadioGroupItem value={opt.value} id={`${current.question_id}-${opt.value}`} className="mt-1" />
                      <Label htmlFor={`${current.question_id}-${opt.value}`} className="cursor-pointer text-sm leading-relaxed">
                        {current[opt.key]}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          )}
          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}>
              <ArrowRight className="h-4 w-4 ml-2" /> السابق
            </Button>
            {currentIndex < questions.length - 1 ? (
              <Button onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}>
                التالي <ArrowLeft className="h-4 w-4 mr-2" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={isSubmitting}>
                {isSubmitting ? "جاري التصحيح..." : "تأكيد الإجابات"}
              </Button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LevelAssessmentExamPage;
