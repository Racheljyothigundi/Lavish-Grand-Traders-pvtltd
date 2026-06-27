import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth, useAuthModal } from "@/lib/store";
import { Loader2, Mail, Lock, User, Phone, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type Mode = "login" | "signup" | "forgot";

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6)
    return { valid: false, message: "Password must be at least 6 characters" };
  if (!/[A-Z]/.test(password))
    return { valid: false, message: "Password must contain an uppercase letter" };
  if (!/[0-9]/.test(password)) return { valid: false, message: "Password must contain a number" };
  return { valid: true };
}

function validatePhone(phone: string): boolean {
  if (!phone) return true;
  return /^[+]?[\d\s-]{10,}$/.test(phone.replace(/\s/g, ""));
}

function friendlyAuthError(error: string) {
  const message = error.toLowerCase();
  if (message.includes("email rate limit") || message.includes("rate limit")) {
    return "Too many email requests. Please wait a few minutes before trying again.";
  }
  if (message.includes("already registered") || message.includes("already exists")) {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (message.includes("invalid login credentials")) {
    return "Incorrect email or password. Please try again.";
  }
  if (message.includes("email not confirmed")) {
    return "Please check your email and confirm your account first.";
  }
  return "Something went wrong. Please try again.";
}

export function AuthDialog() {
  const { open, setOpen } = useAuthModal();
  const { login, signup, resendConfirmation, signInWithGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [pendingAction, setPendingAction] = useState<"form" | "google" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const busy = pendingAction !== null;
  const googleBusy = pendingAction === "google";
  const formBusy = pendingAction === "form";

  const close = () => {
    setOpen(false);
    setMode("login");
    setPendingAction(null);
    setConfirmationEmail("");
    setForm({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  };

  const handleGoogle = async () => {
    setPendingAction("google");
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error);
      setPendingAction(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPendingAction("form");

    if (!validateEmail(form.email)) {
      toast.error("Please enter a valid email address");
      setPendingAction(null);
      return;
    }

    if (mode === "login") {
      if (!form.password) {
        toast.error("Please enter your password");
        setPendingAction(null);
        return;
      }
      const { error } = await login(form.email.trim().toLowerCase(), form.password);
      if (error) {
        if (error.toLowerCase().includes("email not confirmed")) {
          setConfirmationEmail(form.email.trim().toLowerCase());
        }
        toast.error(friendlyAuthError(error));
        setPendingAction(null);
      } else {
        close();
      }
    } else if (mode === "signup") {
      if (!form.name.trim()) {
        toast.error("Please enter your full name");
        setPendingAction(null);
        return;
      }
      if (form.phone && !validatePhone(form.phone)) {
        toast.error("Please enter a valid phone number");
        setPendingAction(null);
        return;
      }
      const pwdCheck = validatePassword(form.password);
      if (!pwdCheck.valid) {
        toast.error(pwdCheck.message);
        setPendingAction(null);
        return;
      }
      if (form.password !== form.confirmPassword) {
        toast.error("Passwords do not match");
        setPendingAction(null);
        return;
      }
      const { error, needsConfirmation } = await signup({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
      if (error) {
        toast.error(friendlyAuthError(error));
        setPendingAction(null);
      } else if (needsConfirmation) {
        setConfirmationEmail(form.email.trim().toLowerCase());
        setMode("login");
        setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
        setPendingAction(null);
      } else {
        close();
      }
    } else {
      const { error } = await resetPassword(form.email.trim().toLowerCase());
      if (error) {
        if (error.includes("not found")) {
          toast.error("No account found with this email address.");
        } else {
          toast.error(friendlyAuthError(error));
        }
        setPendingAction(null);
      } else {
        toast.success("Password reset link sent! Check your email inbox.");
        setMode("login");
        setPendingAction(null);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
        else setOpen(true);
      }}
    >
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="bg-gradient-deep px-6 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {mode === "forgot" ? "Reset Password" : "Welcome to Lavish Grand"}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {mode === "forgot"
                ? "Enter your email to receive a password reset link."
                : "Sign in to save your cart, track orders & manage subscriptions."}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="p-6">
          {mode !== "forgot" && (
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>
              <TabsContent value="login" />
              <TabsContent value="signup" />
            </Tabs>
          )}

          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={handleGoogle}
            className="w-full mt-4 h-11 gap-2 font-medium"
          >
            {googleBusy && <Loader2 className="w-4 h-4 animate-spin" />}
            <GoogleIcon /> Continue with Google
          </Button>

          <div className="my-4 flex items-center gap-3 text-[11px] text-muted-foreground uppercase tracking-wider">
            <div className="h-px bg-border flex-1" />
            or {mode === "forgot" ? "reset password" : "use email"}
            <div className="h-px bg-border flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "login" && confirmationEmail && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p>Confirm {confirmationEmail} before signing in.</p>
                <button
                  type="button"
                  className="mt-1 font-semibold text-brand hover:underline"
                  onClick={async () => {
                    setPendingAction("form");
                    const { error } = await resendConfirmation(confirmationEmail);
                    if (error) toast.error(friendlyAuthError(error));
                    setPendingAction(null);
                  }}
                >
                  Resend confirmation email
                </button>
              </div>
            )}
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label>Full name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your full name"
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="pl-10"
                />
              </div>
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label>Phone (optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            {mode !== "forgot" && (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Password *</Label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs text-brand hover:underline font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      required
                      type={showPassword ? "text" : "password"}
                      minLength={6}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={
                        mode === "signup" ? "Min 6 chars, 1 uppercase, 1 number" : "••••••••"
                      }
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === "signup" && (
                    <p className="text-[10px] text-muted-foreground">
                      Must be at least 6 characters with 1 uppercase letter and 1 number
                    </p>
                  )}
                </div>

                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label>Confirm Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        required
                        type={showPassword ? "text" : "password"}
                        minLength={6}
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        placeholder="Confirm your password"
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="w-full h-11 bg-gradient-hero text-white shadow-elegant"
            >
              {formBusy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {mode === "login"
                ? "Sign In"
                : mode === "signup"
                  ? "Create Account"
                  : "Send Reset Link"}
            </Button>

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full text-xs text-muted-foreground hover:text-brand"
              >
                Back to sign in
              </button>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.4 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C41.4 35.6 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
