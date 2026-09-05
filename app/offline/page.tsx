"use client";

import { RefreshCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <div className="app-page flex min-h-[calc(100vh-8rem)] max-w-xl justify-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#ACE1AF]/35 text-[#235226]">
              <WifiOff className="h-5 w-5" />
            </span>
            Offline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Gather could not reach the network.</p>
          <p>Reconnect and refresh to continue syncing family records. Cached screens may still be available from the app navigation.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
