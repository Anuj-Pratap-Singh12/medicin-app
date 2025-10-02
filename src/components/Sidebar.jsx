"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Home, Users, Activity, LogOut, Sparkles } from "lucide-react";

const navItems = [
  { name: "Ritual Dashboard", href: "/", icon: Home },
  { name: "Performers", href: "/performers", icon: Users },
  { name: "Wellness Rate", href: "/wellness", icon: Activity },
];

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-secondary/30 p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-10">
          <Sparkles className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Grand Grimoire</h1>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>
      <Button
        variant="ghost"
        className="w-full justify-start text-muted-foreground hover:bg-secondary/60 hover:text-foreground gap-3 px-4 py-3"
        onClick={handleSignOut}
      >
        <LogOut className="w-5 h-5" />
        <span>Leave Grimoire</span>
      </Button>
    </aside>
  );
};

export default Sidebar;