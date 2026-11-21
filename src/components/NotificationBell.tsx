import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, Trash2 } from "lucide-react";
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

interface NotificationBellProps {
  /** Extra classes for the trigger button (sizing/borders per header). */
  className?: string;
}

const NotificationBell = ({ className }: NotificationBellProps) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);

  // Each mounted bell needs its own realtime topic, otherwise two bells on the
  // same page would try to subscribe to the same channel.
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const fetchItems = async () => {
    if (!user) { setItems([]); return; }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data as Notif[] | null) || []);
  };

  useEffect(() => {
    fetchItems();
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetchItems(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, instanceId]);

  if (!user) return null;

  const unread = items.filter((n) => !n.read_at).length;

  const markAllRead = async () => {
    if (unread === 0) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id).is("read_at", null);
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative", className)} aria-label="الإشعارات">
          <Bell className="h-5 w-5" aria-hidden />
          {unread > 0 && (
            <span className="absolute -top-1 -end-1 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8} dir="rtl">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="font-bold">الإشعارات</span>
          <Button size="sm" variant="ghost" onClick={markAllRead} disabled={unread === 0}>
            <Check className="h-4 w-4 ml-1" />
            تحديد الكل كمقروء
          </Button>
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">لا توجد إشعارات</p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id} className={`p-3 text-sm ${!n.read_at ? "bg-primary/5" : ""}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      {n.link ? (
                        <Link to={n.link} onClick={() => markRead(n.id)} className="font-medium hover:underline block truncate">
                          {n.title}
                        </Link>
                      ) : (
                        <div className="font-medium truncate">{n.title}</div>
                      )}
                      {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeOne(n.id)} aria-label="حذف الإشعار">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
