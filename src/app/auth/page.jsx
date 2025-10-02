"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, BookOpen } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  
  // --- NEW STATE TO TRIGGER REDIRECT ---
  const [isAuthSuccess, setIsAuthSuccess] = useState(false);

  // --- USEEFFECT TO HANDLE THE REDIRECT ---
  useEffect(() => {
    if (isAuthSuccess) {
      // Once isAuthSuccess is true, we redirect.
      router.push("/");
    }
  }, [isAuthSuccess, router]);

  const handleAuth = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back, Master Alchemist!");
        
        // --- CHANGE: Set state instead of redirecting directly ---
        setIsAuthSuccess(true);

      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        
        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              user_id: data.user.id,
              username: username || email.split("@")[0],
            });
          if (profileError) throw profileError;
        }
        
        toast.success("Your grimoire has been created!");
        
        // --- CHANGE: Set state instead of redirecting directly ---
        setIsAuthSuccess(true);
      }
    } catch (error) {
      toast.error(error.message || "An error occurred during authentication");
      console.error("Full auth error:", error);
    } finally {
      // We only set loading to false if there was no success
      if (!isAuthSuccess) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/95 border-primary/30 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <BookOpen className="w-16 h-16 text-accent animate-pulse" />
              <Sparkles className="w-6 h-6 text-primary absolute -top-2 -right-2" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            The Alchemist's Grand Grimoire
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isLogin ? "Enter your mystical realm" : "Begin your alchemical journey"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground">
                  Alchemist Name
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Master of Elixirs"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-background/50 border-primary/30 focus:border-primary"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Mystical Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="alchemist@grimoire.magic"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50 border-primary/30 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Secret Incantation
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-background/50 border-primary/30 focus:border-primary"
              />
            </div>

            <Button
              type="button"
              onClick={handleAuth}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground shadow-lg"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Conjuring...
                </span>
              ) : isLogin ? (
                "Enter the Grimoire"
              ) : (
                "Create My Grimoire"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-accent hover:text-accent/80 transition-colors"
            >
              {isLogin ? "Need a new grimoire? Create one" : "Already have a grimoire? Enter here"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;