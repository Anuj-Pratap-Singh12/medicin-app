"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const Auth = () => {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [session, setSession] = useState(null);

  // --- Check session on load ---
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session) {
        router.push("/"); // already logged in
      }
    };

    getSession();

    // listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        if (newSession) {
          router.push("/");
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;

        if (data.user) {
          await supabase.from("profiles").insert({
            user_id: data.user.id,
            username: username || email.split("@")[0],
          });
        }

        toast.success("Account created successfully!");
      }
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black/95 relative overflow-hidden">
      {/* Cosmic background */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/4 left-1/4 w-[28rem] h-[28rem] bg-violet-600/20 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-1/3 right-1/3 w-[32rem] h-[32rem] bg-fuchsia-600/20 rounded-full blur-3xl"
      />

      <Card className="w-full max-w-md relative z-10 backdrop-blur-md bg-black/50 border border-violet-500/30 shadow-[0_0_25px_rgba(167,139,250,0.3)]">
        <CardHeader className="text-center space-y-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-4"
          >
            <BookOpen className="w-16 h-16 text-violet-400 animate-pulse" />
            <Sparkles className="w-6 h-6 text-fuchsia-400 absolute -top-2 -right-2 animate-bounce" />
          </motion.div>
          <CardTitle className="text-3xl font-extrabold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
            Medicine Scheduler
          </CardTitle>
          <CardDescription className="text-purple-200/70">
            {isLogin
              ? "Sign in to manage your schedule"
              : "Create an account to begin"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username" className="text-violet-200">
                  Your Name
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Elixir Master"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-black/40 border-violet-500/30 text-white focus:ring-violet-400"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-violet-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black/40 border-violet-500/30 text-white focus:ring-violet-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-violet-200">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-black/40 border-violet-500/30 text-white focus:ring-violet-400"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white shadow-lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Processing...
                </span>
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-violet-300 hover:text-violet-400 transition-colors"
            >
              {isLogin
                ? "Need an account? Sign up"
                : "Already registered? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
