"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAppData } from "@/components/app/providers";
import { useToast } from "@/hooks/use-toast";
import { NOTIFICATION_PREFS_KEY } from "@/lib/constants";
import type { NotificationKind } from "@/lib/types";

type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function notificationsEnabledFor(kind: NotificationKind) {
  const saved = localStorage.getItem(NOTIFICATION_PREFS_KEY);
  if (!saved) return true;

  try {
    const prefs = JSON.parse(saved) as Record<string, boolean>;
    return prefs[kind] !== false;
  } catch {
    return true;
  }
}

export function PwaBoot() {
  const { toast } = useToast();
  const { data, pendingSyncCount } = useAppData();
  const initialNotificationSeen = useRef(false);
  const unreadCount = useMemo(() => data.notifications.filter((notification) => !notification.read_at).length, [data.notifications]);
  const latestUnread = useMemo(
    () =>
      data.notifications
        .filter((notification) => !notification.read_at)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null,
    [data.notifications]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(display-mode: standalone)");

    function applyDisplayMode() {
      const standalone = isStandaloneMode();
      document.documentElement.dataset.displayMode = standalone ? "standalone" : "browser";
      document.documentElement.classList.toggle("is-standalone", standalone);
    }

    applyDisplayMode();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", applyDisplayMode);
      return () => query.removeEventListener("change", applyDisplayMode);
    }

    const legacyQuery = query as MediaQueryList & {
      addListener?: (listener: () => void) => void;
      removeListener?: (listener: () => void) => void;
    };
    legacyQuery.addListener?.(applyDisplayMode);
    return () => legacyQuery.removeListener?.(applyDisplayMode);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let wasOffline = !navigator.onLine;

    function handleOnline() {
      if (wasOffline) {
        toast({ title: "Back online", description: "Family records can sync again.", variant: "success" });
      }
      wasOffline = false;
    }

    function handleOffline() {
      wasOffline = true;
      toast({ title: "Offline mode", description: "Cached screens remain available. Production saves need a connection." });
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    function notifyUpdateReady() {
      toast({ title: "Update ready", description: "Refresh when convenient to use the newest version of Gather." });
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) notifyUpdateReady();

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              notifyUpdateReady();
            }
          });
        });

        window.setInterval(() => registration.update(), 60 * 60 * 1000);
      })
      .catch((error) => {
        console.warn("Service worker registration failed", error);
      });
  }, [toast]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const badgeNavigator = navigator as BadgeNavigator;
    const badgeCount = unreadCount + pendingSyncCount;

    if (badgeCount > 0 && badgeNavigator.setAppBadge) {
      void badgeNavigator.setAppBadge(badgeCount).catch(() => undefined);
    } else if (badgeCount === 0 && badgeNavigator.clearAppBadge) {
      void badgeNavigator.clearAppBadge().catch(() => undefined);
    }
  }, [pendingSyncCount, unreadCount]);

  useEffect(() => {
    if (!initialNotificationSeen.current) {
      initialNotificationSeen.current = true;
      if (latestUnread && typeof window !== "undefined") localStorage.setItem("gather-last-device-notification", latestUnread.id);
      return;
    }

    if (!latestUnread || typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
    if (!notificationsEnabledFor(latestUnread.kind)) return;

    const lastShownId = localStorage.getItem("gather-last-device-notification");
    if (lastShownId === latestUnread.id) return;
    localStorage.setItem("gather-last-device-notification", latestUnread.id);

    const notificationOptions: NotificationOptions = {
      body: latestUnread.body ?? "Open Gather to review the update.",
      icon: "/icons/icon-192.png",
      badge: "/icons/maskable-192.png",
      tag: latestUnread.id
    };

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.ready
        .then((registration) => registration.showNotification(latestUnread.title, notificationOptions))
        .catch(() => {
          if (document.visibilityState !== "visible") new Notification(latestUnread.title, notificationOptions);
        });
    } else if (document.visibilityState !== "visible") {
      new Notification(latestUnread.title, notificationOptions);
    }
  }, [latestUnread]);

  return null;
}
