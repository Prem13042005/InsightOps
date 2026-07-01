import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { GoogleButton } from "@/components/google-button";
import { mockJwt, setAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { AuthShell, Field, Divider } from "./sign-in";

export const Route = createFileRoute("/sign-up")({
  head: () => ({ meta: [{ title: "Sign Up · InsightOps" }] }),
  component: SignUp,
});

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

function SignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, email, password });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const i of parsed.error.issues) fe[i.path[0] as string] = i.message;
      setErrors(fe);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api.register(name, email, password);
      navigate({ to: "/sign-in" });
    } catch (err) {
      setErrors({ email: "Registration failed: email already exists or server error." });
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
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Create your workspace</h1>
      <p className="mt-1.5 text-sm text-slate-600">Query your warehouse in plain English.</p>

      <div className="mt-7">
        <GoogleButton onClick={google} label="Continue with Google" />
      </div>

      <Divider />

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Full name" id="name" type="text" value={name} onChange={setName} error={errors.name} placeholder="Ada Lovelace" />
        <Field label="Work email" id="email" type="email" value={email} onChange={setEmail} error={errors.email} placeholder="you@company.com" />
        <Field label="Password" id="password" type="password" value={password} onChange={setPassword} error={errors.password} placeholder="At least 8 characters" />

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-md bg-violet-600 text-white hover:bg-violet-700 shadow-sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link to="/sign-in" className="text-violet-600 font-medium hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
