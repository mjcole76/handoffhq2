"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BadgeCheck, Building2, CheckCircle2, CircleDollarSign, Clock3, Copy, FileText, FileUp, ImagePlus, Link2, Loader2, LogOut, Palette, Plus, RefreshCw, UploadCloud, UsersRound } from "lucide-react";
import { formatSupabaseError, generateAccessCode, isSupabaseConfigured, publicUrl, slugify, supabase, uid } from "@/lib/supabase";
import type { Approval, ClientPortal, Invoice, Milestone, PortalFile, ProviderProfile, Update } from "@/lib/types";

type Related = {
  files: PortalFile[];
  milestones: Milestone[];
  approvals: Approval[];
  invoices: Invoice[];
  updates: Update[];
};

const emptyRelated: Related = { files: [], milestones: [], approvals: [], invoices: [], updates: [] };

export default function DashboardPage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [clients, setClients] = useState<ClientPortal[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [related, setRelated] = useState<Related>(emptyRelated);
  const [notice, setNotice] = useState("");

  const selectedClient = clients.find((client) => client.id === selectedId) || clients[0] || null;
  const brandColor = profile?.brand_color || "#22d3ee";

  const stats = useMemo(() => {
    const activeProjects = clients.filter((client) => client.project_status.toLowerCase() !== "complete").length;
    const pendingApprovals = related.approvals.filter((approval) => approval.status === "pending").length;
    const outstandingInvoices = related.invoices.filter((invoice) => invoice.status === "unpaid").reduce((sum, invoice) => sum + Number(invoice.amount), 0);
    return { totalClients: clients.length, activeProjects, pendingApprovals, outstandingInvoices };
  }, [clients, related]);

  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedClient) void loadRelated(selectedClient.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient?.id]);

  async function bootstrap() {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setNotice("Supabase is not configured yet. Add env vars to use the live app.");
      return;
    }
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError) {
      setNotice(formatSupabaseError("Loading session", userError));
      setLoading(false);
      return;
    }
    if (!data.user) {
      router.push("/login");
      return;
    }
    setUserId(data.user.id);
    setEmail(data.user.email || "");
    const { error: upsertError } = await supabase.from("users").upsert({ id: data.user.id, email: data.user.email });
    if (upsertError) setNotice(formatSupabaseError("Creating provider profile", upsertError));
    const { data: profileData, error: profileError } = await supabase.from("users").select("*").eq("id", data.user.id).single();
    if (profileError) setNotice(formatSupabaseError("Loading provider profile", profileError));
    setProfile(profileData as ProviderProfile);
    await loadClients(data.user.id);
    setLoading(false);
  }

  async function loadClients(providerId = userId) {
    const { data, error } = await supabase.from("clients").select("*").eq("provider_id", providerId).order("created_at", { ascending: false });
    if (error) {
      setNotice(formatSupabaseError("Loading clients", error));
      return;
    }
    const list = (data || []) as ClientPortal[];
    setClients(list);
    if (!selectedId && list[0]) setSelectedId(list[0].id);
  }

  async function loadRelated(clientId: string) {
    const [files, milestones, approvals, invoices, updates] = await Promise.all([
      supabase.from("files").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("milestones").select("*").eq("client_id", clientId).order("created_at", { ascending: true }),
      supabase.from("approvals").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("updates").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
    ]);
    const relatedErrors = [files.error, milestones.error, approvals.error, invoices.error, updates.error].filter(Boolean);
    if (relatedErrors.length) setNotice(formatSupabaseError("Loading selected client details", relatedErrors[0]));
    setRelated({
      files: (files.data || []) as PortalFile[],
      milestones: (milestones.data || []) as Milestone[],
      approvals: (approvals.data || []) as Approval[],
      invoices: (invoices.data || []) as Invoice[],
      updates: (updates.data || []) as Update[],
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    let logoUrl = profile?.logo_url || null;
    const logo = logoInput.current?.files?.[0];
    if (logo) {
      const path = `${userId}/brand/${uid()}-${logo.name}`;
      const { error } = await supabase.storage.from("handoff-files").upload(path, logo, { upsert: true });
      if (error) {
        setNotice(formatSupabaseError("Uploading logo", error));
        setSaving(false);
        return;
      }
      logoUrl = publicUrl(path);
    }
    const payload = {
      id: userId,
      email,
      business_name: String(form.get("business_name") || ""),
      brand_color: String(form.get("brand_color") || "#22d3ee"),
      logo_url: logoUrl,
    };
    const { data, error } = await supabase.from("users").upsert(payload).select("*").single();
    if (!error) setProfile(data as ProviderProfile);
    setNotice(error ? formatSupabaseError("Saving brand settings", error) : "Brand settings saved.");
    setSaving(false);
  }

  async function createClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "");
    const projectName = String(form.get("project_name") || "");
    const baseSlug = slugify(`${profile?.business_name || "handoff"}-${name}-${projectName}`);
    const payload = {
      provider_id: userId,
      name,
      email: String(form.get("email") || ""),
      company: String(form.get("company") || ""),
      project_name: projectName,
      project_status: String(form.get("project_status") || "Active"),
      slug: `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`,
      access_code: generateAccessCode(),
    };
    const { data, error } = await supabase.from("clients").insert(payload).select("*").single();
    if (error) setNotice(formatSupabaseError("Creating client portal", error));
    if (data) {
      setClients((current) => [data as ClientPortal, ...current]);
      setSelectedId(data.id);
      (event.target as HTMLFormElement).reset();
      setNotice("Client portal created. Copy the portal link and access code before sending it to your client.");
    }
    setSaving(false);
  }

  async function addRow(table: "milestones" | "approvals" | "invoices" | "updates", event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClient || !userId) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const base = { provider_id: userId, client_id: selectedClient.id };
    const payloadByTable = {
      milestones: { ...base, title: form.get("title"), description: form.get("description"), status: form.get("status"), due_date: form.get("due_date") || null },
      approvals: { ...base, title: form.get("title"), description: form.get("description"), status: "pending" },
      invoices: { ...base, title: form.get("title"), amount: Number(form.get("amount") || 0), payment_url: form.get("payment_url"), status: "unpaid" },
      updates: { ...base, title: form.get("title"), body: form.get("body") },
    };
    const { error } = await supabase.from(table).insert(payloadByTable[table] as never);
    if (error) {
      setNotice(formatSupabaseError(`Adding ${table.slice(0, -1)}`, error));
      setSaving(false);
      return;
    }
    setNotice(`${table.slice(0, -1)} added.`);
    (event.target as HTMLFormElement).reset();
    await loadRelated(selectedClient.id);
    setSaving(false);
  }

  async function uploadDeliverable() {
    if (!selectedClient || !userId) return;
    const upload = fileInput.current?.files?.[0];
    if (!upload) return setNotice("Choose a file first.");
    setSaving(true);
    const path = `${userId}/${selectedClient.id}/deliverables/${uid()}-${upload.name}`;
    const { error: uploadError } = await supabase.storage.from("handoff-files").upload(path, upload, { upsert: true });
    if (uploadError) {
      setNotice(formatSupabaseError("Uploading deliverable", uploadError));
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("files").insert({
      provider_id: userId,
      client_id: selectedClient.id,
      title: upload.name,
      file_path: path,
      file_type: "deliverable",
      uploaded_by: "provider",
    });
    if (fileInput.current) fileInput.current.value = "";
    setNotice(error ? formatSupabaseError("Saving deliverable record", error) : "Deliverable uploaded.");
    await loadRelated(selectedClient.id);
    setSaving(false);
  }

  function portalUrl(slug: string) {
    if (typeof window === "undefined") return `/portal/${slug}`;
    return `${window.location.origin}/portal/${slug}`;
  }

  async function copyPortalLink(slug: string) {
    await navigator.clipboard.writeText(portalUrl(slug));
    setNotice("Portal link copied.");
  }

  async function copyPortalAccess(client: ClientPortal) {
    await navigator.clipboard.writeText(`Portal: ${portalUrl(client.slug)}\nAccess code: ${client.access_code || "Not set"}`);
    setNotice("Portal link and access code copied.");
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-cyan" size={34} /></main>;
  }

  return (
    <main className="min-h-screen px-4 py-5 lg:px-6">
      <div className="mx-auto max-w-[1480px]">
        <header className="mb-5 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/[.04] p-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3 font-black tracking-[-0.04em]">
            <span className="grid h-11 w-11 place-items-center rounded-2xl text-navy shadow-glow" style={{ background: brandColor }}>HQ</span>
            <span>HandOffHQ</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge">Provider dashboard</span>
            <button onClick={() => void bootstrap()} className="btn-secondary"><RefreshCw size={16} /> Refresh</button>
            <button onClick={() => void signOut()} className="btn-secondary btn-danger"><LogOut size={16} /> Sign out</button>
          </div>
        </header>

        {notice && <div className="mb-5 rounded-2xl border border-cyan/20 bg-cyan/10 p-4 text-sm text-cyan-50">{notice}</div>}

        {!isSupabaseConfigured && (
          <div className="glass mb-5 rounded-[28px] p-5">
            <h2 className="text-xl font-black">Supabase setup required</h2>
            <p className="mt-2 text-slate-300">Add env vars from `.env.example`, run `supabase/schema.sql`, then reload.</p>
          </div>
        )}

        <section className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="order-2 space-y-5 xl:order-1 xl:sticky xl:top-5 xl:self-start">
            <div className="glass rounded-[28px] p-4">
              <p className="mb-3 px-2 text-xs font-black uppercase tracking-[.18em] text-slate-500">Workspace</p>
              <nav className="grid gap-2 text-sm font-black text-slate-200">
                <a className="rounded-2xl border border-cyan/20 bg-cyan/10 px-4 py-3 text-cyan-50" href="#dashboard-overview">Dashboard overview</a>
                <a className="rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 hover:border-cyan/30" href="#clients">Clients</a>
                <a className="rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 hover:border-cyan/30" href="#brand-setup">Brand setup</a>
                <a className="rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 hover:border-cyan/30" href="#create-portal">Create portal</a>
              </nav>
            </div>

            <form id="brand-setup" onSubmit={saveProfile} className="glass rounded-[28px] p-5">
              <div className="mb-4 flex items-center gap-3"><Palette className="text-cyan" /><h2 className="text-xl font-black tracking-[-0.04em]">Brand setup</h2></div>
              <label className="mb-3 block text-sm font-bold text-slate-300">Business name
                <input className="input mt-2" name="business_name" defaultValue={profile?.business_name || ""} placeholder="Northstar Studio" />
              </label>
              <label className="mb-3 block text-sm font-bold text-slate-300">Logo upload
                <input ref={logoInput} className="input mt-2" type="file" accept="image/*" />
              </label>
              <label className="mb-4 block text-sm font-bold text-slate-300">Brand color
                <input className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-transparent" name="brand_color" type="color" defaultValue={brandColor} />
              </label>
              <button className="btn-primary w-full" disabled={saving}><ImagePlus size={17} /> Save branding</button>
            </form>

            <form id="create-portal" onSubmit={createClient} className="glass rounded-[28px] p-5">
              <div className="mb-4 flex items-center gap-3"><Plus className="text-lime" /><h2 className="text-xl font-black tracking-[-0.04em]">Create portal</h2></div>
              <div className="space-y-3">
                <input className="input" name="name" required placeholder="Client name" />
                <input className="input" name="email" type="email" placeholder="client@email.com" />
                <input className="input" name="company" placeholder="Company" />
                <input className="input" name="project_name" required placeholder="Project name" />
                <select className="input" name="project_status" defaultValue="Active">
                  <option>Active</option><option>Review</option><option>Complete</option><option>Paused</option>
                </select>
              </div>
              <button className="btn-primary mt-4 w-full" disabled={saving}><Link2 size={17} /> Create client portal</button>
            </form>
          </aside>

          <section id="dashboard-overview" className="order-1 space-y-5 xl:order-2">
            <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
              <Stat icon={<UsersRound />} label="Total clients" value={stats.totalClients.toString()} />
              <Stat icon={<Building2 />} label="Active projects" value={stats.activeProjects.toString()} />
              <Stat icon={<BadgeCheck />} label="Pending approvals" value={stats.pendingApprovals.toString()} />
              <Stat icon={<CircleDollarSign />} label="Outstanding invoices" value={`$${stats.outstandingInvoices.toFixed(0)}`} />
            </div>

            <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]">
              <div id="clients" className="glass rounded-[28px] p-4 sm:p-5 lg:sticky lg:top-5 lg:self-start">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.18em] text-cyan">Client queue</p>
                    <h2 className="mt-1 text-xl font-black tracking-[-0.04em]">Clients</h2>
                  </div>
                  <a href="#create-portal" className="rounded-2xl border border-white/10 bg-white/[.05] px-3 py-2 text-xs font-black text-slate-200 xl:hidden">Add</a>
                </div>
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1 scrollbar-thin lg:max-h-[calc(100vh-230px)]">
                  {clients.length === 0 && <Empty title="No client portals yet" body="Create one portal to give a client a clean link for files, approvals, updates, and invoices." />}
                  {clients.map((client) => (
                    <button key={client.id} onClick={() => setSelectedId(client.id)} className={`card-hover w-full rounded-3xl border p-4 text-left ${selectedClient?.id === client.id ? "border-cyan/50 bg-cyan/10" : "border-white/10 bg-white/[.035]"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div><h3 className="font-black">{client.name}</h3><p className="mt-1 text-sm text-slate-400">{client.project_name}</p></div>
                        <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-black text-slate-200">{client.project_status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedClient ? (
                <ClientDetail
                  client={selectedClient}
                  related={related}
                  saving={saving}
                  brandColor={brandColor}
                  portalUrl={portalUrl(selectedClient.slug)}
                  onCopy={() => void copyPortalLink(selectedClient.slug)}
                  onCopyAccess={() => void copyPortalAccess(selectedClient)}
                  onAddRow={addRow}
                  onUpload={uploadDeliverable}
                  fileInput={fileInput}
                />
              ) : (
                <div className="glass rounded-[28px] p-6"><Empty title="Select a client" body="Create or select a portal to manage files, milestones, approvals, invoices, and updates." /></div>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="glass card-hover rounded-[22px] p-3.5 sm:rounded-[26px] sm:p-5"><div className="mb-3 text-cyan sm:mb-5">{icon}</div><p className="text-[11px] font-bold leading-4 text-slate-400 sm:text-sm">{label}</p><strong className="mt-1 block text-2xl font-black tracking-[-0.05em] sm:text-3xl">{value}</strong></div>;
}

function Empty({ title, body }: { title: string; body: string }) {
  return <div className="rounded-3xl border border-dashed border-white/15 bg-white/[.03] p-6 text-center"><h3 className="font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{body}</p></div>;
}

function ClientDetail({ client, related, saving, brandColor, portalUrl, onCopy, onCopyAccess, onAddRow, onUpload, fileInput }: {
  client: ClientPortal;
  related: Related;
  saving: boolean;
  brandColor: string;
  portalUrl: string;
  onCopy: () => void;
  onCopyAccess: () => void;
  onAddRow: (table: "milestones" | "approvals" | "invoices" | "updates", event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onUpload: () => Promise<void>;
  fileInput: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="space-y-5">
      <div className="glass rounded-[28px] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="badge mb-3" style={{ borderColor: brandColor, color: brandColor }}>Client detail</p>
            <h2 className="text-3xl font-black tracking-[-0.05em]">{client.project_name}</h2>
            <p className="mt-2 text-slate-300">{client.name} {client.company ? `• ${client.company}` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onCopy} className="btn-secondary"><Copy size={16} /> Copy link</button>
            <button onClick={onCopyAccess} className="btn-secondary"><Copy size={16} /> Copy link + code</button>
            <Link className="btn-primary" href={`/portal/${client.slug}`} target="_blank">Open portal <ArrowUpRight size={16} /></Link>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px]">
          <p className="break-all rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">{portalUrl}</p>
          <p className="rounded-2xl border border-lime/20 bg-lime/10 p-3 text-sm text-lime-50"><span className="block text-[11px] font-black uppercase tracking-[.16em] text-lime/80">Access code</span><strong className="mt-1 block text-lg tracking-[.12em]">{client.access_code || "Not set"}</strong></p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Deliverables" icon={<UploadCloud className="text-cyan" />}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input ref={fileInput} type="file" className="input" />
            <button onClick={() => void onUpload()} disabled={saving} className="btn-primary whitespace-nowrap"><FileUp size={16} /> Upload</button>
          </div>
          <List items={related.files} emptyTitle="No files uploaded yet" emptyBody="Upload the first deliverable so the client has one clear place to download project files." render={(file) => <a href={publicUrl(file.file_path)} target="_blank" className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-3"><span>{file.title}</span><span className="text-xs font-bold text-cyan">{file.file_type}</span></a>} />
        </Panel>

        <Panel title="Milestones" icon={<Clock3 className="text-lime" />}>
          <form onSubmit={(e) => void onAddRow("milestones", e)} className="grid gap-3 sm:grid-cols-2">
            <input className="input" name="title" required placeholder="Milestone title" />
            <select className="input" name="status" defaultValue="in_progress"><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="complete">Complete</option></select>
            <input className="input" name="due_date" type="date" />
            <input className="input" name="description" placeholder="Description" />
            <button className="btn-primary sm:col-span-2" disabled={saving}>Add milestone</button>
          </form>
          <List items={related.milestones} emptyTitle="No milestones yet" emptyBody="Add two or three simple milestones so the client can see what is done, what is active, and what is next." render={(item) => <Row title={item.title} meta={`${item.status.replace("_", " ")}${item.due_date ? ` • ${item.due_date}` : ""}`} />} />
        </Panel>

        <Panel title="Approvals" icon={<BadgeCheck className="text-teal" />}>
          <form onSubmit={(e) => void onAddRow("approvals", e)} className="space-y-3">
            <input className="input" name="title" required placeholder="Approval request title" />
            <textarea className="input min-h-24" name="description" placeholder="What should the client review?" />
            <button className="btn-primary w-full" disabled={saving}>Add approval request</button>
          </form>
          <List items={related.approvals} emptyTitle="No approval requests yet" emptyBody="Create an approval request when a design, draft, edit, or deliverable is ready for client sign-off." render={(item) => <Row title={item.title} meta={item.status.replace("_", " ")} />} />
        </Panel>

        <Panel title="Invoices" icon={<CircleDollarSign className="text-lime" />}>
          <form onSubmit={(e) => void onAddRow("invoices", e)} className="grid gap-3 sm:grid-cols-2">
            <input className="input" name="title" required placeholder="Invoice title" />
            <input className="input" name="amount" required type="number" step="0.01" placeholder="Amount" />
            <input className="input sm:col-span-2" name="payment_url" required type="url" placeholder="Stripe / PayPal payment link" />
            <button className="btn-primary sm:col-span-2" disabled={saving}>Add invoice</button>
          </form>
          <List items={related.invoices} emptyTitle="No invoices added yet" emptyBody="Add a manual invoice with a Stripe, PayPal, or payment link when the next payment is ready." render={(item) => <a href={item.payment_url} target="_blank" className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-3"><span>{item.title}</span><strong>${Number(item.amount).toFixed(2)}</strong></a>} />
        </Panel>

        <Panel title="Project Updates" icon={<FileText className="text-cyan" />}>
          <form onSubmit={(e) => void onAddRow("updates", e)} className="space-y-3">
            <input className="input" name="title" required placeholder="Update title" />
            <textarea className="input min-h-24" name="body" required placeholder="Write a short client-friendly project update." />
            <button className="btn-primary w-full" disabled={saving}>Post update</button>
          </form>
          <List items={related.updates} emptyTitle="No project updates yet" emptyBody="Post short updates instead of sending scattered emails. Keep the client informed without adding chat." render={(item) => <Row title={item.title} meta={item.body} />} />
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="glass rounded-[28px] p-5"><div className="mb-4 flex items-center gap-3">{icon}<h3 className="text-xl font-black tracking-[-0.04em]">{title}</h3></div>{children}</section>;
}

function List<T>({ items, render, emptyTitle, emptyBody }: { items: T[]; render: (item: T) => React.ReactNode; emptyTitle: string; emptyBody: string }) {
  return <div className="mt-4 space-y-2">{items.length === 0 ? <Empty title={emptyTitle} body={emptyBody} /> : items.map((item, index) => <div key={index}>{render(item)}</div>)}</div>;
}

function Row({ title, meta }: { title: string; meta: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3"><h4 className="font-bold">{title}</h4><p className="mt-1 text-sm capitalize text-slate-400">{meta}</p></div>;
}
