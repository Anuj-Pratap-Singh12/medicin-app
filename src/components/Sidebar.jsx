"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Home, Users, Activity, LogOut, Sparkles, MessageSquare } from "lucide-react";

const navItems = [
  { name: "Ritual Dashboard", href: "/", icon: Home },
  { name: "Performers", href: "/performers", icon: Users },
  { name: "Wellness Rate", href: "/wellness", icon: Activity },
  { name: "Chatbot", href: "/chatbot", icon: MessageSquare }, // Added Chatbot
];

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("Nova Healer");

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (user && mounted) {
          const name =
            user.user_metadata?.username ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.user_metadata?.preferred_username ||
            user.user_metadata?.given_name ||
            user.email?.split?.("@")?.[0] ||
            "Nova Healer";

          setUserName(name);
        }
      } catch (err) {
        console.error("Sidebar: failed to load user", err);
      }
    };

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user && mounted) {
        const name =
          user.user_metadata?.username ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.preferred_username ||
          user.user_metadata?.given_name ||
          user.email?.split?.("@")?.[0] ||
          "Nova Healer";
        setUserName(name);
      } else if (mounted) {
        setUserName("Nova Healer");
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  return (
    <aside className="w-64 bg-gray-900 p-4 flex flex-col relative overflow-hidden text-white">
      {/* Sidebar Header */}
      <div className="flex items-center gap-2 mb-8">
        <Sparkles className="w-8 h-8 text-primary animate-pulse" />
        <h1 className="text-xl font-bold text-foreground">🌙 Grand Grimoire</h1>
      </div>

      {/* Navigation Menu */}
      <nav className="flex flex-col gap-2 relative z-10">
        {navItems.map((item, idx) => {
          const isActive = pathname === item.href;
          return (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.05, x: 6 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                  isActive
                    ? "bg-purple-600/30 text-violet-300 shadow-[0_0_15px_rgba(167,139,250,0.6)]"
                    : "hover:bg-purple-700/40 text-gray-300"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Floating Cosmic Orbs */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-10 left-10 w-40 h-40 bg-violet-700/20 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        className="absolute top-20 right-5 w-52 h-52 bg-fuchsia-600/20 rounded-full blur-3xl"
      />

      {/* Profile Section */}
      <div className="mt-auto relative flex flex-col items-center justify-center py-6">
        {/* Orbiting particles */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute w-16 h-16 flex items-center justify-center"
        >
          <motion.span
            className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-400 rounded-full shadow-[0_0_10px_rgba(255,192,203,0.9)]"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(173,216,230,0.9)]"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
        </motion.div>

        {/* Profile Icon */}
        <motion.div
          whileHover={{ scale: 1.2, rotate: 10 }}
          transition={{ type: "spring", stiffness: 250 }}
          className="relative z-10 w-14 h-14 rounded-full border-2 border-purple-500 shadow-[0_0_20px_rgba(167,139,250,0.6)] bg-gray-800 flex items-center justify-center text-3xl"
        >
          <span className="text-xl">
            {userName ? userName[0]?.toUpperCase() : "👤"}
          </span>
        </motion.div>

        {/* Username */}
        <p className="mt-3 text-sm font-semibold text-violet-300">{userName}</p>

        {/* Sign Out */}
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start text-muted-foreground hover:bg-secondary/60 hover:text-foreground gap-3 px-4 py-3 mt-4"
        >
          <LogOut className="w-5 h-5" />
          <span>Leave Grimoire</span>
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
