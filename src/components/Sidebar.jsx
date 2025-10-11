"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Home, Users, Activity, LogOut, Sparkles } from "lucide-react";

const navItems = [
  { name: "Ritual Dashboard", href: "/", icon: Home },
  { name: "Performers", href: "/performers", icon: Users },
  { name: "Wellness Rate", href: "/wellness", icon: Activity },
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
    <aside className="w-64 min-h-screen flex flex-col relative overflow-hidden text-white bg-gray-900">
      {/* Sidebar Header */}
      <div className="flex items-center gap-3 mb-8 mt-6 px-4">
        <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
        <h1 className="text-xl font-bold text-white">🌙 MedTrack Portal</h1>
      </div>

      {/* Navigation Menu */}
      <nav className="flex flex-col gap-2 px-3">
        {navItems.map((item, idx) => {
          const isActive = pathname === item.href;
          return (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 250 }}
            >
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300
                  ${
                    isActive
                      ? "bg-blue-800 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.4)]"
                      : "hover:bg-gray-800 text-gray-300"
                  }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Profile Section */}
      <div className="mt-auto flex flex-col items-center justify-center py-8">
        <motion.div
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 250 }}
          className="relative w-16 h-16 rounded-full border-2 border-blue-400 flex items-center justify-center bg-gray-800 text-3xl shadow-md"
        >
          <span className="text-white">
            {userName ? userName[0]?.toUpperCase() : "👤"}
          </span>
        </motion.div>

        <p className="mt-3 text-sm font-semibold text-blue-400">{userName}</p>

        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800 gap-3 px-5 py-3 mt-5 rounded-lg transition-all duration-300"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
