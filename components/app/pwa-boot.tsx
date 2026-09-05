"use client";

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function PwaBoot() {
  const { toast } = useToast();

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

  return null;
}
