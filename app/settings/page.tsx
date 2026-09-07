"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { CheckCircle2, Download, LogOut, Plus, RotateCcw, ShieldAlert, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuthStatusBadge } from "@/components/app/auth-status-badge";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { MobileAppPreferences } from "@/components/app/mobile-app-preferences";
import { PageHeader } from "@/components/app/page-header";
import { PersonAvatar } from "@/components/app/person-avatar";
import { useAppData } from "@/components/app/providers";
import { useFamily } from "@/hooks/use-family";
import { useFamilyMembers } from "@/hooks/use-family-members";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { accessSections } from "@/lib/access-control";
import { NOTIFICATION_PREFS_KEY, ONBOARDING_KEY } from "@/lib/constants";
import { getMemberAgeLabel, isChildMember } from "@/lib/family-members";
import { moduleList } from "@/lib/modules";
import { notificationKinds, roleOptions } from "@/lib/options";
import { familyMemberSchema, familySchema } from "@/lib/schemas";
import type { AccessSection, FamilyMember, MemberColor } from "@/lib/types";
import { memberColorOrder, memberPalettes, nextAvailableColor } from "@/lib/member-colors";
import { titleCase } from "@/lib/utils";

type MemberValues = {
  display_name: string;
  role: "admin" | "parent" | "viewer";
  phone?: string | null;
  email?: string | null;
  relationship?: string | null;
  avatar_url?: string | null;
  birthdate?: string | null;
  age_label?: string | null;
  blocked_sections?: AccessSection[];
  color?: MemberColor | null;
};

export default function SettingsPage() {
  const { family, updateFamilyName, createWorkspace, restoreStarterData, currentUser, currentMember, usingLocalData, supabaseConfigured } = useFamily();
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
  const isSignedIn = supabaseConfigured && !usingLocalData;
  const showWorkspaceControls = !supabaseConfigured || isSignedIn;
  const canManageMembers = showWorkspaceControls && currentMember?.role === "admin";
  const authStatusTitle = !supabaseConfigured ? "Local workspace" : usingLocalData ? "Sign in required" : "Logged in";
  const authStatusDescription = !supabaseConfigured
    ? "This browser is using a local-only workspace. Add Supabase environment variables locally or use the deployed site for cloud sync."
    : usingLocalData
      ? "Sign in to load your private family workspace. If you just created an account, confirm the email first."
      : `Signed in as ${currentUser.email}. Changes are saved to Supabase.`;
  const pageDescription = showWorkspaceControls
    ? "Workspace profile, members, roles, preferences, privacy, export, theme, and account controls."
    : "Sign in to manage your private family workspace.";

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
      avatar_url: "",
      birthdate: "",
      age_label: "",
      blocked_sections: [],
      color: null
    }
  });

  useEffect(() => {
    familyForm.reset({ name: family?.name ?? "" });
  }, [family?.name, familyForm]);

  useEffect(() => {
    const saved = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Record<string, boolean>;
      setNotificationPrefs((current) => ({ ...current, ...parsed }));
    } catch {
      localStorage.removeItem(NOTIFICATION_PREFS_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(notificationPrefs));
  }, [notificationPrefs]);

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "family-control-center-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function setMemberSectionRestriction(member: FamilyMember, section: AccessSection, restricted: boolean) {
    if (!canManageMembers) return;
    const nextSections = new Set(member.blocked_sections ?? []);
    if (restricted) {
      nextSections.add(section);
    } else {
      nextSections.delete(section);
    }

    await updateRecord("family_members", member.id, { blocked_sections: Array.from(nextSections) });
    toast({ title: "Access updated", description: `${member.display_name}'s viewing access was saved.`, variant: "success" });
  }

  return (
    <div className="app-page">
      <PageHeader title="Settings" description={pageDescription} />

      <div className="grid-auto-fit-lg">
        {showWorkspaceControls ? (
          <Card>
            <CardHeader>
              <CardTitle>Family Profile</CardTitle>
              <CardDescription>Current workspace: {family?.name ?? "None"}</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={familyForm.handleSubmit(async (values) => {
                  if (!canManageMembers) return;
                  await updateFamilyName(values.name);
                  toast({ title: "Family profile saved", variant: "success" });
                })}
              >
                <label className="text-sm font-medium" htmlFor="family-name">
                  Family name
                </label>
                <Input id="family-name" disabled={!canManageMembers} {...familyForm.register("name")} />
                {familyForm.formState.errors.name?.message ? (
                  <p className="text-xs text-destructive">{familyForm.formState.errors.name.message}</p>
                ) : null}
                <div className="app-toolbar">
                  <Button type="submit" disabled={!canManageMembers}>
                    Save Family
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canManageMembers}
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
        ) : null}

        <Card className={!showWorkspaceControls ? "xl:col-span-2" : undefined}>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle>Authentication</CardTitle>
                <CardDescription>{supabaseConfigured ? "Secure email/password access is configured." : "Local workspace mode is active."}</CardDescription>
              </div>
              <AuthStatusBadge />
            </div>
          </CardHeader>
          <CardContent>
            {isSignedIn ? (
              <div className="rounded-md border border-[#ACE1AF] bg-[#ACE1AF]/25 p-4 dark:border-[#ACE1AF]/45 dark:bg-[#ACE1AF]/15">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#ACE1AF] text-[#22552d]">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#22552d] dark:text-[#D7F2D9]">{authStatusTitle}</p>
                      <p className="text-wrap-safe mt-1 text-sm text-[#22552d]/80 dark:text-[#D7F2D9]/80">{authStatusDescription}</p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" className="shrink-0" onClick={signOut}>
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
                            : result.status === "local"
                              ? "Local workspace"
                              : authMode === "signin"
                                ? "Signed in"
                                : "Account created",
                        description: result.message,
                        variant: result.status === "local" ? undefined : "success"
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
                  {usingLocalData ? (
                    <p className="text-xs text-muted-foreground">
                      {supabaseConfigured
                        ? "Sign in to save changes to your private cloud workspace."
                        : "Local workspace data is stored in this browser until Supabase is connected."}
                    </p>
                  ) : null}
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {showWorkspaceControls ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Family Members and Access</CardTitle>
              <CardDescription>Add adults, children, and teens. Email is optional unless the person needs their own login.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {canManageMembers ? (
                <form
                  className="grid-auto-fit-sm"
                  onSubmit={memberForm.handleSubmit(async (values) => {
                    if (!canManageMembers) return;
                    const blocked_sections = values.role === "viewer" ? accessSections.map((section) => section.key) : [];
                    const color = values.color ?? nextAvailableColor(members);
                    await createRecord("family_members", { ...values, color, blocked_sections, user_id: null });
                    memberForm.reset({
                      display_name: "",
                      role: "viewer",
                      phone: "",
                      email: "",
                      relationship: "",
                      avatar_url: "",
                      birthdate: "",
                      age_label: "",
                      blocked_sections: [],
                      color: null
                    });
                    toast({ title: "Family member added", variant: "success" });
                  })}
                >
                  <div>
                    <label htmlFor="member-display-name" className="text-xs font-medium text-muted-foreground">
                      Name
                    </label>
                    <Input id="member-display-name" className="mt-1" placeholder="Display name" {...memberForm.register("display_name")} />
                  </div>
                  <div>
                    <label htmlFor="member-relationship" className="text-xs font-medium text-muted-foreground">
                      Relationship
                    </label>
                    <Input id="member-relationship" className="mt-1" placeholder="Son, daughter, parent, caregiver" {...memberForm.register("relationship")} />
                  </div>
                  <div>
                    <label htmlFor="member-birthdate" className="text-xs font-medium text-muted-foreground">
                      Birthdate
                    </label>
                    <Input id="member-birthdate" className="mt-1" type="date" {...memberForm.register("birthdate")} />
                  </div>
                  <div>
                    <label htmlFor="member-age-label" className="text-xs font-medium text-muted-foreground">
                      Age label
                    </label>
                    <Input id="member-age-label" className="mt-1" placeholder="9, teen, adult" {...memberForm.register("age_label")} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Role</label>
                    <Controller
                      control={memberForm.control}
                      name="role"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="mt-1">
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
                  </div>
                  <div>
                    <label htmlFor="member-email" className="text-xs font-medium text-muted-foreground">
                      Email for login
                    </label>
                    <Input id="member-email" className="mt-1" placeholder="Optional for children" {...memberForm.register("email")} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Color</label>
                    <Controller
                      control={memberForm.control}
                      name="color"
                      render={({ field }) => (
                        <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label="Member color">
                          {memberColorOrder.map((color) => {
                            const palette = memberPalettes[color];
                            const active = field.value === color;
                            return (
                              <button
                                key={color}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                aria-label={palette.label}
                                title={palette.label}
                                onClick={() => field.onChange(active ? null : color)}
                                className={`h-9 w-9 rounded-full border-2 transition-all focus-ring ${active ? "scale-110 border-foreground" : "border-transparent"}`}
                                style={{ backgroundColor: palette.solid }}
                              />
                            );
                          })}
                        </div>
                      )}
                    />
                  </div>
                  <Button type="submit" className="h-11 w-full self-end sm:w-auto">
                    <Plus className="h-4 w-4" />
                    Add Member
                  </Button>
                </form>
              ) : (
                <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
                  Only workspace admins can add family members or change viewing access.
                </div>
              )}
              {memberForm.formState.errors.display_name?.message ? (
                <p className="text-xs text-destructive">{memberForm.formState.errors.display_name.message}</p>
              ) : null}
              {memberForm.formState.errors.email?.message ? (
                <p className="text-xs text-destructive">{memberForm.formState.errors.email.message}</p>
              ) : null}
              {memberForm.formState.errors.birthdate?.message ? (
                <p className="text-xs text-destructive">{memberForm.formState.errors.birthdate.message}</p>
              ) : null}
              <div className="grid gap-2">
                {members.map((member) => {
                  const childProfile = isChildMember(member);
                  const restrictedSections = member.blocked_sections ?? [];

                  return (
                    <div key={member.id} className="record-tile">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <PersonAvatar personId={member.id} />
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="outline">{titleCase(member.role)}</Badge>
                            {childProfile ? <Badge variant="secondary">Child profile</Badge> : <Badge variant="info">Adult profile</Badge>}
                            <Badge variant="outline">Age {getMemberAgeLabel(member)}</Badge>
                            {member.email ? <Badge variant="outline">Login email</Badge> : <Badge variant="secondary">No login email</Badge>}
                          </div>
                          {canManageMembers ? (
                            <div className="mt-3 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={`${member.display_name} color`}>
                              {memberColorOrder.map((color) => {
                                const palette = memberPalettes[color];
                                const active = member.color === color;
                                return (
                                  <button
                                    key={color}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    aria-label={palette.label}
                                    title={palette.label}
                                    onClick={() => updateRecord("family_members", member.id, { color })}
                                    className={`h-6 w-6 rounded-full border-2 transition-all focus-ring ${active ? "scale-110 border-foreground" : "border-transparent opacity-80 hover:opacity-100"}`}
                                    style={{ backgroundColor: palette.solid }}
                                  />
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                        <div className="app-toolbar md:justify-end">
                          <Select
                            value={member.role}
                            disabled={!canManageMembers}
                            onValueChange={(role) => updateRecord("family_members", member.id, { role: role as never })}
                          >
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
                          {canManageMembers ? (
                            <Button variant="ghost" size="icon" onClick={() => setDeleteMemberId(member.id)} title="Delete member">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete member</span>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      {member.role === "viewer" ? (
                        <div className="mt-4">
                          <p className="text-xs font-medium uppercase text-muted-foreground">Restricted viewer areas</p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            {accessSections.map((section) => (
                              <label key={section.key} className="record-tile flex min-h-12 items-center justify-between gap-3 px-3 py-2 text-sm">
                                <span className="min-w-0">
                                  <span className="block font-medium">{section.label}</span>
                                  <span className="line-clamp-1 text-xs text-muted-foreground">{section.description}</span>
                                </span>
                                <Checkbox
                                  checked={restrictedSections.includes(section.key)}
                                  disabled={!canManageMembers}
                                  onCheckedChange={(checked) => setMemberSectionRestriction(member, section.key, Boolean(checked))}
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-md border border-[#ACE1AF]/70 bg-[#ACE1AF]/20 p-3 text-sm text-[#22552d] dark:border-[#ACE1AF]/45 dark:text-[#D7F2D9]">
                          Admin and Parent roles have full workspace access.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid-auto-fit-lg">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Privacy, theme, and notification structure.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="record-tile flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">Privacy mode</span>
                    <span className="block text-xs text-muted-foreground">Financial, health, account, and emergency details are hidden.</span>
                  </span>
                  <Checkbox checked={privacyMode} onCheckedChange={(checked) => setPrivacyMode(Boolean(checked))} />
                </label>
                <label className="record-tile flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">Dark mode</span>
                    <span className="block text-xs text-muted-foreground">Switches the app theme.</span>
                  </span>
                  <Checkbox checked={theme === "dark"} onCheckedChange={(checked) => setTheme(Boolean(checked) ? "dark" : "light")} />
                </label>
                <div className="grid-auto-fit-sm">
                  {notificationKinds.map((kind) => (
                    <label key={kind} className="record-tile flex items-center gap-2 text-sm">
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
                <CardTitle>Mobile App</CardTitle>
                <CardDescription>Installed app state, offline queue, and device alert permissions.</CardDescription>
              </CardHeader>
              <CardContent>
                <MobileAppPreferences />
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

          {canManageMembers ? (
            <div className="grid-auto-fit-lg">
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
                <CardDescription>Restore or clear the local workspace.</CardDescription>
              </CardHeader>
              <CardContent className="app-toolbar">
                <Button variant="outline" onClick={() => setResetOpen(true)}>
                  <RotateCcw className="h-4 w-4" />
                  Restore Sample Family
                </Button>
                {usingLocalData ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      localStorage.removeItem(ONBOARDING_KEY);
                      window.location.assign("/welcome");
                    }}
                  >
                    Run setup again
                  </Button>
                ) : null}
                <Button variant="destructive" onClick={() => setDeleteWorkspaceOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                  Delete Workspace
                </Button>
              </CardContent>
            </Card>
            </div>
          ) : null}
        </>
      ) : null}

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
        title="Restore starter workspace?"
        description="This replaces the local workspace with the original starter records."
        confirmLabel="Restore"
        onConfirm={() => {
          restoreStarterData();
          toast({ title: "Starter workspace restored", variant: "success" });
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
