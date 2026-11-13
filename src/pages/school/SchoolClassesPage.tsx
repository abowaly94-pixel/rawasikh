import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SchoolLayout from "@/components/layout/SchoolLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Class {
  id: string;
  name: string;
  description: string | null;
  grade_level: string | null;
}

const SchoolClassesPage = () => {
  const { user, userRole, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  
  const [className, setClassName] = useState("");
  const [classDescription, setClassDescription] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (!loading && userRole !== "school") {
      navigate("/dashboard");
    }
  }, [user, loading, userRole, navigate]);

  useEffect(() => {
    if (user && userRole === "school") {
      fetchData();
    }
  }, [user, userRole]);

  const fetchData = async () => {
    try {
      const { data: school } = await supabase
        .from("schools")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (school) {
        setSchoolId(school.id);
        
        const { data: classesData } = await supabase
          .from("classes")
          .select("id, name, description, grade_level")
          .eq("school_id", school.id)
          .order("name");

        setClasses(classesData || []);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!className.trim() || !schoolId) return;

    try {
      if (editingClass) {
        const { error } = await supabase
          .from("classes")
          .update({
            name: className,
            description: classDescription,
            grade_level: gradeLevel,
          })
          .eq("id", editingClass.id);

        if (error) throw error;
        toast({ title: "تم تحديث الفصل بنجاح" });
      } else {
        const { error } = await supabase
          .from("classes")
          .insert({
            school_id: schoolId,
            name: className,
            description: classDescription,
            grade_level: gradeLevel,
          });

        if (error) throw error;
        toast({ title: "تم إضافة الفصل بنجاح" });
      }

      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الفصل؟")) return;

    try {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "تم حذف الفصل بنجاح" });
      fetchData();
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const openEditDialog = (classItem: Class) => {
    setEditingClass(classItem);
    setClassName(classItem.name);
    setClassDescription(classItem.description || "");
    setGradeLevel(classItem.grade_level || "");
    setDialogOpen(true);
  };

  const resetForm = () => {
    setDialogOpen(false);
    setEditingClass(null);
    setClassName("");
    setClassDescription("");
    setGradeLevel("");
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
          <h1 className="text-2xl font-bold">الفصول</h1>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            else setDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                إضافة فصل
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingClass ? "تعديل الفصل" : "إضافة فصل جديد"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم الفصل</Label>
                  <Input
                    placeholder="مثال: الصف الأول أ"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>المرحلة</Label>
                  <Input
                    placeholder="مثال: المرحلة الابتدائية"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Textarea
                    placeholder="وصف الفصل..."
                    value={classDescription}
                    onChange={(e) => setClassDescription(e.target.value)}
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingClass ? "تحديث" : "إضافة"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>قائمة الفصول</CardTitle>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد فصول. قم بإضافة فصل جديد.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم الفصل</TableHead>
                    <TableHead>المرحلة</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead className="w-[100px]">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((classItem) => (
                    <TableRow key={classItem.id}>
                      <TableCell className="font-medium">{classItem.name}</TableCell>
                      <TableCell>{classItem.grade_level || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {classItem.description || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(classItem)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(classItem.id)}
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

export default SchoolClassesPage;
