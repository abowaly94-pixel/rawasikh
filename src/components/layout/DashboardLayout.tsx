import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  Settings,
  LogOut,
  GraduationCap,
  UserCircle,
  Bell,
  Home,
  Menu,
  ClipboardCheck,
  Award,
  PlayCircle,
  Video,
  FolderOpen,
  MonitorPlay,
  UserCheck,
  FileQuestion,
  BarChart3,
  School,
  Package,
  Receipt,
  DollarSign,
  ShoppingBag,
  ShoppingCart,
  ClipboardList,
  Activity,
  Newspaper,
  Megaphone,
  Target,
  TicketPercent,
  Gift,
  ShieldCheck,
  Wallet,
  Briefcase,
  Star,

} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useForwardWheelToScrollable } from "@/hooks/useForwardWheel";
import ThemeToggle from "@/components/ThemeToggle";

type UserRole = "admin" | "teacher" | "student" | "parent" | "school" | "staff";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  roles: UserRole[];
  section: string;
  // When set, a "staff" (limited-admin) user only sees this item if the main
  // admin has granted them this permission key. Ignored for every other role.
  permissionKey?: string;
}

const SECTION_ORDER = [
  "نظرة عامة",
  "إدارة المستخدمين",
  "إدارة المحتوى",
  "المبيعات والحسابات",
  "التسويق والموقع",
  "النظام",
  "الطالب",
  "ولي الأمر",
  "الحساب",
];

const navItems: NavItem[] = [
  // ===== Overview =====
  {
    label: "لوحة التحكم",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ["admin", "teacher", "student", "parent", "staff"],
    section: "نظرة عامة",
  },

  // ===== User Management (Admin) =====
  {
    label: "المستخدمين",
    href: "/dashboard/users",
    icon: <Users className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "إدارة المستخدمين",
    permissionKey: "users",
  },
  {
    label: "إدارة المشرفين",
    href: "/dashboard/manage-staff",
    icon: <ShieldCheck className="h-5 w-5" />,
    roles: ["admin"],
    section: "إدارة المستخدمين",
  },
  {
    label: "إدارة المعلمين",
    href: "/dashboard/teachers",
    icon: <UserCheck className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "إدارة المستخدمين",
    permissionKey: "teachers_manage",
  },
  {
    label: "الطلاب",
    href: "/dashboard/students",
    icon: <GraduationCap className="h-5 w-5" />,
    roles: ["admin", "teacher", "staff"],
    section: "إدارة المستخدمين",
    permissionKey: "students",
  },
  {
    label: "مهام الطلاب",
    href: "/dashboard/tasks",
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ["admin", "teacher", "staff"],
    section: "إدارة المستخدمين",
    permissionKey: "tasks",
  },

  // ===== Content Management =====
  {
    label: "التصنيفات",
    href: "/dashboard/categories",
    icon: <FolderOpen className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "إدارة المحتوى",
    permissionKey: "categories",
  },
  {
    label: "إدارة الدورات التدريبية",
    href: "/dashboard/courses",
    icon: <Video className="h-5 w-5" />,
    roles: ["admin", "teacher", "staff"],
    section: "إدارة المحتوى",
    permissionKey: "courses",
  },
  {
    label: "إدارة الاختبارات",
    href: "/dashboard/quizzes",
    icon: <FileQuestion className="h-5 w-5" />,
    roles: ["admin", "teacher", "staff"],
    section: "إدارة المحتوى",
    permissionKey: "quizzes",
  },
  {
    label: "درجات الاختبارات",
    href: "/dashboard/quiz-results",
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ["admin", "teacher", "staff"],
    section: "إدارة المحتوى",
    permissionKey: "quiz_results",
  },
  {
    label: "الحصص الأونلاين",
    href: "/dashboard/sessions",
    icon: <MonitorPlay className="h-5 w-5" />,
    roles: ["teacher"],
    section: "إدارة المحتوى",
  },
  {
    label: "روابط Zoom",
    href: "/dashboard/zoom-links",
    icon: <Video className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "إدارة المحتوى",
    permissionKey: "zoom_links",
  },
  {
    label: "المنتجات",
    href: "/dashboard/products",
    icon: <Package className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "إدارة المحتوى",
    permissionKey: "products",
  },
  {
    label: "إدارة المقالات",
    href: "/dashboard/blog-posts",
    icon: <Newspaper className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "إدارة المحتوى",
    permissionKey: "blog_posts",
  },
  {
    label: "الشهادات",
    href: "/dashboard/certificates",
    icon: <Award className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "إدارة المحتوى",
    permissionKey: "certificates",
  },
  {
    label: "اختبارات تحديد المستوى",
    href: "/dashboard/level-assessments",
    icon: <Target className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "إدارة المحتوى",
    permissionKey: "level_assessments",
  },
  {
    label: "النماذج والاستبيانات",
    href: "/dashboard/forms",
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "إدارة المحتوى",
    permissionKey: "forms",
  },
  {
    label: "الحضور والغياب",
    href: "/dashboard/lecture-attendance",
    icon: <ClipboardCheck className="h-5 w-5" />,
    roles: ["admin", "teacher", "staff"],
    section: "إدارة المحتوى",
    permissionKey: "lecture_attendance",
  },
  {
    label: "آراء الطلاب",
    href: "/dashboard/reviews",
    icon: <Star className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "إدارة المحتوى",
    permissionKey: "reviews",
  },

  // ===== Sales & Finance =====
  {
    label: "طلبات الدورات التدريبية",
    href: "/dashboard/course-requests",
    icon: <ShoppingBag className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "المبيعات والحسابات",
    permissionKey: "course_requests",
  },
  {
    label: "منح الدورات التدريبية مجاناً",
    href: "/dashboard/grant-courses",
    icon: <Gift className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "المبيعات والحسابات",
    permissionKey: "grant_courses",
  },
  {
    label: "أكواد الخصم",
    href: "/dashboard/discount-codes",
    icon: <TicketPercent className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "المبيعات والحسابات",
    permissionKey: "discount_codes",
  },
  {
    label: "الحسابات",
    href: "/dashboard/accounting",
    icon: <DollarSign className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "المبيعات والحسابات",
    permissionKey: "financials",
  },
  {
    label: "الماليات",
    href: "/dashboard/financials",
    icon: <Wallet className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "المبيعات والحسابات",
    permissionKey: "financials",
  },

  // ===== Marketing & Site =====
  {
    label: "الشريط الإخباري",
    href: "/dashboard/news-ticker",
    icon: <Megaphone className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "التسويق والموقع",
    permissionKey: "news_ticker",
  },
  {
    label: "سابقة الأعمال",
    href: "/dashboard/portfolio",
    icon: <Briefcase className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "التسويق والموقع",
    permissionKey: "portfolio",
  },
  {
    label: "أخبار وفيديوهات الرئيسية",
    href: "/dashboard/news-updates",
    icon: <Video className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "التسويق والموقع",
    permissionKey: "news_updates",
  },
  {
    label: "إعدادات الموقع",
    href: "/dashboard/site-settings",
    icon: <Settings className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "التسويق والموقع",
    permissionKey: "site_settings",
  },
  {
    label: "السياسات",
    href: "/dashboard/policies",
    icon: <ShieldCheck className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "التسويق والموقع",
    permissionKey: "policies",
  },

  // ===== System =====
  {
    label: "سجل النشاطات",
    href: "/dashboard/activity-logs",
    icon: <Activity className="h-5 w-5" />,
    roles: ["admin", "staff"],
    section: "النظام",
    permissionKey: "activity_logs",
  },

  // ===== Student =====
  {
    label: "دوراتي التدريبية",
    href: "/dashboard/my-courses",
    icon: <PlayCircle className="h-5 w-5" />,
    roles: ["student"],
    section: "الطالب",
  },
  {
    label: "معلميني",
    href: "/dashboard/my-teachers",
    icon: <Users className="h-5 w-5" />,
    roles: ["student"],
    section: "الطالب",
  },
  {
    label: "شهاداتي",
    href: "/dashboard/my-certificates",
    icon: <Award className="h-5 w-5" />,
    roles: ["student"],
    section: "الطالب",
  },
  {
    label: "النماذج",
    href: "/dashboard/my-forms",
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ["student"],
    section: "الطالب",
  },
  {
    label: "المهام",
    href: "/dashboard/my-tasks",
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ["student"],
    section: "الطالب",
  },

  // ===== Parent =====
  {
    label: "متابعة الأبناء",
    href: "/dashboard/students",
    icon: <GraduationCap className="h-5 w-5" />,
    roles: ["parent"],
    section: "ولي الأمر",
  },
  {
    label: "حضور الأبناء",
    href: "/dashboard/attendance",
    icon: <ClipboardCheck className="h-5 w-5" />,
    roles: ["parent"],
    section: "ولي الأمر",
  },
  {
    label: "درجات الأبناء",
    href: "/dashboard/grades",
    icon: <Award className="h-5 w-5" />,
    roles: ["parent"],
    section: "ولي الأمر",
  },
  {
    label: "أداء الأبناء",
    href: "/dashboard/children-performance",
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ["parent"],
    section: "ولي الأمر",
  },

  // ===== Profile =====
  {
    label: "الملف الشخصي",
    href: "/dashboard/profile",
    icon: <UserCircle className="h-5 w-5" />,
    roles: ["admin", "teacher", "student", "parent", "staff"],
    section: "الحساب",
  },
];

interface SidebarProps {
  mobile?: boolean;
  groupedNavItems: { section: string; items: NavItem[] }[];
  pathname: string;
  userName: string;
  userRole: UserRole | null;
  currentRoleLabel: string;
  onCloseMobile: () => void;
  onSignOut: () => void;
}

/**
 * Dashboard sidebar. Top-level (not nested) so re-renders of the layout
 * don't remount it and reset the nav's scroll position.
 *
 * Scroll contract:
 * - The nav is the only scroll region: `min-h-0 flex-1 overflow-y-auto`
 *   inside a definite-height (`h-dvh`) column. Without `min-h-0` the flex
 *   item can't shrink below its content and `overflow-y-auto` never fires.
 * - `data-lenis-prevent` makes Lenis yield the wheel to the nav instead of
 *   hijacking it for page scroll; `overscroll-contain` stops chaining.
 * - `useForwardWheelToScrollable` extends the wheel to the fixed
 *   header/footer areas, which have no scrollable ancestor of their own.
 */
const Sidebar = ({
  mobile = false,
  groupedNavItems,
  pathname,
  userName,
  userRole,
  currentRoleLabel,
  onCloseMobile,
  onSignOut,
}: SidebarProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useForwardWheelToScrollable(rootRef, navRef);

  // Keep the active route visible inside the long nav on navigation.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    nav
      .querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [pathname]);

  return (
    <div
      ref={rootRef}
      data-lenis-prevent
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden border-l border-white/10 bg-ink text-white",
        mobile ? "w-full" : "w-64",
      )}
    >
      <div className="pattern-lattice-light pointer-events-none absolute inset-0 opacity-[0.035]" aria-hidden />
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-white/[0.06] text-gold" aria-hidden>
              {!userRole && <UserCircle className="h-5 w-5" />}
              {userRole === "admin" && <Settings className="h-5 w-5" />}
              {userRole === "teacher" && <GraduationCap className="h-5 w-5" />}
              {userRole === "student" && <UserCircle className="h-5 w-5" />}
              {userRole === "parent" && <Users className="h-5 w-5" />}
              {userRole === "school" && <School className="h-5 w-5" />}
              {userRole === "staff" && <ShieldCheck className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-white">{userName}</h1>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-[11px] font-semibold text-gold">
                  {currentRoleLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        <nav
          ref={navRef}
          data-lenis-prevent
          className="sidebar-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4"
          aria-label="التنقل الرئيسي"
        >
          {groupedNavItems.map((group) => {
            return (
              <div key={group.section} className="space-y-1">
                <h3 className="px-3 pb-1 pt-2 text-[11px] font-semibold text-white/40">
                  {group.section}
                </h3>
                <div role="list" className="space-y-1">
                  {group.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href + item.label}
                        to={item.href}
                        onClick={() => mobile && onCloseMobile()}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-[44px] items-center gap-3 rounded-lg border-s-2 px-4 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
                          active
                            ? "border-gold bg-white/[0.08] text-gold"
                            : "border-transparent text-white/70 hover:bg-white/[0.06] hover:text-white"
                        )}
                      >
                        <span aria-hidden>{item.icon}</span>
                        <span>{item.label}</span>
                        {active && <span className="sr-only">الصفحة الحالية</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-white/10 p-4">
          <Link
            to="/"
            onClick={() => mobile && onCloseMobile()}
            className="flex min-h-[44px] items-center gap-3 rounded-lg px-4 py-3 text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Home className="h-5 w-5" aria-hidden />
            <span>الصفحة الرئيسية</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="min-h-[44px] flex-1 justify-start gap-3 text-white/70 hover:bg-white/[0.06] hover:text-white"
              onClick={onSignOut}
              aria-label="تسجيل الخروج"
            >
              <LogOut className="h-5 w-5" aria-hidden />
              <span>تسجيل الخروج</span>
            </Button>
            <div className="[&_button]:text-white/70 [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DashboardLayoutProps {
  children: ReactNode;
  userRole?: UserRole | null;
  userName?: string | null;
}

const DashboardLayout = ({ 
  children, 
  userRole: userRoleProp,
  userName: userNameProp,
}: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { signOut, isDemo, userRole: authUserRole, profile, hasPermission } = useAuth();
  const userRole = userRoleProp ?? authUserRole;
  const userName = userNameProp ?? profile?.full_name ?? "مستخدم";

  const filteredNavItems = userRole
    ? navItems.filter((item) => {
        if (!item.roles.includes(userRole)) return false;
        // A "staff" account only sees permission-gated items it was actually granted.
        if (userRole === "staff" && item.permissionKey) {
          return hasPermission(item.permissionKey);
        }
        return true;
      })
    : [];

  const groupedNavItems = SECTION_ORDER
    .map((section) => ({
      section,
      items: filteredNavItems.filter((i) => i.section === section),
    }))
    .filter((g) => g.items.length > 0);

  const roleLabels: Record<UserRole, string> = {
    admin: "مدير النظام",
    teacher: "مدرس",
    student: "طالب",
    parent: "ولي أمر",
    school: "مدرسة",
    staff: "مشرف",
  };
  const currentRoleLabel = userRole ? roleLabels[userRole] : "جاري التحميل";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-paper" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:right-0 md:flex md:h-dvh md:max-h-dvh md:w-64" aria-label="القائمة الجانبية">
        <Sidebar
          groupedNavItems={groupedNavItems}
          pathname={location.pathname}
          userName={userName}
          userRole={userRole}
          currentRoleLabel={currentRoleLabel}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-paper/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-lg" aria-label="فتح القائمة" aria-expanded={isMobileMenuOpen}>
                <Menu className="h-6 w-6" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-72">
              <Sidebar
                mobile
                groupedNavItems={groupedNavItems}
                pathname={location.pathname}
                userName={userName}
                userRole={userRole}
                currentRoleLabel={currentRoleLabel}
                onCloseMobile={() => setIsMobileMenuOpen(false)}
                onSignOut={handleSignOut}
              />
            </SheetContent>
          </Sheet>

          <h1 className="text-lg font-bold">نظام تعليمي</h1>

          <Button variant="ghost" size="icon-lg" aria-label="الإشعارات">
            <Bell className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="md:mr-64 pt-16 md:pt-0">
        <div className="mx-auto w-full max-w-[1280px] p-4 sm:p-6 lg:p-8">
          {/* Demo Banner */}
          {isDemo && (
            <div className="mb-4 flex flex-col gap-2 rounded-xl border border-gold/30 bg-gold/10 p-3 sm:flex-row sm:items-center sm:justify-between" role="status">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span aria-hidden>🎮</span>
                <span>أنت في وضع التجربة - البيانات وهمية ولن يتم حفظ أي تغييرات</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="self-start text-xs sm:self-auto">
                إنهاء التجربة
              </Button>
            </div>
          )}

          {/* Header */}
          <div className="mb-8 hidden items-center justify-between md:flex">
            <div>
              <h2 className="text-2xl font-bold">مرحباً، {userName}</h2>
              <div className="rule-gold mt-3" aria-hidden />
              <p className="mt-3 text-sm text-muted-foreground">نتمنى لك يوماً سعيداً</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon-lg" aria-label="الإشعارات" className="rounded-xl border border-border bg-card shadow-xs">
                <Bell className="h-5 w-5" aria-hidden />
              </Button>
            </div>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
