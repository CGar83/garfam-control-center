"use client";

import { Suspense } from "react";
import { ListsHub } from "@/components/lists/lists-hub";

export default function ListsPage() {
  return (
    <Suspense fallback={<div className="app-page" aria-busy="true" />}>
      <ListsHub />
    </Suspense>
  );
}
