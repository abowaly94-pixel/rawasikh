import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Check,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  ShoppingCart,
  Trash2,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

interface Notif {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
  type: string;
}

const DATE_LOCALES: Record<string, string> = {
  ar: "ar-EG",
  en: "en-GB",
  fr: "fr-FR",
  ur: "ur-PK",
};

const iconButtonClass =
  "relative h-9 w-9 rounded-xl text-foreground/80 transition-colors hover:bg-brand-soft hover:text-primary data-[state=open]:bg-brand-soft data-[state=open]:text-primary";

const HeaderActions = () => {
  const { t, i18n } = useTranslation();
  const { user, profile, signOut } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);

  const unread = items.filter((n) => !n.read_at).length;
  const dateLocale = DATE_LOCALES[i18n.language] || "ar-EG";
  const displayName = profile?.full_name?.trim() || "";
  const initial = displayName.charAt(0) || user?.email?.charAt(0).toUpperCase() || "";

  const fetchItems = async () => {
    if (!user) {
      setItems([]);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems(((data as unknown) || []) as Notif[]);
  };

  useEffect(() => {
    fetchItems();
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetchItems(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const markAllRead = async () => {
    if (unread === 0) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user!.id)
      .is("read_at", null);
    fetchItems();
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    fetchItems();
  };

  const removeOne = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    fetchItems();
  };

  const openNotification = async (n: Notif) => {
    setNotifOpen(false);
    if (!n.read_at) await markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5">
      {/* Language + theme live in the utility strip on desktop; inline below lg */}
      <div className={cn("lg:hidden", user && "hidden sm:block")}>
        <LanguageSwitcher />
      </div>
      <div className="hidden sm:block lg:hidden [&_button]:h-9 [&_button]:w-9 [&_button]:rounded-xl">
        <ThemeToggle hideTooltip />
      </div>

      <span className="mx-0.5 hidden h-6 w-px bg-border sm:block" aria-hidden />

      <Button asChild variant="ghost" size="icon" className={iconButtonClass}>
        <Link
          to="/cart"
          aria-label={totalItems > 0 ? `${t("nav.cart")} (${totalItems})` : t("nav.cart")}
        >
          <ShoppingCart className="h-[18px] w-[18px]" aria-hidden />
          {totalItems > 0 && (
            <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-background">
              {totalItems > 9 ? "9+" : totalItems}
            </span>
          )}
        </Link>
      </Button>

      {user && (
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={iconButtonClass}
              aria-label={unread > 0 ? `${t("header.notifications")} (${unread})` : t("header.notifications")}
            >
              <Bell className="h-[18px] w-[18px]" aria-hidden />
              {unread > 0 && (
                <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground ring-2 ring-background">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={10}
            collisionPadding={6}
            className="w-[min(92vw,340px)] overflow-hidden rounded-2xl border-border/70 bg-popover/95 p-0 shadow-xl shadow-black/10 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{t("header.notifications")}</span>
                {unread > 0 && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                    {unread}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 rounded-lg px-2 text-[11px] text-muted-foreground hover:text-primary"
                onClick={markAllRead}
                disabled={unread === 0}
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                {t("header.markAllRead")}
              </Button>
            </div>
            <ScrollArea className="max-h-80">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 px-6 py-10 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                    <Bell className="h-5 w-5 text-muted-foreground" aria-hidden />
                  </span>
                  <p className="text-sm text-muted-foreground">{t("header.noNotifications")}</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((n) => (
                    <li
                      key={n.id}
                      className={cn("group/notif p-3 transition-colors", !n.read_at && "bg-primary/5")}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          className="min-w-0 flex-1 space-y-1 text-start outline-none"
                          onClick={() => openNotification(n)}
                        >
                          <span className="flex items-center gap-1.5">
                            {!n.read_at && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                            )}
                            <span
                              className={cn(
                                "block truncate text-[13px]",
                                !n.read_at ? "font-semibold" : "font-medium",
                                n.link && "group-hover/notif:underline",
                              )}
                            >
                              {n.title}
                            </span>
                          </span>
                          {n.body && (
                            <span className="block text-xs text-muted-foreground line-clamp-2">{n.body}</span>
                          )}
                          <span className="block text-[10px] text-muted-foreground/80">
                            {new Date(n.created_at).toLocaleString(dateLocale, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        </button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 rounded-lg text-muted-foreground/60 transition-opacity hover:text-destructive focus-visible:opacity-100 sm:opacity-0 sm:group-hover/notif:opacity-100"
                          onClick={() => removeOne(n.id)}
                          aria-label={t("header.deleteNotification")}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      )}

      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 gap-1 rounded-xl px-1 text-foreground/80 transition-colors hover:bg-brand-soft hover:text-primary data-[state=open]:bg-brand-soft data-[state=open]:text-primary sm:px-1.5"
              aria-label={t("header.account")}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-[12px] font-bold text-primary-foreground ring-1 ring-primary/25">
                {initial || <User className="h-4 w-4" aria-hidden />}
              </span>
              <ChevronDown
                className="hidden h-3.5 w-3.5 opacity-70 transition-transform duration-300 data-[state=open]:rotate-180 sm:block"
                aria-hidden
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={10}
            collisionPadding={6}
            className="w-64 rounded-2xl border-border/70 bg-popover/95 p-1.5 shadow-xl shadow-black/10 backdrop-blur-xl"
          >
            <DropdownMenuLabel className="px-2.5 pb-2 pt-2">
              <span className="block truncate text-[13px] font-bold text-foreground">
                {displayName || t("header.account")}
              </span>
              {profile?.email && (
                <span className="mt-0.5 block truncate text-[11px] font-normal text-muted-foreground" dir="ltr">
                  {profile.email}
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onSelect={() => navigate("/dashboard")}
              className="gap-2.5 rounded-xl px-2.5 py-2.5 text-[13.5px]"
            >
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" aria-hidden />
              {t("header.dashboard")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => navigate("/dashboard/profile")}
              className="gap-2.5 rounded-xl px-2.5 py-2.5 text-[13.5px]"
            >
              <User className="h-4 w-4 text-muted-foreground" aria-hidden />
              {t("nav.profile")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onSelect={handleSignOut}
              className="gap-2.5 rounded-xl px-2.5 py-2.5 text-[13.5px] text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {t("nav.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="hidden items-center gap-1.5 sm:flex">
          <Button asChild variant="ghost" size="sm" className="hidden h-9 rounded-xl xl:inline-flex">
            <Link to="/auth">{t("nav.signIn")}</Link>
          </Button>
          <Button asChild size="sm" className="h-9 rounded-xl">
            <Link to="/auth">{t("nav.getStarted")}</Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default HeaderActions;