import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Search, Activity, RefreshCw } from "lucide-react";
import { getActionTypeLabel, getActionTypeIcon } from "@/lib/activityLogger";

interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  description: string;
  entity_type: string | null;
  school_id: string | null;
  created_at: string;
  user_name?: string;
  school_name?: string;
}

const AdminActivityLogsPage = () => {
  const { user, userRole, profile, loading, hasPermission } = useAuth();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !(userRole === "admin" || hasPermission("activity_logs"))) navigate("/dashboard");
  }, [user, loading, userRole, hasPermission, navigate]);

  useEffect(() => {
    if (user && (userRole === "admin" || hasPermission("activity_logs"))) fetchLogs();
  }, [user, userRole, hasPermission]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data: logsData } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!logsData) { setIsLoading(false); return; }

      // Fetch user names
      const userIds = [...new Set(logsData.map(l => l.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

      // Fetch school names
      const schoolIds = [...new Set(logsData.filter(l => l.school_id).map(l => l.school_id!))];
      let schoolMap = new Map<string, string>();
      if (schoolIds.length > 0) {
        const { data: schools } = await supabase
          .from("schools")
          .select("id, name")
          .in("id", schoolIds);
        schoolMap = new Map((schools || []).map(s => [s.id, s.name]));
      }

      setLogs(logsData.map(l => ({
        ...l,
        user_name: profileMap.get(l.user_id) || "غير محدد",
        school_name: l.school_id ? schoolMap.get(l.school_id) || null : null,
      })));
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(l => {
    const matchesSearch = (l.user_name || "").includes(searchTerm) || l.description.includes(searchTerm);
    const matchesType = filterType === "all" || l.action_type === filterType;
    return matchesSearch && matchesType;
  });

  const actionTypes = [...new Set(logs.map(l => l.action_type))];

  if (loading || isLoading) {
    return (
      <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مستخدم"}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={userRole || "admin"} userName={profile?.full_name || "مستخدم"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-8 w-8" />
              سجل النشاطات
            </h1>
            <p className="text-muted-foreground">جميع الأنشطة على المنصة</p>
          </div>
          <Button variant="outline" onClick={fetchLogs} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الوصف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="جميع الأنواع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              {actionTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {getActionTypeIcon(type)} {getActionTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        <Card>
          <CardContent className="p-0">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد نشاطات مسجلة</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-10"></TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">الوصف</TableHead>
                    <TableHead className="text-right">المدرسة</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-lg">
                        {getActionTypeIcon(log.action_type)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getActionTypeLabel(log.action_type)}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.user_name}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{log.description}</TableCell>
                      <TableCell>
                        {log.school_name ? (
                          <Badge variant="secondary">{log.school_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("ar")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminActivityLogsPage;
