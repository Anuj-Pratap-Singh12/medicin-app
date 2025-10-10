"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Sparkles, Pill, User, CheckCircle } from "lucide-react";
import { fetchPerformersWithLogs } from "@/integrations/supabase/frontendHelper";
import MedicineCalendar from "@/components/MedicineCalendar";

// 🩺 Typing Animated Heading with stethoscope emoji + ⚕️ symbol
const AnimatedGradientHeading = () => {
  const fullText = "Welcome to MedTrack";
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(fullText.slice(0, i + 1));
      i++;
      if (i === fullText.length) clearInterval(interval);
    }, 4000 / fullText.length); // ~4s total typing
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="flex items-center justify-center gap-3 mb-3"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1 }}
    >
      <span style={{ fontSize: "2.8rem" }}>🩺</span>
      <motion.h1
        className="gradient-text font-extrabold text-center"
        style={{
          fontSize: "3.8rem",
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
        }}
      >
        {displayedText}
      </motion.h1>
      <motion.span
        style={{ fontSize: "3.2rem" }}
        animate={{ y: [0, -10, 0, 8, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        ⚕️
      </motion.span>
    </motion.div>
  );
};

const Dashboard = () => {
  const [performers, setPerformers] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggedMedicines, setLoggedMedicines] = useState({});
  const [adherenceData, setAdherenceData] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) setUser(data.session.user);
    };
    fetchUser();
  }, []);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const performersList = await fetchPerformersWithLogs(user.id);
      setPerformers(performersList || []);
      const allLogs = {};
      performersList.forEach((p) => {
        p.medicines?.forEach((m) => {
          if (m.medicine_logs?.length) allLogs[m.id] = m.medicine_logs;
        });
      });
      setLoggedMedicines(allLogs);
      const { data: adherenceRows } = await supabase
        .from("vw_user_medicine_dashboard")
        .select("*")
        .eq("user_id", user.id);
      if (adherenceRows && adherenceRows.length > 0) {
        const total_logs = adherenceRows.reduce((s, r) => s + r.total_logs, 0);
        const taken_count = adherenceRows.reduce((s, r) => s + r.taken_count, 0);
        const missed_count = adherenceRows.reduce((s, r) => s + r.missed_count, 0);
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

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  if (loading)
    return (
      <Layout>
        <div
          className="flex flex-col items-center justify-center min-h-[70vh]"
          style={{
            background:
              "linear-gradient(180deg,#22216a 0%, #240c4a 38%, #140c2a 100%)",
          }}
        >
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="p-4 rounded-full"
            style={{
              background: "linear-gradient(90deg,#6a5cff, #7e56ff)",
              boxShadow: "0 12px 48px rgba(124,109,255,0.24)",
            }}
          >
            <Sparkles className="w-10 h-10 text-white/95" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1 }}
            className="mt-6 text-[#e6e6ff] text-lg"
          >
            Syncing your MedTrack universe...
          </motion.p>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div
        className="relative min-h-screen overflow-hidden text-white"
        style={{
          background:
            "linear-gradient(180deg,#22216a 0%, #240c4a 24%, #140c2a 100%)",
        }}
      >
        {/* --- HEADER --- */}
        <div
          className="relative flex flex-col items-center justify-center px-2 pt-12 pb-2 max-w-3xl mx-auto w-full"
          style={{ zIndex: 2 }}
        >
          <AnimatedGradientHeading />
          <div
            className="mt-3 mb-1 font-bold text-[#b3a4ff] flex items-center gap-2 justify-center subheading"
            style={{ fontSize: "1.7rem" }}
          >
            <User className="animated-icon w-6 h-6 text-[#6a5cff]" />
            Hello{" "}
            <span style={{ color: "#b3a4ff", fontWeight: 700 }}>
              {user?.user_metadata?.name || "User"}
            </span>
            <span>Check your scheduled medicines</span>
          </div>
          <div className="subheading-tip">
            <CheckCircle className="animated-icon w-6 h-6 text-[#ff8ab8]" />
            Consistency leads to better health.
          </div>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="w-full" style={{ height: "2.3rem" }} />
        <div className="px-2 md:px-8 mt-4 mb-6 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full">
          {/* Medicine boxes */}
          <div className="flex flex-col gap-6 w-full items-end">
            {performers.map((perf, i) => (
              <Card
                key={perf.id}
                className="bg-white/4 glassy rounded-2xl shadow-2xl hover:shadow-[#6a5cff]/18 medicine-box-anim"
                style={{
                  maxWidth: "98%",
                  minWidth: "220px",
                  width: "100%",
                  animationDelay: `${i * 0.14}s`,
                }}
              >
                <CardHeader>
                  <CardTitle className="text-[#f8f8ff] flex items-center gap-3 text-2xl">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(90deg,#b3a4ff,#6a5cff)",
                        boxShadow:
                          "0 8px 24px rgba(124,109,255,0.13)",
                      }}
                    >
                      <Pill className="w-4 h-4 text-white" />
                    </div>
                    {perf.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {perf.medicines.map((med, idx) => (
                    <motion.div
                      key={med.id}
                      initial={{ opacity: 0, x: idx % 2 === 0 ? -14 : 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.45, delay: idx * 0.06 }}
                      className="p-3 rounded-xl flex items-start justify-between gap-4 glassy"
                      style={{
                        border: "1px solid rgba(179,164,255,0.11)",
                      }}
                    >
                      <div>
                        <p className="font-semibold text-[#e9e7ff] text-lg">
                          {med.pill_name}
                        </p>
                        <p className="text-sm text-[#f8f8ff]/80">
                          💊 Dosage: {med.dosage}
                        </p>
                        <p className="text-sm text-[#f8f8ff]/80">
                          🕓 Time:{" "}
                          {new Date(
                            `1970-01-01T${med.time_of_day}`
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                        <p className="text-sm text-[#f8f8ff]/80">
                          🔁 {med.frequency}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div
                          className="w-9 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold"
                          style={{
                            background:
                              "linear-gradient(90deg, rgba(179,164,255,0.13), rgba(106,92,255,0.08))",
                            border:
                              "1px solid rgba(255,255,255,0.02)",
                            boxShadow:
                              "0 6px 18px rgba(99,102,241,0.04)",
                          }}
                        >
                          {med.short_label || "Pill"}
                        </div>
                        <motion.div
                          animate={{ scale: [1, 1.06, 1] }}
                          transition={{
                            repeat: Infinity,
                            duration: 2.2,
                            ease: "easeInOut",
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{
                            background:
                              "linear-gradient(90deg, rgba(179,164,255,0.24), rgba(106,92,255,0.18))",
                            boxShadow:
                              "0 6px 20px rgba(106,92,255,0.08)",
                          }}
                        >
                          <Pill className="w-4 h-4" />
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.15 }}
            className="bg-white/3 glassy rounded-2xl p-6 shadow-2xl mb-4 calendar-anim"
            style={{ width: "100%" }}
          >
            <div className="adherence-calendar-title">
              Adherence Calendar
            </div>
            <div className="mb-6">
              <MedicineCalendar loggedMedicines={loggedMedicines} />
            </div>
            {adherenceData && (
              <div
                className="adherence-stats text-center text-[#f8f8ff]"
                style={{ position: "relative" }}
              >
                <div className="adherence-icon-row">
                  <CheckCircle className="adherence-icon text-[#ff8ab8]" />
                  <Pill className="adherence-icon text-[#b3a4ff]" />
                  <Pill className="adherence-icon text-[#6a5cff]" />
                  <Pill className="adherence-icon text-[#ff8ab8]" />
                </div>
                <div className="adherence-words">
                  <p>Total Logs: {adherenceData.total_logs}</p>
                  <p>Taken: {adherenceData.taken_count}</p>
                  <p>Missed: {adherenceData.missed_count}</p>
                  <p>
                    Overall Adherence:{" "}
                    <span className="font-bold">
                      {adherenceData.adherence_percentage || "N/A"}%
                    </span>
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
