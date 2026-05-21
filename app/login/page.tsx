"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (!isSupabaseConfigured) {
      setLoading(false);
      setMessage("Add Supabase env vars first. See .env.example and README.md.");
      return;
    }

    const authCall = mode === "signup"
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });

    const { data, error } = await authCall;
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("users").upsert({ id: data.user.id, email: data.user.email });
      if (profileError && data.session) {
        setMessage(profileError.message);
        setLoading(false);
        return;
      }
    }

    if (!data.session) {
      setMessage(mode === "signup" ? "Account created. Check your email to confirm it, then come back and log in." : "Login did not create an active session. Try again.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3 font-black tracking-[-0.04em]">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-300 text-navy shadow-glow">HQ</span>
          <span>HandOffHQ</span>
        </Link>
        <form onSubmit={submit} className="glass rounded-[32px] p-7">
          <p className="badge mb-5">Provider access</p>
          <h1 className="text-3xl font-black tracking-[-0.05em]">{mode === "signup" ? "Create your client portal workspace" : "Welcome back"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">Set up branded portals for client handoffs, approvals, files, updates, and invoice payment links.</p>

          <div className="mt-7 space-y-4">
            <label className="block text-sm font-bold text-slate-300">Email
              <input className="input mt-2" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="you@studio.com" />
            </label>
            <label className="block text-sm font-bold text-slate-300">Password
              <input className="input mt-2" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={6} placeholder="Minimum 6 characters" />
            </label>
          </div>

          {message && <p className="mt-4 rounded-2xl border border-cyan/20 bg-cyan/10 p-3 text-sm text-cyan-100">{message}</p>}

          <button className="btn-primary mt-6 w-full" disabled={loading} type="submit">
            {loading ? <Loader2 className="animate-spin" size={18} /> : null}
            {mode === "signup" ? "Create account" : "Log in"} <ArrowRight size={18} />
          </button>

          <button type="button" className="mt-5 w-full text-center text-sm font-bold text-slate-300 hover:text-white" onClick={() => setMode(mode === "signup" ? "login" : "signup")}>
            {mode === "signup" ? "Already have an account? Log in" : "Need an account? Sign up"}
          </button>
        </form>
      </div>
    </main>
  );
}
