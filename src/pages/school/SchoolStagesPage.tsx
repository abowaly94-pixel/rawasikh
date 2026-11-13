import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SchoolLayout from "@/components/layout/SchoolLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Stage {
  id: string;
  name: string;
  order_index: number;
  created_at: string;
}

const SchoolStagesPage = () => {
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stages, setStages] = useState<Stage[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [stageName, setStageName] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "school") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "school") {
      fetchSchoolAndStages();
    }
  }, [user, userRole]);

  const fetchSchoolAndStages = async () => {
    try {
      const { data: school } = await supabase
        .from("schools")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (school) {
        setSchoolId(school.id);
        const { data: stagesData } = await supabase
          .from("educational_stages")
          .select("*")
          .eq("school_id", school.id)
          .order("order_index");

        setStages(stagesData || []);
      }
    } catch (error) {
      console.error("Error fetching stages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!stageName.trim() || !schoolId) return;

    try {
      if (editingStage) {
        const { error } = await supabase
          .from("educational_stages")
          .update({ name: stageName })
          .eq("id", editingStage.id);

        if (error) throw error;
        toast({ title: "تم تحديث المرحلة بنجاح" });
      } else {
        const { error } = await supabase
          .from("educational_stages")
          .insert({
            school_id: schoolId,
            name: stageName,
            order_index: stages.length,
          });

        if (error) throw error;
        toast({ title: "تم إضافة المرحلة بنجاح" });
      }

      setDialogOpen(false);
      setStageName("");
      setEditingStage(null);
      fetchSchoolAndStages();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المرحلة؟")) return;

    try {
      const { error } = await supabase
        .from("educational_stages")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "تم حذف المرحلة بنجاح" });
      fetchSchoolAndStages();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const openEditDialog = (stage: Stage) => {
    setEditingStage(stage);
    setStageName(stage.name);
    setDialogOpen(true);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SchoolLayout schoolName={profile?.full_name || "مدرسة"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">المراحل الدراسية</h1>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingStage(null);
              setStageName("");
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                إضافة مرحلة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingStage ? "تعديل المرحلة" : "إضافة مرحلة جديدة"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم المرحلة</Label>
                  <Input
                    placeholder="مثال: المرحلة الابتدائية"
                    value={stageName}
                    onChange={(e) => setStageName(e.target.value)}
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingStage ? "تحديث" : "إضافة"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>قائمة المراحل</CardTitle>
          </CardHeader>
          <CardContent>
            {stages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد مراحل دراسية. قم بإضافة مرحلة جديدة.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم المرحلة</TableHead>
                    <TableHead>الترتيب</TableHead>
                    <TableHead className="w-[100px]">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stages.map((stage) => (
                    <TableRow key={stage.id}>
                      <TableCell className="font-medium">{stage.name}</TableCell>
                      <TableCell>{stage.order_index + 1}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(stage)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(stage.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SchoolLayout>
  );
};

export default SchoolStagesPage;
