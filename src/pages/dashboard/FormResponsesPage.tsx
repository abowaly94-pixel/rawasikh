import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowRight, BarChart3, Download, Star } from "lucide-react";

interface FieldRow {
  id: string;
  label: string;
  field_type: "short_text" | "long_text" | "single_choice" | "multiple_choice" | "rating";
  options: string[];
  rating_max: number;
  order_index: number;
}

interface AnswerRow {
  id: string;
  response_id: string;
  field_id: string;
  answer_text: string | null;
  answer_number: number | null;
  answer_options: string[] | null;
}

interface ResponseRow {
  id: string;
  user_id: string;
  created_at: string;
  respondent_name?: string;
}

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

const FormResponsesPage = () => {
  const { id: formId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, userRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && userRole !== "admin") {
      navigate("/dashboard");
      toast.error("غير مصرح لك بالوصول لهذه الصفحة");
    }
  }, [loading, userRole, navigate]);

  const { data: form } = useQuery({
    queryKey: ["admin_form", formId],
    queryFn: async () => {
      const { data, error } = await supabase.from("forms" as any).select("*").eq("id", formId!).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!formId && userRole === "admin",
  });

  const { data: fields = [] } = useQuery({
    queryKey: ["admin_form_fields", formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_fields" as any)
        .select("*")
        .eq("form_id", formId!)
        .order("order_index");
      if (error) throw error;
      return (data as any[]) as FieldRow[];
    },
    enabled: !!formId && userRole === "admin",
  });

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ["admin_form_responses", formId],
    queryFn: async () => {
      const { data: responsesData, error } = await supabase
        .from("form_responses" as any)
        .select("*")
        .eq("form_id", formId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((responsesData as any[]).map((r) => r.user_id))];
      const { data: profilesData } = userIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] };

      return (responsesData as any[]).map((r) => ({
        ...r,
        respondent_name: profilesData?.find((p: any) => p.id === r.user_id)?.full_name || "مستخدم",
      })) as ResponseRow[];
    },
    enabled: !!formId && userRole === "admin",
  });

  const { data: answers = [] } = useQuery({
    queryKey: ["admin_form_answers", formId],
    queryFn: async () => {
      const responseIds = responses.map((r) => r.id);
      if (responseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("form_response_answers" as any)
        .select("*")
        .in("response_id", responseIds);
      if (error) throw error;
      return (data as any[]) as AnswerRow[];
    },
    enabled: responses.length > 0,
  });

  const answersByResponse = new Map<string, AnswerRow[]>();
  answers.forEach((a) => {
    if (!answersByResponse.has(a.response_id)) answersByResponse.set(a.response_id, []);
    answersByResponse.get(a.response_id)!.push(a);
  });

  const formatAnswer = (field: FieldRow, answer?: AnswerRow) => {
    if (!answer) return "—";
    if (field.field_type === "rating") return answer.answer_number != null ? `${answer.answer_number}/${field.rating_max}` : "—";
    if (field.field_type === "multiple_choice") return (answer.answer_options || []).join("، ") || "—";
    if (field.field_type === "single_choice") return answer.answer_text || "—";
    return answer.answer_text || "—";
  };

  // Per-field aggregate stats
  const fieldStats = fields.map((field) => {
    const fieldAnswers = answers.filter((a) => a.field_id === field.id);
    if (field.field_type === "rating") {
      const nums = fieldAnswers.map((a) => a.answer_number).filter((n): n is number => n != null);
      const avg = nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : null;
      return { field, kind: "rating" as const, avg, count: nums.length };
    }
    if (field.field_type === "single_choice" || field.field_type === "multiple_choice") {
      const counts: Record<string, number> = {};
      (field.options || []).forEach((opt) => (counts[opt] = 0));
      fieldAnswers.forEach((a) => {
        const opts = field.field_type === "multiple_choice" ? a.answer_options || [] : a.answer_text ? [a.answer_text] : [];
        opts.forEach((o) => { counts[o] = (counts[o] || 0) + 1; });
      });
      return { field, kind: "choice" as const, counts, count: fieldAnswers.length };
    }
    return { field, kind: "text" as const, count: fieldAnswers.length };
  });

  const exportCsv = () => {
    const headers = ["الطالب", "تاريخ الرد", ...fields.map((f) => f.label)];
    const rows = responses.map((r) => {
      const rAnswers = answersByResponse.get(r.id) || [];
      const cells = [
        r.respondent_name || "",
        new Date(r.created_at).toLocaleString("ar-EG"),
        ...fields.map((f) => formatAnswer(f, rAnswers.find((a) => a.field_id === f.id))),
      ];
      return cells.map((c) => csvEscape(String(c))).join(",");
    });
    const csv = "﻿" + [headers.map((h) => csvEscape(h)).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form?.title || "نموذج"}-الردود.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "المدير"}>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate("/dashboard/forms")}>
          <ArrowRight className="h-4 w-4" />
          العودة للنماذج
        </Button>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              ردود نموذج: {form?.title}
            </h1>
            <p className="text-muted-foreground mt-1">{responses.length} رد إجمالاً</p>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={responses.length === 0} className="gap-1.5">
            <Download className="h-4 w-4" />
            تصدير Excel/CSV
          </Button>
        </div>

        {/* Aggregate stats */}
        {fieldStats.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fieldStats.map((stat) => (
              <Card key={stat.field.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{stat.field.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  {stat.kind === "rating" ? (
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                      <span className="text-2xl font-bold">{stat.avg != null ? stat.avg.toFixed(1) : "—"}</span>
                      <span className="text-sm text-muted-foreground">/ {stat.field.rating_max} ({stat.count} رد)</span>
                    </div>
                  ) : stat.kind === "choice" ? (
                    <div className="space-y-1.5">
                      {Object.entries(stat.counts).map(([opt, count]) => (
                        <div key={opt} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground truncate">{opt}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{stat.count} رد نصي — شوف التفاصيل بالجدول تحت</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">الردود التفصيلية</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
            ) : responses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد ردود بعد.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الطالب</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      {fields.map((f) => (
                        <TableHead key={f.id} className="text-right">{f.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((r) => {
                      const rAnswers = answersByResponse.get(r.id) || [];
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.respondent_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground" dir="ltr">
                            {new Date(r.created_at).toLocaleString("en-GB")}
                          </TableCell>
                          {fields.map((f) => (
                            <TableCell key={f.id} className="text-sm max-w-[220px] truncate">
                              {formatAnswer(f, rAnswers.find((a) => a.field_id === f.id))}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default FormResponsesPage;
