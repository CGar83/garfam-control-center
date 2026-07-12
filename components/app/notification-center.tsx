"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAppData } from "@/components/app/providers";
import { useToast } from "@/hooks/use-toast";
import type { NotificationRecord } from "@/lib/types";
import { formatDateTime, nowIso, titleCase } from "@/lib/utils";

const notificationRoutes: Record<string, string> = {
  tasks: "/tasks",
  events: "/calendar",
  bills: "/bills",
  health_records: "/health",
  communication_notes: "/communication",
  relationship_records: "/relationship",
  activity_ideas: "/activities",
  grocery_items: "/grocery",
  documents: "/documents",
  contacts: "/contacts",
  home_records: "/home",
  vehicle_records: "/vehicles"
};

function routeForNotification(notification: NotificationRecord) {
  const base = notification.entity_type ? notificationRoutes[notification.entity_type] : undefined;
  return base ? `${base}${notification.entity_id ? `?record=${notification.entity_id}` : ""}` : "/dashboard";
}

export function NotificationCenter() {
  const router = useRouter();
  const { data, updateRecord } = useAppData();
  const { toast } = useToast();
  const notifications = [...data.notifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const unread = notifications.filter((notification) => !notification.read_at);

  async function markRead(notification: NotificationRecord) {
    if (!notification.read_at) await updateRecord("notifications", notification.id, { read_at: nowIso() });
  }

  async function markAllRead() {
    await Promise.all(unread.map((notification) => updateRecord("notifications", notification.id, { read_at: nowIso() })));
    toast({ title: "Notifications cleared", variant: "success" });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative" title="Notifications">
          <Bell className="h-4 w-4" />
          {unread.length ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          ) : null}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-3 border-b p-3">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unread.length ? (
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4" />
              Mark read
            </Button>
          ) : null}
        </div>
        <div className="max-h-96 overflow-y-auto p-1">
          {notifications.length ? (
            notifications.slice(0, 10).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="items-start gap-3 p-3"
                onSelect={async (event) => {
                  event.preventDefault();
                  await markRead(notification);
                  router.push(routeForNotification(notification));
                }}
              >
                <span className={notification.read_at ? "mt-1 h-2 w-2 rounded-full bg-muted" : "mt-1 h-2 w-2 rounded-full bg-primary"} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{notification.title}</span>
                  {notification.body ? <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">{notification.body}</span> : null}
                  <span className="mt-2 block text-[11px] uppercase text-muted-foreground">
                    {titleCase(notification.kind)} · {formatDateTime(notification.created_at)}
                  </span>
                </span>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="p-5 text-sm text-muted-foreground">No notifications yet.</div>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/dashboard")} className="justify-center text-sm">
          Open dashboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
