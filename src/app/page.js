"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Sparkles, Clock, Pill, User, MessageCircle } from "lucide-react";
import { fetchPerformersWithLogs } from "@/integrations/supabase/frontendHelper";
import MedicineCalendar from "@/components/MedicineCalendar";

const Dashboard = () => {
  const [performers, setPerformers] = useState([]);
  const [user, setUser] = useState(null);
  const [clock, setClock] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggedMedicines, setLoggedMedicines] = useState({});
  const [adherenceData, setAdherenceData] = useState(null);

  // -----------------
  // Fetch session user
  // -----------------
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) setUser(data.session.user);
    };
    fetchUser();
  }, []);

  // -----------------
  // Clock updater
  // -----------------
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

  // -----------------
  // Fetch performers and adherence data
  // -----------------
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

  // -----------------------------
  // Animated pill field generator
  // -----------------------------
  const NUM_PILLS = 120;
  const pills = useMemo(() => {
    const arr = [];
    for (let i = 0; i < NUM_PILLS; i++) {
      const size = 18 + Math.round(Math.random() * 36);
      const left = Math.round(Math.random() * 100);
      const top = Math.round(Math.random() * 100);
      const duration = 10 + Math.random() * 22;
      const delay = Math.random() * -32;
      const rotate = Math.round(Math.random() * 360);
      const opacity = 0.06 + Math.random() * 0.32;
      arr.push({ id: `pill_${i}`, size, left, top, duration, delay, rotate, opacity });
    }
    return arr;
  }, []);

  const BackgroundPill = ({ p }) => {
    const { size, left, top, duration, delay, rotate, opacity } = p;
    return (
      <div
        role="presentation"
        aria-hidden
        key={p.id}
        className="absolute pointer-events-none transform-gpu"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          width: size,
          height: size / 2.2,
          borderRadius: size,
          transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
          background: `rgba(255,255,255,${0.6 + opacity * 0.4})`,
          boxShadow: `0 6px ${Math.max(8, size / 4)}px rgba(255,255,255,0.15)`,
          filter: `blur(${Math.min(12, size / 2)}px)`,
          opacity: Math.min(1, 0.6 + opacity),
          mixBlendMode: "screen",
          animation: `floatPill ${duration}s ease-in-out ${delay}s infinite`,
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      />
    );
  };

  const FloatingCapsule = ({ delay = 0, left = "10%", top = "50%", size = 48, rotate = 0, icon = "pill", symmetric = false }) => {
    const amplitude = 32 + Math.random() * 16;
    const xAmplitude = 22 + Math.random() * 14;

    return (
      <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{
          opacity: [0.12, 0.75, 0.12],
          y: symmetric ? [0, -amplitude, 0] : [0, -amplitude, 0, -amplitude / 2, 0],
          x: symmetric ? [0, xAmplitude / 2, 0] : [0, xAmplitude, 0, -xAmplitude / 2, 0],
          rotate: [rotate, rotate + 12, rotate - 12, rotate],
        }}
        transition={{ duration: 10 + Math.random() * 6, delay, repeat: Infinity, ease: "easeInOut" }}
        style={{ left, top, width: size, height: size, transformOrigin: "center", position: "absolute" }}
      >
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden
            className="absolute rounded-full"
            style={{
              width: size * 2.1,
              height: size * 2.1,
              filter: "blur(22px)",
              opacity: 0.28,
              background: "radial-gradient(circle at 30% 30%, rgba(255,110,170,0.18), rgba(120,85,255,0.12) 36%, transparent 60%)",
            }}
          />
          <div
            className="rounded-full p-1"
            style={{
              width: size,
              height: size,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
              boxShadow: "0 8px 28px rgba(99,102,241,0.12), inset 0 -6px 12px rgba(0,0,0,0.30)",
              borderRadius: size,
              border: "1px solid rgba(255,255,255,0.03)",
            }}
          >
            {icon === "pill" ? <Pill className="w-4 h-4 text-white/90" /> : <User className="w-4 h-4 text-white/90" />}
          </div>
        </div>
      </motion.div>
    );
  };

  // -----------------
  // Loading state
  // -----------------
  if (loading)
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[70vh]" style={{ background: "radial-gradient(800px 380px at 10% 12%, rgba(255,95,162,0.06), transparent 8%), linear-gradient(180deg,#05010f 0%, #11021a 28%, #05010a 100%)" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="p-4 rounded-full" style={{ background: "linear-gradient(90deg,#ff5fa2, #8b5cf6)", boxShadow: "0 12px 48px rgba(255,95,162,0.12)" }}>
            <Sparkles className="w-10 h-10 text-white/95" />
          </motion.div>
          <p className="mt-6 text-[#ffd6f0] text-lg">Syncing your MedTrack universe...</p>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="relative min-h-screen overflow-hidden text-white" style={{ background: "radial-gradient(1200px 700px at 12% 10%, rgba(255,95,162,0.07), transparent 7%), radial-gradient(900px 420px at 86% 80%, rgba(150,85,220,0.06), transparent 12%), linear-gradient(180deg,#040012 0%, #12021a 26%, #020009 100%)" }}>
        {/* background pills */}
        <div aria-hidden className="absolute inset-0 -z-20 overflow-hidden">
          <div aria-hidden className="absolute inset-0 -z-20" style={{ background: "radial-gradient(600px 320px at 20% 20%, rgba(255,95,162,0.06), transparent 10%), radial-gradient(520px 240px at 82% 78%, rgba(140,95,240,0.04), transparent 12%)", filter: "blur(36px) saturate(1.05)" }} />
          <div className="absolute inset-0 -z-10">{pills.map((p) => <BackgroundPill key={p.id} p={p} />)}</div>
        </div>

        {/* floating capsules */}
        <FloatingCapsule delay={0.3} left="8%" top="12%" size={68} rotate={-12} icon="pill" />
        <FloatingCapsule delay={1.9} left="86%" top="10%" size={86} rotate={18} icon="user" />
        <FloatingCapsule delay={2.6} left="26%" top="74%" size={72} rotate={-8} icon="pill" />
        <FloatingCapsule delay={3.1} left="72%" top="62%" size={54} rotate={8} icon="pill" />
        <FloatingCapsule delay={4.6} left="46%" top="36%" size={110} rotate={4} icon="user" />

        {/* Clock */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="fixed top-5 right-5 px-4 py-2 rounded-full shadow-2xl border z-50" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))", borderColor: "rgba(255,95,162,0.07)", backdropFilter: "blur(6px)" }}>
          <div className="flex items-center gap-2 text-[#ffdff6] font-semibold text-sm">
            <Clock className="w-5 h-5 animate-pulse" />
            <motion.span key={clock} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>{clock}</motion.span>
          </div>
        </motion.div>

        {/* Title */}
        <div className="pt-14 pb-6 px-6 text-center max-w-4xl mx-auto relative z-10">
          <motion.h1 className="title-size font-extrabold mb-3 medtrack-shimmer" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1 }} style={{ fontSize: "3.2rem", background: "linear-gradient(90deg, #ff6aa8 0%, #b887ff 45%, #7c6dff 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", textShadow: "0 18px 48px rgba(124,109,255,0.08)", letterSpacing: "-0.001em", wordSpacing: "0.5em", lineHeight: 1.05, display: "inline-flex", flexWrap: "wrap" }}>
            {"Welcome to MedTrack".split("").map((c, idx) => (
              <motion.span key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }} style={{ display: "inline-flex", width: c === " " ? "0.5em" : "auto" }}>
                {c === " " ? "\u00A0" : c}
              </motion.span>
            ))}
          </motion.h1>
          <motion.p className="text-[#ffdff6]/90 mb-6 max-w-xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }} style={{ letterSpacing: "0.06em" }}>
            We’ll help you keep on top of your medications — glowing reminders, adherence insights and a calendar to track progress.
          </motion.p>
        </div>

        {/* Main grid */}
        <div className="px-6 pb-12 relative z-10 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8">
          {/* performers */}
          <div className="space-y-6">
            {performers.map((perf) => (
              <Card key={perf.id} className="bg-white/4 backdrop-blur-xl border border-[#b887ff]/10 rounded-2xl shadow-2xl hover:shadow-[#ff8ac4]/20 transition-transform hover:scale-[1.01] mx-auto" style={{ maxWidth: "720 px", width: "100%" }}>
                <CardHeader>
                  <CardTitle className="text-[#ffdff6] flex items-center gap-3 text-2xl">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(90deg,#ff7aa8,#8b5cf6)", boxShadow: "0 8px 24px rgba(139,92,246,0.12)" }}>
                      <Pill className="w-4 h-4 text-white" />
                    </div>
                    {perf.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {perf.medicines.map((med, idx) => (
                    <motion.div key={med.id} initial={{ opacity: 0, x: idx % 2 === 0 ? -14 : 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: idx * 0.06 }} className="p-3 rounded-xl flex items-start justify-between gap-4" style={{ background: "linear-gradient(180deg, rgba(12,6,20,0.44), rgba(14,8,28,0.26))", border: "1px solid rgba(200,140,255,0.06)" }}>
                      <div>
                        <p className="font-semibold text-[#e9e7ff] text-lg">{med.pill_name}</p>
                        <p className="text-sm text-[#ffdff6]/80">💊 Dosage: {med.dosage}</p>
                        <p className="text-sm text-[#ffdff6]/80">🕓 Time: {new Date(`1970-01-01T${med.time_of_day}`).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}</p>
                        <p className="text-sm text-[#ffdff6]/80">🔁 {med.frequency}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="w-9 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ background: "linear-gradient(90deg, rgba(255,95,162,0.12), rgba(139,92,246,0.08))", border: "1px solid rgba(255,255,255,0.02)", boxShadow: "0 6px 18px rgba(99,102,241,0.04)" }}>
                          {med.short_label || "Pill"}
                        </div>
                        <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(90deg, rgba(255,95,162,0.24), rgba(99,102,241,0.18))", boxShadow: "0 6px 20px rgba(99,102,241,0.06)" }}>
                          <Pill className="w-4 h-4" />
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* calendar + adherence */}
          <div className="bg-white/3 backdrop-blur-2xl border border-[#b887ff]/8 rounded-2xl p-5 shadow-2xl">
            <h2 className="text-2xl font-bold text-center mb-5" style={{ background: "linear-gradient(90deg, #ff8ab8, #b887ff)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              Adherence Calendar
            </h2>
            <div className="mb-6">
              <MedicineCalendar loggedMedicines={loggedMedicines} />
            </div>
            {adherenceData && (
              <div className="mt-4 text-center text-[#ffdff6] space-y-2">
                <p>Total Logs: {adherenceData.total_logs}</p>
                <p>Taken: {adherenceData.taken_count}</p>
                <p>Missed: {adherenceData.missed_count}</p>
                <p>Overall Adherence: <span className="font-bold">{adherenceData.adherence_percentage || "N/A"}%</span></p>
              </div>
            )}
          </div>
        </div>

        {/* -------------------
          Chatbot Floating Button
        ------------------- */}
        <ChatbotWidget />

      </div>
    </Layout>
  );
};

// -------------------
// Chatbot Widget Component
// -------------------
const ChatbotWidget = () => {
  useEffect(() => {
    // Create iframe
    const iframe = document.createElement("iframe");
    iframe.src = "https://cdn.botpress.cloud/webchat/v3.3/shareable.html?configUrl=https://files.bpcontent.cloud/2025/10/11/00/20251011005231-Q44JAFSO.json";
    iframe.style.position = "fixed";
    iframe.style.bottom = "20px";
    iframe.style.right = "20px";
    iframe.style.width = "400px";
    iframe.style.height = "500px";
    iframe.style.border = "none";
    iframe.style.borderRadius = "20px";
    iframe.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";
    iframe.style.zIndex = "9999";
    iframe.style.display = "none";
    iframe.id = "bp-chatbot-iframe";
    document.body.appendChild(iframe);

    // Floating chat button
    const chatButton = document.createElement("div");
    chatButton.innerHTML = `<span class="mr-2">💬</span>Chat with MedTrack`;
    chatButton.style.position = "fixed";
    chatButton.style.bottom = "540px";
    chatButton.style.right = "20px";
    chatButton.style.backgroundColor = "#221E65";
    chatButton.style.color = "#fff";
    chatButton.style.padding = "12px 22px";
    chatButton.style.borderRadius = "30px";
    chatButton.style.fontWeight = "bold";
    chatButton.style.cursor = "pointer";
    chatButton.style.boxShadow = "0 5px 20px rgba(0,0,0,0.3)";
    chatButton.style.zIndex = "10000";
    chatButton.style.transition = "all 0.3s ease";
    chatButton.style.display = "flex";
    chatButton.style.alignItems = "center";
    chatButton.style.justifyContent = "center";

    chatButton.onclick = () => {
      if (iframe.style.display === "none") {
        iframe.style.display = "block";
        chatButton.style.transform = "translateY(10px)";
      } else {
        iframe.style.display = "none";
        chatButton.style.transform = "translateY(0)";
      }
    };
    document.body.appendChild(chatButton);

    return () => {
      document.body.removeChild(iframe);
      document.body.removeChild(chatButton);
    };
  }, []);

  return null;
};

export default Dashboard;
