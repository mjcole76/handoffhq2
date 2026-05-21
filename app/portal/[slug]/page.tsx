"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, BadgeCheck, CheckCircle2, CircleDollarSign, Download, FileText, Loader2, LockKeyhole, MessageSquareReply, Send, UploadCloud } from "lucide-react";
import { formatSupabaseError, isSupabaseConfigured, publicUrl, supabase, uid } from "@/lib/supabase";
import type { Approval, ClientPortal, Invoice, Milestone, PortalFile, ProviderProfile, Update } from "@/lib/types";

type PortalAccessBundle = {
  provider: ProviderProfile | null;
  client: ClientPortal | null;
  files: PortalFile[];
  milestones: Milestone[];
  approvals: Approval[];
  invoices: Invoice[];
  updates: Update[];
};

const emptyBundle: PortalAccessBundle = {
  provider: null,
  client: null,
  files: [],
  milestones: [],
  approvals: [],
  invoices: [],
  updates: [],
};

export default function ClientPortalPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const uploadInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(isSupabaseConfigured ? "" : "Supabase is not configured yet.");
  const [accessCode, setAccessCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [bundle, setBundle] = useState<PortalAccessBundle>(emptyBundle);

  const provider = bundle.provider;
  const client = bundle.client;
  const files = bundle.files;
  const milestones = bundle.milestones;
  const approvals = bundle.approvals;
  const invoices = bundle.invoices;
  const updates = bundle.updates;
  const brandColor = provider?.brand_color || "#22d3ee";
  const brandButtonStyle = { background: brandColor, boxShadow: `0 18px 55px ${brandColor}33` };
  const brandTextStyle = { color: brandColor };

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const storedCode = sessionStorage.getItem(sessionKey(slug));
    if (storedCode) void verifyAccess(storedCode, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const deliverables = useMemo(() => files.filter((file) => file.file_type === "deliverable"), [files]);
  const clientUploads = useMemo(() => files.filter((file) => file.file_type === "client_upload"), [files]);

  function sessionKey(portalSlug: string) {
    return `handoffhq:portal-access:${portalSlug}`;
  }

  function normalizeBundle(value: unknown): PortalAccessBundle {
    const data = value as Partial<PortalAccessBundle> | null;
    return {
      provider: data?.provider || null,
      client: data?.client || null,
      files: data?.files || [],
      milestones: data?.milestones || [],
      approvals: data?.approvals || [],
      invoices: data?.invoices || [],
      updates: data?.updates || [],
    };
  }

  async function verifyAccess(code = accessCode, silent = false) {
    if (!code.trim()) {
      setNotice("Enter the access code your provider sent with this portal link.");
      return;
    }
    setLoading(true);
    setAccessCode(code.trim().toUpperCase());
    setNotice("");
    const { data, error } = await supabase.rpc("verify_portal_access", {
      p_slug: slug,
      p_access_code: code.trim(),
    });

    if (error) {
      setVerified(false);
      setBundle(emptyBundle);
      setNotice(formatSupabaseError("Verifying portal access", error));
      setLoading(false);
      return;
    }

    const nextBundle = normalizeBundle(data);
    if (!nextBundle.client) {
      setVerified(false);
      setBundle(emptyBundle);
      setNotice(silent ? "Saved access code no longer works for this portal." : "Invalid access code or portal link.");
      sessionStorage.removeItem(sessionKey(slug));
      setLoading(false);
      return;
    }

    setBundle(nextBundle);
    setVerified(true);
    sessionStorage.setItem(sessionKey(slug), code.trim());
    setLoading(false);
  }

  async function refreshPortal() {
    const storedCode = sessionStorage.getItem(sessionKey(slug)) || accessCode;
    await verifyAccess(storedCode, true);
  }

  async function uploadClientFile() {
    if (!client) return;
    const upload = uploadInput.current?.files?.[0];
    if (!upload) return setNotice("Choose a file first.");
    const code = sessionStorage.getItem(sessionKey(slug)) || accessCode;
    setSaving(true);
    const path = `${client.provider_id}/${client.id}/client-uploads/${uid()}-${upload.name}`;
    const { error: uploadError } = await supabase.storage.from("handoff-files").upload(path, upload, { upsert: true });
    if (uploadError) {
      setNotice(formatSupabaseError("Uploading client file", uploadError));
      setSaving(false);
      return;
    }
    const { error } = await supabase.rpc("record_client_upload", {
      p_slug: slug,
      p_access_code: code,
      p_title: upload.name,
      p_file_path: path,
    });
    if (uploadInput.current) uploadInput.current.value = "";
    setNotice(error ? formatSupabaseError("Saving client upload", error) : "File uploaded. Your provider can now see it.");
    await refreshPortal();
    setSaving(false);
  }

  async function respondToApproval(approval: Approval, status: "approved" | "changes_requested", responseNote: string) {
    const code = sessionStorage.getItem(sessionKey(slug)) || accessCode;
    setSaving(true);
    const { error } = await supabase.rpc("submit_approval_response", {
      p_slug: slug,
      p_access_code: code,
      p_approval_id: approval.id,
      p_status: status,
      p_response_note: responseNote,
    });
    setNotice(error ? formatSupabaseError("Submitting approval response", error) : (status === "approved" ? "Approval submitted." : "Change request sent."));
    await refreshPortal();
    setSaving(false);
  }

  if (loading) return <main className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-cyan" size={34} /></main>;

  if (!verified) {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-8">
        <div className="glass w-full max-w-lg rounded-[32px] p-6 sm:p-8">
          <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-cyan/15 text-cyan"><LockKeyhole size={28} /></div>
          <p className="badge mb-4">Protected client portal</p>
          <h1 className="text-3xl font-black tracking-[-0.05em]">Enter your access code</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">Your provider sent this code with the portal link. This keeps project files, invoices, updates, and approvals from being exposed through a public slug alone.</p>
          {notice && <div className="mt-5 rounded-2xl border border-cyan/20 bg-cyan/10 p-4 text-sm text-cyan-50">{notice}</div>}
          <form onSubmit={(event) => { event.preventDefault(); void verifyAccess(); }} className="mt-5 space-y-3">
            <input className="input text-center text-lg font-black tracking-[.16em]" value={accessCode} onChange={(event) => setAccessCode(event.target.value.toUpperCase())} placeholder="HQ-123456" autoComplete="one-time-code" />
            <button className="btn-primary w-full" disabled={!isSupabaseConfigured}><LockKeyhole size={16} /> Unlock portal</button>
          </form>
          <Link className="btn-secondary mt-3 w-full justify-center" href="/">Back to HandOffHQ</Link>
        </div>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="glass max-w-lg rounded-[32px] p-8 text-center">
          <h1 className="text-3xl font-black tracking-[-0.05em]">Portal not found</h1>
          <p className="mt-3 text-slate-300">This client portal link is missing or unavailable.</p>
          <Link className="btn-primary mt-6" href="/">Back to HandOffHQ</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <header className="glass mb-6 rounded-[30px] p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {provider?.logo_url ? <img src={provider.logo_url} alt="Provider logo" className="h-14 w-14 rounded-2xl object-cover" /> : <span className="grid h-14 w-14 place-items-center rounded-2xl font-black text-navy" style={{ background: brandColor }}>HQ</span>}
              <div>
                <p className="text-sm font-bold text-slate-400">{provider?.business_name || "Client Portal"}</p>
                <h1 className="text-3xl font-black tracking-[-0.05em]">{client.project_name}</h1>
              </div>
            </div>
            <span className="rounded-full px-4 py-2 text-sm font-black text-navy" style={{ background: brandColor }}>{client.project_status}</span>
          </div>
          <p className="mt-5 max-w-3xl text-slate-300">One protected place for project progress, deliverables, client uploads, approvals, updates, and invoice payment links.</p>
        </header>

        {notice && <div className="mb-6 rounded-2xl border border-cyan/20 bg-cyan/10 p-4 text-sm text-cyan-50">{notice}</div>}

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <Panel title="Project timeline" icon={<CheckCircle2 style={brandTextStyle} />}>
              <div className="space-y-3">
                {milestones.length === 0 && <Empty text="No milestones have been posted yet. Your provider can add the project timeline from their dashboard." />}
                {milestones.map((item) => <TimelineItem key={item.id} item={item} color={brandColor} />)}
              </div>
            </Panel>

            <Panel title="Download files" icon={<Download style={brandTextStyle} />}>
              <div className="grid gap-3 md:grid-cols-2">
                {deliverables.length === 0 && <Empty text="No deliverables are ready yet. Uploaded files will appear here as soon as your provider shares them." />}
                {deliverables.map((file) => <a key={file.id} href={publicUrl(file.file_path)} target="_blank" className="card-hover rounded-3xl border border-white/10 bg-white/[.035] p-4"><FileText className="mb-4" style={brandTextStyle} /><h3 className="font-black">{file.title}</h3><p className="mt-2 text-sm text-slate-400">Click to download</p></a>)}
              </div>
            </Panel>

            <Panel title="Approval requests" icon={<BadgeCheck style={brandTextStyle} />}>
              <div className="space-y-3">
                {approvals.length === 0 && <Empty text="No approval requests are waiting. When something needs sign-off, it will appear here with approve/request changes buttons." />}
                {approvals.map((approval) => <ApprovalCard key={approval.id} approval={approval} saving={saving} brandButtonStyle={brandButtonStyle} onRespond={respondToApproval} />)}
              </div>
            </Panel>

            <Panel title="Project updates" icon={<MessageSquareReply style={brandTextStyle} />}>
              <div className="space-y-3">
                {updates.length === 0 && <Empty text="No project updates yet. Your provider can post concise updates here instead of scattered email threads." />}
                {updates.map((update) => <article key={update.id} className="rounded-3xl border border-white/10 bg-white/[.035] p-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">{new Date(update.created_at).toLocaleDateString()}</p><h3 className="mt-2 font-black">{update.title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">{update.body}</p></article>)}
              </div>
            </Panel>
          </div>

          <aside className="space-y-5">
            <Panel title="Upload assets" icon={<UploadCloud style={brandTextStyle} />}>
              <p className="mb-4 text-sm leading-6 text-slate-400">Send source files, assets, notes, or reference material back to your provider.</p>
              <input ref={uploadInput} className="input" type="file" />
              <button onClick={() => void uploadClientFile()} className="btn-primary mt-3 w-full" style={brandButtonStyle} disabled={saving}><UploadCloud size={16} /> Upload file</button>
              <div className="mt-4 space-y-2">
                {clientUploads.length === 0 && <Empty text="Your uploads will appear here after you send source files, references, or feedback assets." />}
                {clientUploads.map((file) => <a key={file.id} href={publicUrl(file.file_path)} target="_blank" className="block rounded-2xl border border-white/10 bg-white/[.035] p-3 text-sm text-slate-300">{file.title}</a>)}
              </div>
            </Panel>

            <Panel title="Invoices" icon={<CircleDollarSign style={brandTextStyle} />}>
              <div className="space-y-3">
                {invoices.length === 0 && <Empty text="No invoices have been added yet. Payment links will appear here when your provider adds them." />}
                {invoices.map((invoice) => <a key={invoice.id} href={invoice.payment_url} target="_blank" className="card-hover block rounded-3xl border border-white/10 bg-white/[.035] p-4"><p className="text-sm text-slate-400">{invoice.status}</p><h3 className="mt-1 font-black">{invoice.title}</h3><div className="mt-4 flex items-center justify-between"><strong className="text-2xl">${Number(invoice.amount).toFixed(2)}</strong><span className="inline-flex items-center gap-1 text-sm font-black" style={brandTextStyle}>Pay <ArrowUpRight size={15} /></span></div></a>)}
              </div>
            </Panel>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="glass rounded-[28px] p-5"><div className="mb-4 flex items-center gap-3">{icon}<h2 className="text-xl font-black tracking-[-0.04em]">{title}</h2></div>{children}</section>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-3xl border border-dashed border-white/15 bg-white/[.03] p-5 text-sm leading-6 text-slate-400">{text}</div>;
}

function TimelineItem({ item, color }: { item: Milestone; color: string }) {
  return <div className="flex gap-4 rounded-3xl border border-white/10 bg-white/[.035] p-4"><span className="mt-1 h-4 w-4 shrink-0 rounded-full" style={{ background: item.status === "complete" ? color : "rgba(148,163,184,.45)" }} /><div><h3 className="font-black">{item.title}</h3><p className="mt-1 text-sm capitalize text-slate-400">{item.status.replace("_", " ")}{item.due_date ? ` • Due ${item.due_date}` : ""}</p>{item.description && <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>}</div></div>;
}

function ApprovalCard({ approval, saving, brandButtonStyle, onRespond }: { approval: Approval; saving: boolean; brandButtonStyle: React.CSSProperties; onRespond: (approval: Approval, status: "approved" | "changes_requested", responseNote: string) => Promise<void> }) {
  const [note, setNote] = useState(approval.response_note || "");
  const done = approval.status !== "pending";
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[.035] p-4">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{approval.title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{approval.description}</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black capitalize text-slate-200">{approval.status.replace("_", " ")}</span></div>
      {!done ? <div className="mt-4 space-y-3"><textarea value={note} onChange={(e) => setNote(e.target.value)} className="input min-h-20" placeholder="Optional note" /><div className="grid gap-2 sm:grid-cols-2"><button disabled={saving} onClick={() => void onRespond(approval, "changes_requested", note)} className="btn-secondary"><Send size={16} /> Request changes</button><button disabled={saving} onClick={() => void onRespond(approval, "approved", note)} className="btn-primary" style={brandButtonStyle}><BadgeCheck size={16} /> Approve</button></div></div> : approval.response_note && <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">{approval.response_note}</p>}
    </article>
  );
}
