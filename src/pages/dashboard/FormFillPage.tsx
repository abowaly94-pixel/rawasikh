import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowRight, ClipboardList, Star, CheckCircle2 } from "lucide-react";

interface FieldRow {
  id: string;
  label: string;
  field_type: "short_text" | "long_text" | "single_choice" | "multiple_choice" | "rating";
  options: string[];
  rating_max: number;
  is_required: boolean;
  order_index: number;
}

type AnswerValue = string | string[] | number | null;

const FormFillPage = () => {
  const { id: formId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, userRole, loading } = useAuth();
  const queryClient = useQueryClient();

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  const { data: form } = useQuery({
    queryKey: ["form_public", formId],
    queryFn: async () => {
      const { data, error } = await supabase.from("forms" as any).select("*").eq("id", formId!).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!formId,
  });

  const { data: fields = [], isLoading } = useQuery({
    queryKey: ["form_fields_public", formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_fields" as any)
        .select("*")
        .eq("form_id", formId!)
        .order("order_index");
      if (error) throw error;
      return (data as any[]) as FieldRow[];
    },
    enabled: !!formId,
  });

  // Existing response (if the user already answered) — shown read-only.
  const { data: existingResponse, isLoading: existingLoading } = useQuery({
    queryKey: ["my_form_response", formId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: response, error } = await supabase
        .from("form_responses" as any)
        .select("*")
        .eq("form_id", formId!)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!response) return null;
      const { data: answersData, error: answersError } = await supabase
        .from("form_response_answers" as any)
        .select("*")
        .eq("response_id", (response as any).id);
      if (answersError) throw answersError;
      return { response, answers: (answersData as any[]) || [] };
    },
    enabled: !!formId && !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !formId) throw new Error("missing user/form");

      const { data: response, error: responseError } = await supabase
        .from("form_responses" as any)
        .insert({ form_id: formId, user_id: user.id })
        .select()
        .single();
      if (responseError) throw responseError;

      const rows = fields.map((field) => {
        const value = answers[field.id];
        const row: Record<string, any> = { response_id: (response as any).id, field_id: field.id };
        if (field.field_type === "rating") row.answer_number = value ?? null;
        else if (field.field_type === "multiple_choice") row.answer_options = value ?? [];
        else row.answer_text = (value as string) ?? null;
        return row;
      });

      if (rows.length > 0) {
        const { error: answersError } = await supabase.from("form_response_answers" as any).insert(rows);
        if (answersError) throw answersError;
      }
    },
    onSuccess: () => {
      toast.success("تم إرسال ردك بنجاح، شكرًا لك");
      queryClient.invalidateQueries({ queryKey: ["my_form_response", formId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["my_form_responses", user?.id] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "حدث خطأ أثناء إرسال الرد");
    },
    onSettled: () => setSubmitting(false),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const field of fields) {
      if (!field.is_required) continue;
      const v = answers[field.id];
      const empty = v == null || v === "" || (Array.isArray(v) && v.length === 0);
      if (empty) {
        toast.error(`السؤال "${field.label}" إجباري`);
        return;
      }
    }
    setSubmitting(true);
    submitMutation.mutate();
  };

  const setAnswer = (fieldId: string, value: AnswerValue) => setAnswers((a) => ({ ...a, [fieldId]: value }));

  const toggleMultiOption = (fieldId: string, option: string) => {
    const current = (answers[fieldId] as string[]) || [];
    if (current.includes(option)) setAnswer(fieldId, current.filter((o) => o !== option));
    else setAnswer(fieldId, [...current, option]);
  };

  if (loading || isLoading || existingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const alreadyAnswered = !!existingResponse;

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "الطالب"}>
      <div className="space-y-6 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate("/dashboard/my-forms")}>
          <ArrowRight className="h-4 w-4" />
          العودة للنماذج
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              {form?.title}
            </CardTitle>
            {form?.description && <CardDescription>{form.description}</CardDescription>}
          </CardHeader>
          <CardContent>
            {alreadyAnswered ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-700 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  تم إرسال ردك على هذا النموذج بالفعل
                </div>
                {fields.map((field) => {
                  const answer = existingResponse!.answers.find((a: any) => a.field_id === field.id);
                  const display =
                    field.field_type === "rating"
                      ? (answer?.answer_number != null ? `${answer.answer_number} / ${field.rating_max}` : "—")
                      : field.field_type === "multiple_choice"
                      ? (answer?.answer_options || []).join("، ") || "—"
                      : answer?.answer_text || "—";
                  return (
                    <div key={field.id} className="space-y-1 pb-3 border-b last:border-0">
                      <p className="text-sm font-medium">{field.label}</p>
                      <p className="text-sm text-muted-foreground">{display}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label>
                      {field.label} {field.is_required && <span className="text-destructive">*</span>}
                    </Label>

                    {field.field_type === "short_text" && (
                      <Input
                        value={(answers[field.id] as string) || ""}
                        onChange={(e) => setAnswer(field.id, e.target.value)}
                      />
                    )}

                    {field.field_type === "long_text" && (
                      <Textarea
                        rows={4}
                        value={(answers[field.id] as string) || ""}
                        onChange={(e) => setAnswer(field.id, e.target.value)}
                      />
                    )}

                    {field.field_type === "single_choice" && (
                      <RadioGroup
                        value={(answers[field.id] as string) || ""}
                        onValueChange={(v) => setAnswer(field.id, v)}
                      >
                        {(field.options || []).map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <RadioGroupItem value={opt} id={`${field.id}-${idx}`} />
                            <Label htmlFor={`${field.id}-${idx}`} className="font-normal cursor-pointer">{opt}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {field.field_type === "multiple_choice" && (
                      <div className="space-y-2">
                        {(field.options || []).map((opt, idx) => {
                          const checked = ((answers[field.id] as string[]) || []).includes(opt);
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <Checkbox
                                id={`${field.id}-${idx}`}
                                checked={checked}
                                onCheckedChange={() => toggleMultiOption(field.id, opt)}
                              />
                              <Label htmlFor={`${field.id}-${idx}`} className="font-normal cursor-pointer">{opt}</Label>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {field.field_type === "rating" && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {Array.from({ length: field.rating_max }, (_, i) => i + 1).map((n) => (
                          <button
                            type="button"
                            key={n}
                            onClick={() => setAnswer(field.id, n)}
                            className="p-1"
                            title={String(n)}
                          >
                            {field.rating_max <= 5 ? (
                              <Star
                                className={`h-7 w-7 ${
                                  (answers[field.id] as number) >= n ? "fill-amber-500 text-amber-500" : "text-muted-foreground"
                                }`}
                              />
                            ) : (
                              <span
                                className={`h-9 w-9 flex items-center justify-center rounded-full border text-sm ${
                                  answers[field.id] === n ? "bg-primary text-primary-foreground border-primary" : "border-border"
                                }`}
                              >
                                {n}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">هذا النموذج ليس به أسئلة بعد.</p>
                ) : (
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? "جاري الإرسال..." : "إرسال الرد"}
                  </Button>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default FormFillPage;
