"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Sparkles, Clock, Pill } from "lucide-react";
import { fetchPerformersWithLogs } from "@/integrations/supabase/supabaseHelper";
import MedicineCalendar from "@/components/MedicineCalendar";

const Dashboard = () => {
  const [performers, setPerformers] = useState([]);
  const [user, setUser] = useState(null);
  const [clock, setClock] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggedMedicines, setLoggedMedicines] = useState({});
  const [adherenceData, setAdherenceData] = useState(null);

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
  // Fetch performers + adherence view
const fetchData = async () => {
  if (!user) return;
  setLoading(true);

  try {
    const performersList = await fetchPerformersWithLogs(user.id);
    console.log("✅ Fetched performers:", performersList);
    setPerformers(performersList || []);

    // Derive logged medicine data from performers
    const allLogs = {};
    performersList.forEach((p) => {
      p.medicines?.forEach((m) => {
        if (m.medicine_logs?.length) {
          allLogs[m.id] = m.medicine_logs;
        }
      });
    });
    setLoggedMedicines(allLogs);

    // Fetch adherence summary view
    const { data: adherenceRows, error } = await supabase
      .from("vw_user_medicine_dashboard")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("⚠️ View fetch error:", error.message);
      setAdherenceData(null);
    } else if (adherenceRows.length === 0) {
      console.log("📊 No adherence data found");
      setAdherenceData(null);
    } else if (adherenceRows.length === 1) {
      console.log("📊 Adherence view data (single row):", adherenceRows[0]);
      setAdherenceData(adherenceRows[0]);
    } else {
      console.log("📊 Adherence view data (multiple rows):", adherenceRows);
      // Option 1: Aggregate totals if multiple rows
      const total_logs = adherenceRows.reduce((sum, row) => sum + row.total_logs, 0);
      const taken_count = adherenceRows.reduce((sum, row) => sum + row.taken_count, 0);
      const missed_count = adherenceRows.reduce((sum, row) => sum + row.missed_count, 0);
      const adherence_percentage =
        total_logs > 0 ? Math.round((taken_count / total_logs) * 100) : null;

      setAdherenceData({ total_logs, taken_count, missed_count, adherence_percentage });
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

    const perfChannel = supabase
      .channel("performers-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "performers" }, fetchData)
      .subscribe();

    const medChannel = supabase
      .channel("medicines-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "medicines" }, fetchData)
      .subscribe();

    const logChannel = supabase
      .channel("medicine_logs-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "medicine_logs" }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(perfChannel);
      supabase.removeChannel(medChannel);
      supabase.removeChannel(logChannel);
    };
  }, [user]);

  // Loading state animation
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
        {/* Floating Clock */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed top-4 right-4 md:top-6 md:right-8 bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-2 rounded-full shadow-lg border border-purple-400/40 z-50"
        >
          <div className="flex items-center gap-2 text-white font-semibold text-lg">
            <Clock className="w-5 h-5 animate-pulse" />
            <motion.span
              key={clock}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="tracking-wider"
            >
              {clock}
            </motion.span>
          </div>
        </motion.div>

        {/* Left: Performers */}
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-3xl md:text-4xl font-extrabold text-center bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent mb-12"
          >
            Performers & Pills Today
          </motion.h1>

          {performers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-[50vh] gap-4 text-purple-300/70"
            >
              <Sparkles className="w-12 h-12 text-violet-400 opacity-50 animate-bounce" />
              <h2 className="text-xl">No performers or medicines yet</h2>
            </motion.div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {performers.map((perf, i) => (
                <motion.div
                  key={perf.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                >
                  <Card className="bg-gradient-to-br from-black/60 via-violet-900/20 to-black/50 border border-violet-400/20 shadow-xl rounded-2xl backdrop-blur-lg hover:shadow-violet-500/30 hover:scale-[1.02] transition-transform duration-300">
                    <CardHeader className="flex justify-between items-center">
                      <CardTitle className="text-xl text-fuchsia-300 flex items-center gap-2">
                        <Pill className="w-5 h-5 animate-bounce" /> {perf.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {perf.medicines?.length > 0 ? (
                        perf.medicines.map((med, idx) => (
                          <motion.div
                            key={med.id}
                            initial={{ opacity: 0, x: idx % 2 === 0 ? -40 : 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            className="p-4 rounded-lg bg-purple-900/20 border border-purple-500/30 flex flex-col gap-2"
                          >
                            <p className="font-medium text-violet-200 text-lg">{med.pill_name}</p>
                            <p className="text-sm text-purple-300">
                              Dosage: <span className="text-violet-100">{med.dosage}</span>
                            </p>
                            <p className="text-sm text-purple-300">
                              Time:{" "}
                              <span className="text-violet-100">
                                {med.time_of_day
                                  ? new Date(`1970-01-01T${med.time_of_day}`).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    })
                                  : "N/A"}
                              </span>
                            </p>
                            <p className="text-sm text-purple-300">
                              Frequency:{" "}
                              <span className="text-violet-100">{med.frequency || "N/A"}</span>
                            </p>
                          </motion.div>
                        ))
                      ) : (
                        <p className="text-purple-400/60 text-sm">No medicines added for this performer</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Adherence Calendar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-black/50 rounded-2xl border border-violet-500/30 shadow-lg p-4 self-start mt-10"
        >
          <h2 className="text-lg font-semibold text-violet-300 mb-4 text-center">
            Adherence Calendar
          </h2>

          <MedicineCalendar loggedMedicines={loggedMedicines} />

          <div className="mt-4 flex justify-center gap-4 text-sm text-white">
            <div className="flex items-center gap-1">
              <span className="w-4 h-4 bg-green-500 rounded-full inline-block"></span> 100%
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-4 bg-yellow-400 rounded-full inline-block"></span> 50–99%
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-4 bg-red-500 rounded-full inline-block"></span> 0–49%
            </div>
          </div>

          {adherenceData && (
            <div className="mt-6 text-center text-violet-200 space-y-1">
              <p>Total Logs: {adherenceData.total_logs}</p>
              <p>Taken: {adherenceData.taken_count}</p>
              <p>Missed: {adherenceData.missed_count}</p>
              <p>
                <strong>Overall Adherence:</strong>{" "}
                {adherenceData.adherence_percentage
                  ? `${adherenceData.adherence_percentage}%`
                  : "N/A"}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
};

export default Dashboard;
