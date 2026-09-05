"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { CheckCircle2, Download, LogOut, Plus, RotateCcw, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuthStatusBadge } from "@/components/app/auth-status-badge";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { PageHeader } from "@/components/app/page-header";
import { PersonAvatar } from "@/components/app/person-avatar";
import { useAppData } from "@/components/app/providers";
import { useFamily } from "@/hooks/use-family";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { moduleList } from "@/lib/modules";
import { notificationKinds, roleOptions } from "@/lib/options";
import { familyMemberSchema, familySchema } from "@/lib/schemas";
import { titleCase } from "@/lib/utils";

type MemberValues = {
  display_name: string;
  role: "admin" | "parent" | "viewer";
  phone?: string | null;
  email?: string | null;
  relationship?: string | null;
  avatar_url?: string | null;
};

export default function SettingsPage() {
  const { family, updateFamilyName, createWorkspace, resetDemoData, currentUser, usingDemoData, supabaseConfigured } = useFamily();
  const { data, createRecord, updateRecord, deleteRecord, signIn, signUp, signOut } = useAppData();
  const { members } = useFamilyMembers();
  const { privacyMode, setPrivacyMode } = usePrivacyMode();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [deleteMemberId, setDeleteMemberId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteWorkspaceOpen, setDeleteWorkspaceOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState(currentUser.email);
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState(currentUser.display_name);
  const [notificationPrefs, setNotificationPrefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(notificationKinds.map((kind) => [kind, true]))
  );
  const isSignedIn = supabaseConfigured && !usingDemoData;
  const authStatusTitle = !supabaseConfigured ? "Local demo mode" : usingDemoData ? "Supabase ready, signed out" : "Logged in";
  const authStatusDescription = !supabaseConfigured
    ? "This browser is using local demo data. Netlify environment variables do not apply to localhost."
    : usingDemoData
      ? "Sign in to load your private family workspace from Supabase. If you just created an account, confirm the email first."
      : `Signed in as ${currentUser.email}. Changes are saved to Supabase.`;

  const familyForm = useForm<{ name: string }>({
    resolver: zodResolver(familySchema),
    defaultValues: { name: family?.name ?? "" }
  });
  const memberForm = useForm<MemberValues>({
    resolver: zodResolver(familyMemberSchema),
    defaultValues: {
      display_name: "",
      role: "viewer",
      phone: "",
      email: "",
      relationship: "",
      avatar_url: ""
    }
  });

  useEffect(() => {
    familyForm.reset({ name: family?.name ?? "" });
  }, [family?.name, familyForm]);

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "family-control-center-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Workspace profile, members, roles, preferences, privacy, export, theme, and account controls." />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Family Profile</CardTitle>
            <CardDescription>Current workspace: {family?.name ?? "None"}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={familyForm.handleSubmit(async (values) => {
                await updateFamilyName(values.name);
                toast({ title: "Family profile saved", variant: "success" });
              })}
            >
              <label className="text-sm font-medium" htmlFor="family-name">
                Family name
              </label>
              <Input id="family-name" {...familyForm.register("name")} />
              {familyForm.formState.errors.name?.message ? (
                <p className="text-xs text-destructive">{familyForm.formState.errors.name.message}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="submit">Save Family</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await createWorkspace("New Family Workspace");
                    toast({ title: "Workspace created", variant: "success" });
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Create Workspace
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>{supabaseConfigured ? "Supabase email/password auth is configured." : "Local demo mode is active."}</CardDescription>
              </div>
              <AuthStatusBadge />
            </div>
          </CardHeader>
          <CardContent>
            {isSignedIn ? (
              <div className="rounded-md border border-[#ACE1AF] bg-[#ACE1AF]/25 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#ACE1AF] text-[#22552d]">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#22552d]">{authStatusTitle}</p>
                      <p className="mt-1 text-sm text-[#22552d]/80">{authStatusDescription}</p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={signOut}>
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 rounded-md border bg-muted/40 p-3 text-sm">
                  <p className="font-medium">{authStatusTitle}</p>
                  <p className="mt-1 text-muted-foreground">{authStatusDescription}</p>
                </div>
                <form
                  className="grid gap-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    try {
                      const result = authMode === "signin" ? await signIn(authEmail, authPassword) : await signUp(authEmail, authPassword, authName);
                      toast({
                        title:
                          result.status === "confirmation_required"
                            ? "Confirm your email"
                            : result.status === "demo"
                              ? "Demo mode"
                              : authMode === "signin"
                                ? "Signed in"
                                : "Account created",
                        description: result.message,
                        variant: result.status === "demo" ? undefined : "success"
                      });
                      setAuthPassword("");
                    } catch (error) {
                      toast({ title: "Auth failed", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
                    }
                  }}
                >
                  <div className="flex gap-2">
                    <Button type="button" variant={authMode === "signin" ? "default" : "outline"} onClick={() => setAuthMode("signin")}>
                      Sign In
                    </Button>
                    <Button type="button" variant={authMode === "signup" ? "default" : "outline"} onClick={() => setAuthMode("signup")}>
                      Sign Up
                    </Button>
                  </div>
                  {authMode === "signup" ? (
                    <Input aria-label="Display name" value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="Display name" />
                  ) : null}
                  <Input aria-label="Email" type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="Email" />
                  <Input aria-label="Password" type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Password" />
                  <Button type="submit">{authMode === "signin" ? "Sign In" : "Create Account"}</Button>
                  {usingDemoData ? (
                    <p className="text-xs text-muted-foreground">
                      {supabaseConfigured
                        ? "Demo data is visible while signed out. Sign in to save to Supabase."
                        : "Demo data is stored in this browser until Supabase is connected."}
                    </p>
                  ) : null}
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members and Roles</CardTitle>
          <CardDescription>Admin, Parent, and Viewer role assignments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form
            className="grid gap-3 md:grid-cols-6"
            onSubmit={memberForm.handleSubmit(async (values) => {
              await createRecord("family_members", { ...values, user_id: null });
              memberForm.reset({ display_name: "", role: "viewer", phone: "", email: "", relationship: "", avatar_url: "" });
              toast({ title: "Family member added", variant: "success" });
            })}
          >
            <Input className="md:col-span-2" placeholder="Display name" {...memberForm.register("display_name")} />
            <Controller
              control={memberForm.control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {titleCase(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Input placeholder="Relationship" {...memberForm.register("relationship")} />
            <Input placeholder="Email" {...memberForm.register("email")} />
            <Button type="submit">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>
          {memberForm.formState.errors.display_name?.message ? (
            <p className="text-xs text-destructive">{memberForm.formState.errors.display_name.message}</p>
          ) : null}
          <div className="grid gap-2">
            {members.map((member) => (
              <div key={member.id} className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
                <PersonAvatar personId={member.id} />
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={member.role} onValueChange={(role) => updateRecord("family_members", member.id, { role: role as never })}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {titleCase(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteMemberId(member.id)} title="Delete member">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete member</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Privacy, theme, and notification structure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between gap-3 rounded-md border p-3">
              <span>
                <span className="block text-sm font-medium">Privacy mode</span>
                <span className="block text-xs text-muted-foreground">Financial, health, account, and emergency details are hidden.</span>
              </span>
              <Checkbox checked={privacyMode} onCheckedChange={(checked) => setPrivacyMode(Boolean(checked))} />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-md border p-3">
              <span>
                <span className="block text-sm font-medium">Dark mode</span>
                <span className="block text-xs text-muted-foreground">Switches the app theme.</span>
              </span>
              <Checkbox checked={theme === "dark"} onCheckedChange={(checked) => setTheme(Boolean(checked) ? "dark" : "light")} />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {notificationKinds.map((kind) => (
                <label key={kind} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                  <Checkbox
                    checked={notificationPrefs[kind]}
                    onCheckedChange={(checked) => setNotificationPrefs((current) => ({ ...current, [kind]: Boolean(checked) }))}
                  />
                  {titleCase(kind)}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>Current category sets used by forms and filters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {moduleList
              .filter((module) => module.categoryOptions)
              .slice(0, 8)
              .map((module) => (
                <div key={module.key}>
                  <p className="text-sm font-medium">{module.title}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {module.categoryOptions?.slice(0, 8).map((category) => (
                      <span key={category} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Data Export</CardTitle>
            <CardDescription>Export the current workspace data as JSON.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportData}>
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Reset or clear the local workspace.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setResetOpen(true)}>
              <RotateCcw className="h-4 w-4" />
              Reset Demo Data
            </Button>
            <Button variant="destructive" onClick={() => setDeleteWorkspaceOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete Workspace
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(deleteMemberId)}
        onOpenChange={(open) => !open && setDeleteMemberId(null)}
        title="Delete this member?"
        description="Their assigned records remain, but the member profile is removed."
        onConfirm={async () => {
          if (!deleteMemberId) return;
          await deleteRecord("family_members", deleteMemberId);
          toast({ title: "Member deleted", variant: "success" });
        }}
      />
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset demo data?"
        description="This replaces local demo data with the original sample family records."
        confirmLabel="Reset"
        onConfirm={() => {
          resetDemoData();
          toast({ title: "Demo data reset", variant: "success" });
        }}
      />
      <ConfirmDialog
        open={deleteWorkspaceOpen}
        onOpenChange={setDeleteWorkspaceOpen}
        title="Delete local workspace?"
        description="This clears local browser data and starts a new empty workspace."
        confirmLabel="Delete Workspace"
        onConfirm={async () => {
          await createWorkspace("New Family Workspace");
          toast({ title: "Workspace cleared", variant: "success" });
        }}
      />
    </div>
  );
}
