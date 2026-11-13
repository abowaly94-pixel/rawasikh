import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, BookOpen, Users, UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

interface ClassItem {
  id: string;
  name: string;
  description: string | null;
  grade_level: string | null;
  teacher_id: string | null;
  created_at: string;
  teacher_name?: string;
  student_count?: number;
}

interface Teacher {
  id: string;
  full_name: string;
}

interface Student {
  id: string;
  user_id: string | null;
  student_number: string | null;
  class_id: string | null;
  profile?: {
    full_name: string;
  };
}

const classSchema = z.object({
  name: z.string().trim().min(1, "اسم الفصل مطلوب").max(100),
  description: z.string().max(500).optional(),
  grade_level: z.string().max(50).optional(),
  teacher_id: z.string().uuid().optional().nullable().or(z.literal("")),
});

const ClassesPage = () => {
  const { userRole, profile, user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    grade_level: "",
    teacher_id: "",
  });

  // Student assignment state
  const [studentsDialogOpen, setStudentsDialogOpen] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<ClassItem | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch teacher names and student counts
      const teacherIds = [...new Set((data || []).filter(c => c.teacher_id).map(c => c.teacher_id))];
      const classIds = (data || []).map(c => c.id);
      
      // Fetch student counts per class
      const { data: studentCounts } = await supabase
        .from("students")
        .select("class_id")
        .in("class_id", classIds);

      const countMap: Record<string, number> = {};
      (studentCounts || []).forEach(s => {
        if (s.class_id) {
          countMap[s.class_id] = (countMap[s.class_id] || 0) + 1;
        }
      });

      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", teacherIds);

        const classesWithData = (data || []).map(cls => ({
          ...cls,
          teacher_name: profiles?.find(p => p.id === cls.teacher_id)?.full_name || "-",
          student_count: countMap[cls.id] || 0
        }));

        setClasses(classesWithData);
      } else {
        setClasses((data || []).map(cls => ({
          ...cls,
          student_count: countMap[cls.id] || 0
        })));
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الفصول",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");

      if (roles && roles.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", roles.map(r => r.user_id));

        setTeachers(profiles || []);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };

  const fetchClassStudents = async (classId: string) => {
    setLoadingStudents(true);
    try {
      // Fetch students assigned to this class
      const { data: assigned, error: assignedError } = await supabase
        .from("students")
        .select("id, user_id, student_number, class_id")
        .eq("class_id", classId);

      if (assignedError) throw assignedError;

      // Fetch available students (not assigned to any class)
      const { data: available, error: availableError } = await supabase
        .from("students")
        .select("id, user_id, student_number, class_id")
        .is("class_id", null);

      if (availableError) throw availableError;

      // Fetch profiles for all students
      const allStudentUserIds = [...(assigned || []), ...(available || [])]
        .filter(s => s.user_id)
        .map(s => s.user_id as string);

      let profilesMap: Record<string, { full_name: string }> = {};
      if (allStudentUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", allStudentUserIds);

        (profiles || []).forEach(p => {
          profilesMap[p.id] = { full_name: p.full_name };
        });
      }

      setClassStudents((assigned || []).map(s => ({
        ...s,
        profile: s.user_id ? profilesMap[s.user_id] : undefined
      })));

      setAvailableStudents((available || []).map(s => ({
        ...s,
        profile: s.user_id ? profilesMap[s.user_id] : undefined
      })));
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل الطلاب",
        variant: "destructive",
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleAssignStudent = async () => {
    if (!selectedStudentId || !selectedClassForStudents) return;

    try {
      const { error } = await supabase
        .from("students")
        .update({ class_id: selectedClassForStudents.id })
        .eq("id", selectedStudentId);

      if (error) throw error;

      toast({ title: "تم", description: "تم إسناد الطالب للفصل" });
      setSelectedStudentId("");
      fetchClassStudents(selectedClassForStudents.id);
      fetchClasses(); // Refresh counts
    } catch (error) {
      console.error("Error assigning student:", error);
      toast({
        title: "خطأ",
        description: "فشل في إسناد الطالب",
        variant: "destructive",
      });
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedClassForStudents) return;

    try {
      const { error } = await supabase
        .from("students")
        .update({ class_id: null })
        .eq("id", studentId);

      if (error) throw error;

      toast({ title: "تم", description: "تم إزالة الطالب من الفصل" });
      fetchClassStudents(selectedClassForStudents.id);
      fetchClasses(); // Refresh counts
    } catch (error) {
      console.error("Error removing student:", error);
      toast({
        title: "خطأ",
        description: "فشل في إزالة الطالب",
        variant: "destructive",
      });
    }
  };

  const openStudentsDialog = (classItem: ClassItem) => {
    setSelectedClassForStudents(classItem);
    setStudentsDialogOpen(true);
    fetchClassStudents(classItem.id);
  };

  const handleSubmit = async () => {
    try {
      const validated = classSchema.parse(formData);

      // For teachers, automatically assign themselves as the teacher
      const teacherId = userRole === "teacher" ? user?.id : (validated.teacher_id || null);

      if (editingClass) {
        const { error } = await supabase
          .from("classes")
          .update({
            name: validated.name,
            description: validated.description || null,
            grade_level: validated.grade_level || null,
            teacher_id: teacherId,
          })
          .eq("id", editingClass.id);

        if (error) throw error;
        toast({ title: "تم التحديث", description: "تم تحديث الفصل بنجاح" });
      } else {
        const { error } = await supabase
          .from("classes")
          .insert({
            name: validated.name,
            description: validated.description || null,
            grade_level: validated.grade_level || null,
            teacher_id: teacherId,
          });

        if (error) throw error;
        toast({ title: "تم الإضافة", description: "تم إضافة الفصل بنجاح" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchClasses();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "خطأ في البيانات",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error saving class:", error);
        toast({
          title: "خطأ",
          description: "فشل في حفظ الفصل",
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الفصل؟")) return;

    try {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;

      setClasses((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "تم الحذف", description: "تم حذف الفصل بنجاح" });
    } catch (error) {
      console.error("Error deleting class:", error);
      toast({
        title: "خطأ",
        description: "فشل في حذف الفصل",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (classItem: ClassItem) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      description: classItem.description || "",
      grade_level: classItem.grade_level || "",
      teacher_id: classItem.teacher_id || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingClass(null);
    setFormData({ name: "", description: "", grade_level: "", teacher_id: "" });
  };

  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">إدارة الفصول</h1>
            <p className="text-muted-foreground">إضافة وإدارة الفصول الدراسية</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة فصل
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingClass ? "تعديل الفصل" : "إضافة فصل جديد"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم الفصل *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: الصف الأول أ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade_level">المرحلة الدراسية</Label>
                  <Input
                    id="grade_level"
                    value={formData.grade_level}
                    onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                    placeholder="مثال: الابتدائية"
                  />
                </div>
                {/* Only show teacher selection for admins */}
                {userRole === "admin" && (
                  <div className="space-y-2">
                    <Label htmlFor="teacher">المدرس</Label>
                    <Select
                      value={formData.teacher_id || "none"}
                      onValueChange={(value) => setFormData({ ...formData, teacher_id: value === "none" ? "" : value })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="اختر المدرس" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="none">بدون مدرس</SelectItem>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف الفصل..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleSubmit}>
                  {editingClass ? "تحديث" : "إضافة"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                الفصول ({filteredClasses.length})
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
            ) : filteredClasses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">لا توجد فصول</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم الفصل</TableHead>
                      <TableHead>المرحلة</TableHead>
                      <TableHead>المدرس</TableHead>
                      <TableHead>عدد الطلاب</TableHead>
                      <TableHead>تاريخ الإنشاء</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClasses.map((classItem) => (
                      <TableRow key={classItem.id}>
                        <TableCell className="font-medium">{classItem.name}</TableCell>
                        <TableCell>{classItem.grade_level || "-"}</TableCell>
                        <TableCell>{classItem.teacher_name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
                            <Users className="h-3 w-3" />
                            {classItem.student_count || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(classItem.created_at).toLocaleDateString("ar-SA")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openStudentsDialog(classItem)}
                              title="إدارة الطلاب"
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Students Assignment Dialog */}
        <Dialog open={studentsDialogOpen} onOpenChange={setStudentsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إدارة طلاب الفصل: {selectedClassForStudents?.name}</DialogTitle>
            </DialogHeader>
            
            {/* Add Student Section */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label>إضافة طالب</Label>
                <SearchableSelect
                  value={selectedStudentId}
                  onValueChange={setSelectedStudentId}
                  options={availableStudents.map((student) => ({
                    value: student.id,
                    label: student.profile?.full_name || student.student_number || "طالب",
                  }))}
                  placeholder="اختر طالب"
                  searchPlaceholder="ابحث بالاسم..."
                  emptyText="لا يوجد طلاب متاحين"
                />
              </div>
              <Button onClick={handleAssignStudent} disabled={!selectedStudentId || selectedStudentId === "none"}>
                <UserPlus className="h-4 w-4 ml-2" />
                إضافة
              </Button>
            </div>

            {/* Current Students List */}
            <div className="space-y-2">
              <Label>الطلاب الحاليين ({classStudents.length})</Label>
              {loadingStudents ? (
                <div className="text-center py-4 text-muted-foreground">جاري التحميل...</div>
              ) : classStudents.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground border rounded-md">
                  لا يوجد طلاب في هذا الفصل
                </div>
              ) : (
                <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                  {classStudents.map((student) => (
                    <div key={student.id} className="flex justify-between items-center p-3">
                      <div>
                        <p className="font-medium">{student.profile?.full_name || "طالب"}</p>
                        <p className="text-sm text-muted-foreground">{student.student_number}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveStudent(student.id)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStudentsDialogOpen(false)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ClassesPage;
