import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/brand";
import { GoogleButton } from "@/components/google-button";
import { mockJwt, setAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { AlertCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/sign-in")({
  head: () => ({ meta: [{ title: "Sign In · InsightOps" }] }),
  component: SignIn,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const fe: typeof errors = {};
      for (const i of parsed.error.issues) fe[i.path[0] as "email" | "password"] = i.message;
      setErrors(fe);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await api.login(email, password);
      setAuth(res.access_token, { name: email.split("@")[0], email });
      navigate({ to: "/dashboard" });
    } catch (err) {
      setErrors({ email: "Incorrect credentials or server communication failure." });
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setErrors({});
    setLoading(true);
    try {
      const mockGoogleToken = mockJwt("googleuser@test.com");
      const res = await api.googleLogin(mockGoogleToken);
      setAuth(res.access_token, { name: "Google User", email: "googleuser@test.com" });
      navigate({ to: "/dashboard" });
    } catch (err) {
      setErrors({ email: "Google login authentication failed." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Welcome back</h1>
      <p className="mt-1.5 text-sm text-slate-600">Sign in to your InsightOps workspace.</p>

      <div className="mt-7">
        <GoogleButton onClick={google} label="Continue with Google" />
      </div>

      <Divider />

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field
          label="Email"
          id="email"
          type="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          placeholder="you@company.com"
        />
        <Field
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          placeholder="••••••••"
        />

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-md bg-violet-600 text-white hover:bg-violet-700 shadow-sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New to InsightOps?{" "}
        <Link to="/sign-up" className="text-violet-600 font-medium hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="px-6 py-5">
        <Link to="/"><Brand /></Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-lg border border-slate-200/70 bg-white p-8 shadow-sm">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export function Field({
  label, id, type, value, onChange, error, placeholder,
}: {
  label: string; id: string; type: string; value: string;
  onChange: (v: string) => void; error?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-slate-700">{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={type === "password" ? "current-password" : type}
        className={`h-10 rounded-md bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-violet-100 focus-visible:border-violet-500 ${
          error ? "border-rose-400 focus-visible:ring-rose-100 focus-visible:border-rose-500" : ""
        }`}
        aria-invalid={!!error}
      />
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose-600">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  );
}

export function Divider() {
  return (
    <div className="relative my-6 flex items-center">
      <div className="flex-1 border-t border-slate-200" />
      <span className="px-3 font-mono text-[10px] uppercase tracking-widest text-slate-400">or</span>
      <div className="flex-1 border-t border-slate-200" />
    </div>
  );
}
