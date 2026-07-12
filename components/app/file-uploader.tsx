"use client";

import { UploadCloud } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/components/app/providers";
import { useToast } from "@/hooks/use-toast";
import { makeId } from "@/lib/utils";

interface FileUploaderProps {
  value?: string | null;
  onChange: (value: string) => void;
  label: string;
}

export function FileUploader({ value, onChange, label }: FileUploaderProps) {
  const { supabase, familyId, usingDemoData } = useAppData();
  const { toast } = useToast();

  async function upload(file: File) {
    if (!supabase || usingDemoData) {
      toast({
        title: "Storage not connected",
        description: "Paste a Supabase Storage URL or external location for local demo mode.",
        variant: "default"
      });
      return;
    }

    const path = `${familyId}/${makeId("doc")}-${file.name}`;
    const { error } = await supabase.storage.from("family-documents").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("family-documents").getPublicUrl(path);
    onChange(data.publicUrl);
    toast({ title: "File uploaded", description: "The document URL was attached.", variant: "success" });
  }

  return (
    <div className="space-y-2">
      <Input value={value ?? ""} placeholder="https://storage.example/document.pdf" onChange={(event) => onChange(event.target.value)} />
      <div className="flex items-center gap-2">
        <Input
          aria-label={`Upload ${label}`}
          type="file"
          className="max-w-sm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button type="button" variant="outline" size="icon" title="Upload through Supabase Storage">
          <UploadCloud className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
