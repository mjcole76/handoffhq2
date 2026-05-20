import Link from "next/link";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, CheckCircle2, FileUp, ShieldCheck, Sparkles } from "lucide-react";

const features = [
  "Client files and uploads",
  "Milestones and status",
  "Approval requests",
  "Payment links",
  "Project updates",
  "White-label branding",
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <nav className="mx-auto flex w-[min(1180px,calc(100%-32px))] items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-3 font-black tracking-[-0.04em]">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-300 text-navy shadow-glow">HQ</span>
          <span>HandOffHQ</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link className="hidden rounded-2xl px-4 py-2 text-sm font-bold text-slate-300 hover:text-white sm:block" href="/login">Log in</Link>
          <Link className="btn-primary" href="/login">Start free <ArrowRight size={18} /></Link>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-96px)] w-[min(1180px,calc(100%-32px))] items-center gap-12 py-16 lg:grid-cols-[.95fr_1.05fr]">
        <div>
          <div className="badge mb-6"><Sparkles size={15} /> One branded portal for every client handoff</div>
          <h1 className="max-w-4xl text-5xl font-black leading-[.96] tracking-[-0.065em] text-white sm:text-6xl lg:text-7xl xl:text-8xl">
            Give every client one polished place for files, updates, approvals, and invoices.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            HandOffHQ helps freelancers, agencies, consultants, designers, and video editors create a professional client portal in under 5 minutes — one link instead of five messy email threads.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link className="btn-primary" href="/login">Create your portal <ArrowRight size={18} /></Link>
            <a className="btn-secondary" href="#preview">See portal preview</a>
          </div>
          <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 text-sm text-slate-300 sm:grid-cols-3">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-2"><CheckCircle2 className="text-lime" size={16} /> {feature}</div>
            ))}
          </div>
        </div>

        <div id="preview" className="glass glow-border rounded-[34px] p-4 lg:p-5">
          <div className="rounded-[26px] border border-white/10 bg-[#06101d]/80 p-5">
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[.22em] text-cyan">Client Portal</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Acme Launch Handoff</h2>
              </div>
              <span className="rounded-full bg-lime/15 px-3 py-1 text-xs font-black text-lime">Active</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-cyan/20 bg-cyan/5 p-5">
                <FileUp className="mb-5 text-cyan" />
                <h3 className="text-lg font-black">Deliverables</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">Final exports, source files, and client uploads stay in one branded place.</p>
              </div>
              <div className="rounded-3xl border border-teal/20 bg-teal/5 p-5">
                <BadgeCheck className="mb-5 text-teal" />
                <h3 className="text-lg font-black">Approvals</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">Clients can approve work or request changes without another email chain.</p>
              </div>
              <div className="rounded-3xl border border-lime/20 bg-lime/5 p-5">
                <BriefcaseBusiness className="mb-5 text-lime" />
                <h3 className="text-lg font-black">Timeline</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">Milestones make project progress visible at a glance.</p>
              </div>
              <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
                <ShieldCheck className="mb-5 text-white" />
                <h3 className="text-lg font-black">Invoices</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">Add manual invoice items with Stripe, PayPal, or other payment links.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
