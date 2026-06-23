import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------ Auth ------------------------------ */
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "customer" | "admin" | "corporate";
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  requireAuth: () => boolean;
}
const AuthContext = createContext<AuthCtx | null>(null);

/* ------------------------------ Cart ------------------------------ */
export interface CartLine {
  id: string; // productId or `mix-...`
  name: string;
  image: string;
  qty: string;
  price: number;
  count: number;
}
interface CartCtx {
  lines: CartLine[];
  add: (line: Omit<CartLine, "count">, count?: number) => void;
  remove: (id: string) => void;
  setCount: (id: string, count: number) => void;
  clear: () => void;
  subtotal: number;
  itemCount: number;
}
const CartContext = createContext<CartCtx | null>(null);

/* ---------------------------- Wishlist ---------------------------- */
interface WishCtx {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
}
const WishContext = createContext<WishCtx | null>(null);

/* ---------------------------- Auth Modal -------------------------- */
interface AuthModalCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  trigger: () => void;
}
const AuthModalContext = createContext<AuthModalCtx | null>(null);
const POST_AUTH_REDIRECT = "/account?tab=dashboard";

function getAuthCallbackUrl(next = POST_AUTH_REDIRECT) {
  if (typeof window === "undefined") return undefined;
  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", next);
  return url.toString();
}

function useLocal<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount (client-only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setV(JSON.parse(raw) as T);
      setHydrated(true);
    } catch {
      setHydrated(true);
    }
  }, [key]);

  // Persist to localStorage when value changes (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      // Ignore localStorage write errors so auth/cart state can still work in restricted browsers.
    }
  }, [key, v, hydrated]);

  return [v, setV] as const;
}

export function StoreProviders({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useLocal<CartLine[]>("lg.cart", []);
  const [wish, setWish] = useLocal<string[]>("lg.wish", []);
  const [authOpen, setAuthOpen] = useState(false);

  // Hydrate user from Supabase session + profile/role
  useEffect(() => {
    let cancelled = false;

    async function loadUser(sessionUser: SupabaseAuthUser | null) {
      if (!sessionUser) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, email, phone")
            .eq("id", sessionUser.id)
            .maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", sessionUser.id),
        ]);
      if (cancelled) return;

      if (profileError) console.error("[Auth] Failed to load profile", profileError);
      if (rolesError) console.error("[Auth] Failed to load roles", rolesError);

      const meta = sessionUser.user_metadata as
        | { full_name?: string; name?: string; phone?: string; phone_number?: string }
        | undefined;
      const roleList = (roles ?? []).map((r) => r.role);
      const role: User["role"] = roleList.includes("admin")
        ? "admin"
        : roleList.includes("corporate")
          ? "corporate"
          : "customer";
      const email = profile?.email ?? sessionUser.email ?? "";
      const name =
        profile?.full_name || meta?.full_name || meta?.name || email.split("@")[0] || "Account";
      const phone = profile?.phone ?? meta?.phone ?? meta?.phone_number ?? undefined;

      setUser({
        id: sessionUser.id,
        name,
        email,
        phone,
        role,
      });
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => loadUser(data.session?.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED" ||
        event === "INITIAL_SESSION"
      ) {
        loadUser(session?.user ?? null);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const auth = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        toast.success("Welcome back!");
        return {};
      },
      signup: async ({ name, email, phone, password }) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getAuthCallbackUrl(),
            data: { full_name: name, phone },
          },
        });
        if (error) return { error: error.message };
        toast.success("Account created — check your email to confirm.");
        return {};
      },
      signInWithGoogle: async () => {
        const redirectTo = getAuthCallbackUrl();
        if (!redirectTo || typeof window === "undefined") {
          return { error: "Google sign-in is only available in the browser." };
        }

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
            queryParams: { prompt: "select_account" },
            skipBrowserRedirect: true,
          },
        });

        if (error) return { error: error.message };
        if (!data?.url) return { error: "Unable to start Google sign-in. Please try again." };

        window.location.assign(data.url);
        return {};
      },
      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo:
            typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
        });
        if (error) return { error: error.message };
        toast.success("Password reset link sent");
        return {};
      },
      logout: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success("Signed out");

        if (typeof window !== "undefined" && window.location.pathname.startsWith("/account")) {
          window.location.assign("/");
        }
      },
      requireAuth: () => {
        if (user) return true;
        setAuthOpen(true);
        toast("Please sign in to continue");
        return false;
      },
    }),
    [user, loading],
  );

  const cart = useMemo<CartCtx>(() => {
    const subtotal = lines.reduce((s, l) => s + l.price * l.count, 0);
    const itemCount = lines.reduce((s, l) => s + l.count, 0);
    return {
      lines,
      subtotal,
      itemCount,
      add: (line, count = 1) => {
        setLines((curr) => {
          const idx = curr.findIndex((l) => l.id === line.id);
          if (idx >= 0) {
            const next = [...curr];
            next[idx] = { ...next[idx], count: next[idx].count + count };
            return next;
          }
          return [...curr, { ...line, count }];
        });
        toast.success(`${line.name} added to cart`);
      },
      remove: (id) => setLines((c) => c.filter((l) => l.id !== id)),
      setCount: (id, count) =>
        setLines((c) => c.map((l) => (l.id === id ? { ...l, count: Math.max(1, count) } : l))),
      clear: () => setLines([]),
    };
  }, [lines, setLines]);

  const wishlist = useMemo<WishCtx>(
    () => ({
      ids: wish,
      has: (id) => wish.includes(id),
      toggle: (id) => {
        setWish((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]));
      },
    }),
    [wish, setWish],
  );

  const modal = useMemo<AuthModalCtx>(
    () => ({
      open: authOpen,
      setOpen: setAuthOpen,
      trigger: () => setAuthOpen(true),
    }),
    [authOpen],
  );

  return (
    <AuthContext.Provider value={auth}>
      <CartContext.Provider value={cart}>
        <WishContext.Provider value={wishlist}>
          <AuthModalContext.Provider value={modal}>{children}</AuthModalContext.Provider>
        </WishContext.Provider>
      </CartContext.Provider>
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const v = useContext(AuthContext);
  if (!v) throw new Error("AuthContext missing");
  return v;
};
export const useCart = () => {
  const v = useContext(CartContext);
  if (!v) throw new Error("CartContext missing");
  return v;
};
export const useWishlist = () => {
  const v = useContext(WishContext);
  if (!v) throw new Error("WishContext missing");
  return v;
};
export const useAuthModal = () => {
  const v = useContext(AuthModalContext);
  if (!v) throw new Error("AuthModalContext missing");
  return v;
};

export function inr(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}
