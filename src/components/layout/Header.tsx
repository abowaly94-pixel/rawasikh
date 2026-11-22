import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  LogOut,
  Mail,
  Menu,
  Phone,
  Search,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTermsTranslation } from "@/hooks/useTermsTranslation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import NewsTicker from "@/components/NewsTicker";
import HeaderActions from "@/components/layout/HeaderActions";
import SearchField from "@/components/site/SearchField";

import rawasikhLogo from "@/assets/rawasikh-logo.png";
import { cn } from "@/lib/utils";

type NavDropdown = "courses" | "services";
type NavItem = { label: string; href: string; dropdown?: NavDropdown };

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openDropdown, setOpenDropdown] = useState<NavDropdown | null>(null);

  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const navRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // The header is fixed so it stays put when Radix locks body scroll for
  // menus/dialogs. Publish its measured height so the layout can reserve the
  // exact space and anchor links can offset correctly. Re-measures on resize,
  // font/language changes and when the news ticker mounts or unmounts.
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const sync = () => {
      const height = header.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--site-header-height", `${height}px`);
      document.body.classList.add("has-site-header");
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(header);
    window.addEventListener("resize", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      document.body.classList.remove("has-site-header");
    };
  }, [i18n.language]);

  const { data: courseCategories } = useQuery({
    queryKey: ["header-course-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("course_categories")
        .select("id, name")
        .eq("show_in_menu", true)
        .order("name", { ascending: true });
      return (data || []) as { id: string; name: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { tt } = useTermsTranslation((courseCategories || []).map((c) => c.name));

  // Close transient UI on navigation.
  useEffect(() => {
    setOpenDropdown(null);
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!openDropdown) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenDropdown(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openDropdown]);

  const navItems: NavItem[] = useMemo(
    () => [
      { label: t("nav.home"), href: "/" },
      { label: t("nav.coursesShort"), href: "/courses", dropdown: "courses" },
      { label: t("nav.servicesShort"), href: "/services", dropdown: "services" },
      { label: t("nav.levelShort"), href: "/level-assessment" },
      { label: t("nav.storeShort"), href: "/store" },
      { label: t("nav.blogShort"), href: "/blog" },
      { label: t("nav.digitalSolutionsShort"), href: "/digital-solutions" },
    ],
    [t],
  );

  const serviceLinks = useMemo(
    () => [
      { to: "/services", label: t("nav.services") },
      { to: "/academic-services", label: t("nav.academicServices") },
      { to: "/digital-solutions", label: t("nav.digitalSolutions") },
      { to: "/services#training", label: t("services.training") },
      { to: "/services#education", label: t("services.education") },
      { to: "/services#translation", label: t("services.translation") },
    ],
    [t],
  );

  const isActive = (href: string) =>
    href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

  const submitSearch = (value: string) => {
    const term = value.trim();
    if (!term) return;
    navigate(`/search?q=${encodeURIComponent(term)}`);
    setSearchQuery("");
    setSearchOpen(false);
    setMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header ref={headerRef} className="site-header fixed inset-x-0 top-0 z-50 w-full">
      {/* ---- Utility strip (desktop) ---- */}
      <div className="hidden bg-ink text-white/75 lg:block">
        <div className="shell flex h-9 items-center justify-between text-[12px]">
          <div className="flex items-center gap-4">
            <a
              href="tel:+201033441054"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              <span className="nums" dir="ltr">+20 103 344 1054</span>
            </a>
            <span className="h-3 w-px bg-white/20" aria-hidden />
            <a
              href="mailto:info@rawasikheg.com"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden />
              info@rawasikheg.com
            </a>
          </div>

          <div className="flex items-center gap-1">
            <Link to="/about" className="rounded px-2 py-1 transition-colors hover:text-white">
              {t("nav.about")}
            </Link>
            <Link to="/policies" className="rounded px-2 py-1 transition-colors hover:text-white">
              {t("nav.policies")}
            </Link>
            <Link to="/contact" className="rounded px-2 py-1 transition-colors hover:text-white">
              {t("nav.contact")}
            </Link>
            <span className="mx-1 h-3 w-px bg-white/20" aria-hidden />
            <div className="flex items-center gap-0.5">
              <LanguageSwitcher className="text-white/75 hover:bg-white/10 hover:text-white data-[state=open]:bg-white/10 data-[state=open]:text-white" />
              <div className="[&_button]:h-8 [&_button]:w-8 [&_button]:text-white/75 [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
                <ThemeToggle hideTooltip />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Main bar ---- */}
      <div className="border-b border-border bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
        <div className="shell flex h-16 items-center gap-2 lg:h-[74px]">
          {/* Logo */}
          <Link
            to="/"
            className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:rounded-md dark:bg-white dark:p-1.5 dark:shadow-sm"
            aria-label="رواسخ — الصفحة الرئيسية"
          >
            <img
              src={rawasikhLogo}
              alt="رواسخ"
              width={131}
              height={48}
              decoding="async"
              {...({ fetchpriority: "high" } as Record<string, string>)}
              className="h-9 w-auto sm:h-10 lg:h-11"
            />
          </Link>

          {/* Desktop nav */}
          <nav ref={navRef} className="ms-4 hidden items-center gap-0.5 lg:flex" aria-label="التنقل الرئيسي">
            {navItems.map((item) =>
              item.dropdown ? (
                <div key={item.href} className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenDropdown((open) => (open === item.dropdown ? null : item.dropdown))
                    }
                    onMouseEnter={() => setOpenDropdown(item.dropdown)}
                    aria-expanded={openDropdown === item.dropdown}
                    aria-haspopup="true"
                    className={cn(
                      "relative inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors xl:px-3 xl:text-[13.5px]",
                      isActive(item.href)
                        ? "text-primary"
                        : "text-foreground/75 hover:text-primary",
                    )}
                  >
                    {item.label}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-300",
                        openDropdown === item.dropdown && "rotate-180",
                      )}
                      aria-hidden
                    />
                    {isActive(item.href) && (
                      <span className="absolute inset-x-2 -bottom-[1px] h-[2px] rounded-full bg-primary" aria-hidden />
                    )}
                  </button>

                  {openDropdown === item.dropdown && (
                    <div
                      className="absolute start-0 top-full z-50 mt-3 w-[320px] overflow-hidden rounded-2xl border border-border bg-popover p-2 shadow-xl"
                      onMouseLeave={() => setOpenDropdown(null)}
                      role="menu"
                    >
                      {item.dropdown === "courses" ? (
                        <>
                          <Link
                            to="/courses"
                            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-brand-soft"
                            role="menuitem"
                          >
                            {t("coursesSection.viewAll")}
                          </Link>
                          <div className="my-1 h-px bg-border" aria-hidden />
                          {(courseCategories || []).length === 0 ? (
                            <p className="px-3 py-2 text-xs text-muted-foreground">
                              {t("coursesSection.comingSoon")}
                            </p>
                          ) : (
                            (courseCategories || []).map((category) => (
                              <Link
                                key={category.id}
                                to={`/courses?category=${category.id}`}
                                className="block rounded-xl px-3 py-2 text-[13.5px] text-foreground/80 transition-colors hover:bg-muted hover:text-primary"
                                role="menuitem"
                              >
                                <span data-no-auto-translate>{tt(category.name)}</span>
                              </Link>
                            ))
                          )}
                        </>
                      ) : (
                        <>
                          <Link
                            to="/services"
                            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-brand-soft"
                            role="menuitem"
                          >
                            {t("nav.services")}
                          </Link>
                          <div className="my-1 h-px bg-border" aria-hidden />
                          {serviceLinks.slice(1).map((link) => (
                            <Link
                              key={link.to}
                              to={link.to}
                              className="block rounded-xl px-3 py-2 text-[13.5px] text-foreground/80 transition-colors hover:bg-muted hover:text-primary"
                              role="menuitem"
                            >
                              {link.label}
                            </Link>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "relative whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors xl:px-3 xl:text-[13.5px]",
                    isActive(item.href)
                      ? "text-primary"
                      : "text-foreground/75 hover:text-primary",
                  )}
                >
                  {item.label}
                  {isActive(item.href) && (
                    <span className="absolute inset-x-2 -bottom-[1px] h-[2px] rounded-full bg-primary" aria-hidden />
                  )}
                </Link>
              ),
            )}
          </nav>

          {/* Actions */}
          <div className="ms-auto flex items-center gap-1.5">
            <div className="hidden w-[150px] md:block xl:w-[210px] 2xl:w-[240px]">
              <SearchField
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={submitSearch}
                placeholder={t("searchPage.placeholderShort")}
                ariaLabel={t("searchPage.placeholder")}
                className="h-10 ps-3.5"
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9 rounded-xl md:hidden", user && "hidden sm:inline-flex")}
              aria-label={t("common.search")}
              onClick={() => setSearchOpen((open) => !open)}
            >
              <Search className="h-5 w-5" aria-hidden />
            </Button>

            <HeaderActions />

            {/* Mobile menu */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl lg:hidden" aria-label={t("nav.menu")}>
                  <Menu className="h-5 w-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side={isRtl ? "left" : "right"} className="w-[86vw] max-w-sm overflow-y-auto p-0">
                <SheetHeader className="border-b border-border px-5 py-4 text-start">
                  <SheetTitle className="flex items-center gap-2 text-base">
                    <img src={rawasikhLogo} alt="رواسخ" width={109} height={40} className="h-9 w-auto" />
                  </SheetTitle>
                </SheetHeader>

                <div className="px-5 py-4">
                  <SearchField
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSubmit={submitSearch}
                    placeholder={t("searchPage.placeholder")}
                    ariaLabel={t("searchPage.placeholder")}
                  />
                </div>

                <nav className="flex flex-col px-2 pb-4 text-center" aria-label="التنقل">
                  {navItems.map((item) =>
                    item.dropdown &&
                    (item.dropdown === "services" || (courseCategories || []).length > 0) ? (
                      <Collapsible key={item.href}>
                        <div className="flex items-center">
                          <Link
                            to={item.href}
                            className="flex-1 rounded-xl px-3 py-3 text-[15px] font-semibold text-foreground"
                          >
                            {item.label}
                          </Link>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              aria-label={
                                item.dropdown === "courses"
                                  ? t("coursesPage.browseByCategory")
                                  : t("services.badge")
                              }
                            >
                              <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" aria-hidden />
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent>
                          <div className="mb-2 flex flex-col gap-0.5 border-s border-border ps-4">
                            {item.dropdown === "courses" ? (
                              (courseCategories || []).map((category) => (
                                <Link
                                  key={category.id}
                                  to={`/courses?category=${category.id}`}
                                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground"
                                >
                                  <span data-no-auto-translate>{tt(category.name)}</span>
                                </Link>
                              ))
                            ) : (
                              serviceLinks.slice(1).map((link) => (
                                <Link
                                  key={link.to}
                                  to={link.to}
                                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground"
                                >
                                  {link.label}
                                </Link>
                              ))
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                          "rounded-xl px-3 py-3 text-[15px] font-semibold",
                          isActive(item.href) ? "text-primary" : "text-foreground",
                        )}
                      >
                        {item.label}
                      </Link>
                    ),
                  )}

                  <div className="my-2 h-px bg-border" aria-hidden />
                  <Link to="/about" className="rounded-xl px-3 py-2.5 text-sm text-muted-foreground">
                    {t("nav.about")}
                  </Link>
                  <Link to="/policies" className="rounded-xl px-3 py-2.5 text-sm text-muted-foreground">
                    {t("nav.policies")}
                  </Link>
                  <Link to="/contact" className="rounded-xl px-3 py-2.5 text-sm text-muted-foreground">
                    {t("nav.contact")}
                  </Link>
                </nav>

                <div className="mt-auto space-y-3 border-t border-border px-5 py-5">
                  <div className="flex items-center justify-between">
                    <LanguageSwitcher align="start" />
                    <ThemeToggle hideTooltip />
                  </div>
                  {user ? (
                    <div className="grid gap-2">
                      <Button asChild variant="outline">
                        <Link to="/dashboard/profile" className="gap-2">
                          <User className="h-4 w-4" aria-hidden />
                          {t("nav.profile")}
                        </Link>
                      </Button>
                      <Button variant="destructive" onClick={handleSignOut} className="gap-2">
                        <LogOut className="h-4 w-4" aria-hidden />
                        {t("nav.signOut")}
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button asChild variant="outline">
                        <Link to="/auth">{t("nav.signIn")}</Link>
                      </Button>
                      <Button asChild>
                        <Link to="/auth">{t("nav.getStarted")}</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Expandable search (mobile) */}
        {searchOpen && (
          <div className="border-t border-border bg-background px-5 py-3 md:hidden">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={submitSearch}
              placeholder={t("searchPage.placeholder")}
              ariaLabel={t("searchPage.placeholder")}
              size="lg"
            />
          </div>
        )}
      </div>

      <NewsTicker />
    </header>
  );
};

export default Header;
