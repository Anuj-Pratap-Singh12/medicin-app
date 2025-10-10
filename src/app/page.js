"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Sparkles, Clock, Pill } from "lucide-react";
import { fetchPerformersWithLogs } from "@/integrations/supabase/supabaseHelper";
import MedicineCalendar from "@/components/MedicineCalendar";
import GoogleConnectButton from "@/components/GoogleConnectButton"; // ✨ NEW: Import the connect button

const Dashboard = () => {

  const [performers, setPerformers] = useState([]);
  const [user, setUser] = useState(null);
  const [clock, setClock] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggedMedicines, setLoggedMedicines] = useState({});
  const [adherenceData, setAdherenceData] = useState(null);

  // ✨ NEW: Handle redirect from Google OAuth
  useEffect(() => {
    // Check the URL for status messages from our Edge Function
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const error = params.get("error");

    if (status === "calendar_connected") {
      alert("Successfully connected to Google Calendar!");
    }
    
    if (error) {
      alert(`An error occurred while connecting to Google Calendar: ${error}`);
    }

    // Clean the URL so the message doesn't appear again on refresh
    if (status || error) {
      // Replaces the current URL in the history with the path without search params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch current user session
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) setUser(data.session.user);
    };
    fetchUser();
  }, []);

  // Clock updater
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch performers + adherence view
  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const performersList = await fetchPerformersWithLogs(user.id);
      setPerformers(performersList || []);

      const allLogs = {};
      performersList.forEach((p) => {
        p.medicines?.forEach((m) => {
          if (m.medicine_logs?.length) {
            allLogs[m.id] = m.medicine_logs;
          }
        });
      });
      setLoggedMedicines(allLogs);

      const { data: adherenceRows, error } = await supabase
        .from("vw_user_medicine_dashboard")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        setAdherenceData(null);
      } else if (adherenceRows.length > 0) {
        // Simple aggregation for now
        const total_logs = adherenceRows.reduce((sum, row) => sum + row.total_logs, 0);
        const taken_count = adherenceRows.reduce((sum, row) => sum + row.taken_count, 0);
        const adherence_percentage = total_logs > 0 ? Math.round((taken_count / total_logs) * 100) : null;
        setAdherenceData({ ...adherenceRows[0], total_logs, taken_count, adherence_percentage });
      } else {
        setAdherenceData(null);
      }
    } catch (err) {
      console.error("❌ fetchData exception:", err);
      setAdherenceData(null);
    }

    setLoading(false);
  };

  // Auto fetch on user load + realtime updates
  useEffect(() => {
    if (!user) return;
    fetchData();

    const channels = supabase.channel('dashboard-realtime-changes', {
      config: {
        broadcast: {
          self: true,
        },
      },
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'performers' }, fetchData)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'medicines' }, fetchData)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'medicine_logs' }, fetchData)
    .subscribe();

    return () => {
      supabase.removeChannel(channels);
    };
  }, [user]);

  if (loading)
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Sparkles className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="relative p-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <motion.div
          // ... Clock JSX ...
        />

        {/* Left: Performers */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="flex flex-col sm:flex-row justify-between items-center mb-12"
          >
            <h1 className="text-3xl md:text-4xl font-extrabold text-center bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
              Performers & Pills Today
            </h1>
            {/* ✨ NEW: Added the connect button to the header */}
            <div className="mt-4 sm:mt-0">
              <GoogleConnectButton />
            </div>
          </motion.div>

          {performers.length === 0 ? (
            <motion.div
              // ... No performers JSX ...
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {performers.map((perf, i) => (
                <motion.div
                  key={perf.id}
                  // ... Performer card animation ...
                >
                  <Card /* ... Performer card JSX ... */ >
                    {/* ... Card content ... */}
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Adherence Calendar */}
        <motion.div
          // ... Calendar section JSX ...
        />
      </div>
    </Layout>
  );
};

export default Dashboard;