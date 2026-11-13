import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  LogOut,
  Menu,
  Bell,
  Layers,
  FileText,
  Settings,
  ClipboardCheck,
  School,
  BarChart3,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useForwardWheelToScrollable } from "@/hooks/useForwardWheel";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  {
    label: "لوحة التحكم",
    href: "/school",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: "نظرة عامة",
    href: "/school/overview",
    icon: <School className="h-5 w-5" />,
  },
  {
    label: "المراحل الدراسية",
    href: "/school/stages",
    icon: <Layers className="h-5 w-5" />,
  },
  {
    label: "المواد الدراسية",
    href: "/school/subjects",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    label: "الفصول",
    href: "/school/classes",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    label: "المعلمين",
    href: "/school/teachers",
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: "الطلاب",
    href: "/school/students",
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    label: "الاختبارات",
    href: "/school/assessments",
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    label: "نتائج التقييمات",
    href: "/school/assessment-results",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    label: "متابعة نتائج الطلاب",
    href: "/school/student-results",
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    label: "متابعة النشاطات",
    href: "/school/activity",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    label: "الإعدادات",
    href: "/school/settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

interface SidebarProps {
  mobile?: boolean;
  pathname: string;
  schoolName: string;
  onCloseMobile: () => void;
  onSignOut: () => void;
}

/**
 * School sidebar. Top-level (not nested) so re-renders of the layout don't
 * remount it and reset the nav's scroll position.
 *
 * Scroll contract: see DashboardLayout's Sidebar — `min-h-0 flex-1
 * overflow-y-auto` nav inside a definite-height column, `data-lenis-prevent`
 * so Lenis yields the wheel, and wheel-forwarding for the fixed chrome.
 */
const Sidebar = ({
  mobile = false,
  pathname,
  schoolName,
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
        "flex min-h-0 flex-col h-full bg-card border-l",
        mobile ? "w-full" : "w-64"
      )}>
      <div className="shrink-0 p-6 border-b">
        <h1 className="text-xl font-bold">لوحة تحكم المدرسة</h1>
        <p className="text-sm text-muted-foreground mt-1">{schoolName}</p>
      </div>

      <nav
        ref={navRef}
        data-lenis-prevent
        className="sidebar-scroll min-h-0 flex-1 p-4 space-y-1 overflow-y-auto overscroll-contain"
      >
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => mobile && onCloseMobile()}
            aria-current={pathname === item.href ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="shrink-0 p-4 border-t flex items-center gap-2">
        <Button
          variant="ghost"
          className="flex-1 justify-start gap-3"
          onClick={onSignOut}
        >
          <LogOut className="h-5 w-5" />
          <span>تسجيل الخروج</span>
        </Button>
        <ThemeToggle />
      </div>
    </div>
  );
};

interface SchoolLayoutProps {
  children: ReactNode;
  schoolName?: string;
}

const SchoolLayout = ({ children, schoolName = "مدرسة" }: SchoolLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { signOut, isDemo } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <aside className="hidden md:fixed md:inset-y-0 md:right-0 md:flex md:h-dvh md:max-h-dvh md:w-64">
        <Sidebar
          pathname={location.pathname}
          schoolName={schoolName}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onSignOut={handleSignOut}
        />
      </aside>

      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-72">
              <Sidebar
                mobile
                pathname={location.pathname}
                schoolName={schoolName}
                onCloseMobile={() => setIsMobileMenuOpen(false)}
                onSignOut={handleSignOut}
              />
            </SheetContent>
          </Sheet>
          
          <h1 className="text-lg font-bold">لوحة المدرسة</h1>
          
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="md:mr-64 pt-16 md:pt-0">
        <div className="p-6">
          {/* Demo Banner */}
          {isDemo && (
            <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>🎮</span>
                <span>أنت في وضع التجربة - البيانات وهمية ولن يتم حفظ أي تغييرات</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="text-xs">
                إنهاء التجربة
              </Button>
            </div>
          )}

          <div className="hidden md:flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">مرحباً، {schoolName}</h2>
              <p className="text-muted-foreground">نتمنى لك يوماً سعيداً</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {children}
        </div>
      </main>
    </div>
  );
};

export default SchoolLayout;
