import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activityLogger";
import { CalendarIcon, Check, X, Clock, AlertCircle, Users, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface Student {
  id: string;
  student_number: string | null;
  user_id: string | null;
  student_name: string;
}

interface AttendanceRecord {
  id?: string;
  student_id: string;
  status: AttendanceStatus;
  notes?: string;
}

interface ClassOption {
  id: string;
  name: string;
}

const statusConfig: Record<AttendanceStatus, { label: string; icon: React.ReactNode; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  present: { label: "حاضر", icon: <Check className="h-4 w-4" />, variant: "default" },
  absent: { label: "غائب", icon: <X className="h-4 w-4" />, variant: "destructive" },
  late: { label: "متأخر", icon: <Clock className="h-4 w-4" />, variant: "secondary" },
  excused: { label: "معذور", icon: <AlertCircle className="h-4 w-4" />, variant: "outline" },
};

const AttendancePage = () => {
  const { userRole, profile, user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [existingRecords, setExistingRecords] = useState<Record<string, string>>({});
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
      fetchAttendance();
    }
  }, [selectedClass, selectedDate]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase.from("classes").select("id, name");
      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("students")
        .select("id, student_number, user_id")
        .eq("class_id", selectedClass)
        .eq("status", "active");

      if (error) throw error;

      // Fetch student names
      const userIds = (data || []).filter(s => s.user_id).map(s => s.user_id);
      
      let profiles: { id: string; full_name: string }[] = [];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        profiles = profileData || [];
      }

      const studentsWithNames = (data || []).map(student => ({
        ...student,
        student_name: profiles.find(p => p.id === student.user_id)?.full_name || `طالب ${student.student_number || student.id.slice(0, 8)}`,
      }));

      setStudents(studentsWithNames);
      
      // Initialize attendance with present status
      const initialAttendance: Record<string, AttendanceStatus> = {};
      studentsWithNames.forEach(s => {
        initialAttendance[s.id] = "present";
      });
      setAttendance(prev => ({ ...initialAttendance, ...prev }));
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل قائمة الطلاب",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!selectedClass) return;

    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("attendance")
        .select("id, student_id, status")
        .eq("class_id", selectedClass)
        .eq("date", dateStr);

      if (error) throw error;

      const attendanceMap: Record<string, AttendanceStatus> = {};
      const recordsMap: Record<string, string> = {};
      
      (data || []).forEach(record => {
        attendanceMap[record.student_id] = record.status as AttendanceStatus;
        recordsMap[record.student_id] = record.id;
      });

      setAttendance(prev => ({ ...prev, ...attendanceMap }));
      setExistingRecords(recordsMap);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedClass || !user) return;

    setSaving(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      const updates: { student_id: string; class_id: string; date: string; status: AttendanceStatus; recorded_by: string }[] = [];
      const inserts: { student_id: string; class_id: string; date: string; status: AttendanceStatus; recorded_by: string }[] = [];

      students.forEach(student => {
        const record = {
          student_id: student.id,
          class_id: selectedClass,
          date: dateStr,
          status: attendance[student.id] || "present",
          recorded_by: user.id,
        };

        if (existingRecords[student.id]) {
          updates.push(record);
        } else {
          inserts.push(record);
        }
      });

      // Insert new records
      if (inserts.length > 0) {
        const { error } = await supabase.from("attendance").insert(inserts);
        if (error) throw error;
      }

      // Update existing records
      for (const update of updates) {
        const { error } = await supabase
          .from("attendance")
          .update({ status: update.status, recorded_by: update.recorded_by })
          .eq("id", existingRecords[update.student_id]);
        if (error) throw error;
      }

      toast({
        title: "تم الحفظ",
        description: "تم حفظ سجل الحضور بنجاح",
      });
      logActivity({ actionType: "attendance_recorded", description: "تسجيل حضور الطلاب" });

      fetchAttendance();
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast({
        title: "خطأ",
        description: "فشل في حفظ سجل الحضور",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getStats = () => {
    const stats = { present: 0, absent: 0, late: 0, excused: 0 };
    students.forEach(s => {
      const status = attendance[s.id] || "present";
      stats[status]++;
    });
    return stats;
  };

  const stats = getStats();
  const canManage = userRole === "admin" || userRole === "teacher";

  return (
    <DashboardLayout userRole={userRole || "student"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">الحضور والغياب</h1>
            <p className="text-muted-foreground">تسجيل ومتابعة حضور الطلاب</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفصل" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start gap-2 min-w-[200px]">
                    <CalendarIcon className="h-4 w-4" />
                    {format(selectedDate, "PPP", { locale: ar })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {canManage && selectedClass && students.length > 0 && (
                <Button onClick={handleSaveAttendance} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  حفظ الحضور
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {selectedClass && students.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.present}</div>
                    <div className="text-sm text-muted-foreground">حاضر</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-destructive/10 text-destructive">
                    <X className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.absent}</div>
                    <div className="text-sm text-muted-foreground">غائب</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-secondary text-secondary-foreground">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.late}</div>
                    <div className="text-sm text-muted-foreground">متأخر</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted text-muted-foreground">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.excused}</div>
                    <div className="text-sm text-muted-foreground">معذور</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              قائمة الطلاب
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedClass ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>اختر الفصل لعرض قائمة الطلاب</p>
              </div>
            ) : loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
                <p>جاري التحميل...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا يوجد طلاب في هذا الفصل</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>اسم الطالب</TableHead>
                      <TableHead>رقم الطالب</TableHead>
                      <TableHead>الحالة</TableHead>
                      {canManage && <TableHead>تغيير الحالة</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student, index) => (
                      <TableRow key={student.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{student.student_name}</TableCell>
                        <TableCell>{student.student_number || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[attendance[student.id] || "present"].variant}>
                            <span className="flex items-center gap-1">
                              {statusConfig[attendance[student.id] || "present"].icon}
                              {statusConfig[attendance[student.id] || "present"].label}
                            </span>
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <div className="flex gap-1">
                              {(Object.keys(statusConfig) as AttendanceStatus[]).map((status) => (
                                <Button
                                  key={status}
                                  size="sm"
                                  variant={attendance[student.id] === status ? "default" : "outline"}
                                  className={cn(
                                    "h-8 w-8 p-0",
                                    attendance[student.id] === status && status === "present" && "bg-primary",
                                    attendance[student.id] === status && status === "absent" && "bg-destructive",
                                    attendance[student.id] === status && status === "late" && "bg-secondary text-secondary-foreground",
                                  )}
                                  onClick={() => handleStatusChange(student.id, status)}
                                  title={statusConfig[status].label}
                                >
                                  {statusConfig[status].icon}
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
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

export default AttendancePage;
