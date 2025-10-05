"use client";

import PropTypes from "prop-types";
import { motion } from "framer-motion";
import Sidebar from "./Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// ✅ Import Inter font properly using next/font/google
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], display: "swap" });

const Layout = ({ children }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // ✅ Check session on load
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);

      if (!data.session) {
        router.push("/auth"); // redirect if not logged in
      }
    };

    getSession();

    // ✅ Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (!newSession) {
          router.push("/auth");
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  // ✅ Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    router.push("/auth");
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center bg-black text-white ${inter.className}`}
      >
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        <span className="ml-3 text-lg">Loading...</span>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-screen bg-black text-white relative overflow-hidden ${inter.className}`}
    >
      {/* Sidebar with logout */}
      <Sidebar>
        {session && (
          <Button
            onClick={handleLogout}
            className="mt-6 w-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:opacity-90"
          >
            Logout
          </Button>
        )}
      </Sidebar>

      {/* Main content */}
      <main className="flex-1 p-6 relative z-10">{children}</main>

      {/* Background Orbs */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-10 left-10 w-40 h-40 bg-violet-700/20 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        className="absolute top-20 right-5 w-52 h-52 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none"
      />
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
