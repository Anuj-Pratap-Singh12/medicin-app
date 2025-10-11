"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Sparkles, Clock, Pill, User, CheckCircle } from "lucide-react";
import { fetchPerformersWithLogs } from "@/integrations/supabase/frontendHelper";
import MedicineCalendar from "@/components/MedicineCalendar";

// Animated Heading
const AnimatedGradientHeading = () => {
  const fullText = "Welcome to MedTrack";
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(fullText.slice(0, i + 1));
      i++;
      if (i === fullText.length) clearInterval(interval);
    }, 4000 / fullText.length);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div className="flex items-center justify-center gap-3 mb-3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
      <span style={{ fontSize: "2.8rem" }}>🩺</span>
      <motion.h1 className="gradient-text font-extrabold text-center" style={{ fontSize: "3.8rem", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
        {displayedText}
      </motion.h1>
      <motion.span style={{ fontSize: "3.2rem" }} animate={{ y: [0, -10, 0, 8, 0], scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>⚕️</motion.span>
    </motion.div>
  );
};

const Dashboard = () => {
  const [performers, setPerformers] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggedMedicines, setLoggedMedicines] = useState({});
  const [adherenceData, setAdherenceData] = useState(null);
  const [clock, setClock] = useState("");

  // Fetch session user
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
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch performers & adherence
  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const performersList = await fetchPerformersWithLogs(user.id);
      setPerformers(performersList || []);
      const allLogs = {};
      performersList.forEach((p) => p.medicines?.forEach((m) => { if (m.medicine_logs?.length) allLogs[m.id] = m.medicine_logs; }));
      setLoggedMedicines(allLogs);

      const { data: adherenceRows } = await supabase.from("vw_user_medicine_dashboard").select("*").eq("user_id", user.id);
      if (adherenceRows?.length) {
        const total_logs = adherenceRows.reduce((s, r) => s + r.total_logs, 0);
        const taken_count = adherenceRows.reduce((s, r) => s + r.taken_count, 0);
        const missed_count = adherenceRows.reduce((s, r) => s + r.missed_count, 0);
        const adherence_percentage = total_logs > 0 ? Math.round((taken_count / total_logs) * 100) : null;
        setAdherenceData({ total_logs, taken_count, missed_count, adherence_percentage });
      }
    } catch (err) {
      console.error(err);
      setAdherenceData(null);
    }
    setLoading(false);
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  // Animated background pills
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

  const BackgroundPill = ({ p }) => (
    <div role="presentation" aria-hidden className="absolute pointer-events-none transform-gpu" style={{
      left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size / 2.2, borderRadius: p.size,
      transform: `translate(-50%, -50%) rotate(${p.rotate}deg)`,
      background: `rgba(255,255,255,${0.6 + p.opacity * 0.4})`,
      boxShadow: `0 6px ${Math.max(8, p.size / 4)}px rgba(255,255,255,0.15)`,
      filter: `blur(${Math.min(12, p.size / 2)}px)`, opacity: Math.min(1, 0.6 + p.opacity),
      mixBlendMode: "screen", animation: `floatPill ${p.duration}s ease-in-out ${p.delay}s infinite`,
      border: "1px solid rgba(255,255,255,0.2)"
    }} />
  );

  const FloatingCapsule = ({ delay = 0, left = "10%", top = "50%", size = 48, rotate = 0, icon = "pill", symmetric = false }) => {
    const amplitude = 32 + Math.random() * 16;
    const xAmplitude = 22 + Math.random() * 14;
    return (
      <motion.div initial={{ opacity: 0, y: 0 }} animate={{
        opacity: [0.12, 0.75, 0.12],
        y: symmetric ? [0, -amplitude / 2, 0] : [0, -amplitude, 0, -amplitude / 2, 0],
        x: symmetric ? [0, xAmplitude / 2, 0] : [0, xAmplitude, 0, -xAmplitude / 2, 0],
        rotate: [rotate, rotate + 12, rotate - 12, rotate],
      }} transition={{ duration: 10 + Math.random() * 6, delay, repeat: Infinity, ease: "easeInOut" }} style={{ left, top, width: size, height: size, transformOrigin: "center", position: "absolute" }}>
        <div className="relative flex items-center justify-center">
          <div aria-hidden className="absolute rounded-full" style={{ width: size * 2.1, height: size * 2.1, filter: "blur(22px)", opacity: 0.28, background: "radial-gradient(circle at 30% 30%, rgba(255,110,170,0.18), rgba(120,85,255,0.12) 36%, transparent 60%)" }} />
          <div className="rounded-full p-1 flex items-center justify-center" style={{ width: size, height: size, background: "linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))", boxShadow: "0 8px 28px rgba(99,102,241,0.12), inset 0 -6px 12px rgba(0,0,0,0.30)", borderRadius: size, border: "1px solid rgba(255,255,255,0.03)" }}>
            {icon === "pill" ? <Pill className="w-4 h-4 text-white/90" /> : <User className="w-4 h-4 text-white/90" />}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[70vh]" style={{ background: "linear-gradient(180deg,#22216a 0%, #240c4a 38%, #140c2a 100%)" }}>
        <motion.div animate={{ rotate: 360, scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="p-4 rounded-full" style={{ background: "linear-gradient(90deg,#6a5cff, #7e56ff)", boxShadow: "0 12px 48px rgba(124,109,255,0.24)" }}>
          <Sparkles className="w-10 h-10 text-white/95" />
        </motion.div>
        <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1 }} className="mt-6 text-[#e6e6ff] text-lg">
          Syncing your MedTrack universe...
        </motion.p>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="relative min-h-screen overflow-hidden text-white" style={{ background: "radial-gradient(1200px 700px at 12% 10%, rgba(255,95,162,0.07), transparent 7%), radial-gradient(900px 420px at 86% 80%, rgba(150,85,220,0.06), transparent 12%), linear-gradient(180deg,#040012 0%, #12021a 26%, #020009 100%)" }}>
        <div aria-hidden className="absolute inset-0 -z-20 overflow-hidden">
          <div aria-hidden className="absolute inset-0 -z-20" style={{ background: "radial-gradient(600px 320px at 20% 20%, rgba(255,95,162,0.06), transparent 10%), radial-gradient(520px 240px at 82% 78%, rgba(140,95,240,0.04), transparent 12%)", filter: "blur(36px) saturate(1.05)" }} />
          <div className="absolute inset-0 -z-10">{pills.map(p => <BackgroundPill key={p.id} p={p} />)}</div>
        </div>

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

        {/* HEADER */}
        <div className="relative flex flex-col items-center justify-center px-2 pt-12 pb-2 max-w-3xl mx-auto w-full z-10">
          <AnimatedGradientHeading />
          <div className="mt-3 mb-1 font-bold text-[#b3a4ff] flex items-center gap-2 justify-center subheading" style={{ fontSize: "1.7rem" }}>
            <User className="animated-icon w-6 h-6 text-[#6a5cff]" />
            Hello <span style={{ color: "#b3a4ff", fontWeight: 700 }}>{user?.user_metadata?.name || "User"}</span>, check your scheduled medicines
          </div>
          <div className="subheading-tip flex items-center gap-2">
            <CheckCircle className="animated-icon w-6 h-6 text-[#ff8ab8]" />
            Consistency leads to better health.
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="px-2 md:px-8 mt-4 mb-12 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Performer Medicine Cards */}
          <div className="flex flex-col gap-6 w-full items-end">
            {performers.map((perf, i) => (
              <Card key={perf.id} className="bg-white/4 glassy rounded-2xl shadow-2xl hover:shadow-[#6a5cff]/18 medicine-box-anim" style={{ width: "100%", animationDelay: `${i * 0.14}s` }}>
                <CardHeader>
                  <CardTitle className="text-[#f8f8ff] flex items-center gap-3 text-2xl">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(90deg,#b3a4ff,#6a5cff)", boxShadow: "0 8px 24px rgba(124,109,255,0.13)" }}>
                      <Pill className="w-4 h-4 text-white" />
                    </div>
                    {perf.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {perf.medicines.map((med, idx) => (
                    <motion.div key={med.id} initial={{ opacity: 0, x: idx % 2 === 0 ? -14 : 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: idx * 0.06 }} className="p-3 rounded-xl flex items-start justify-between gap-4 glassy" style={{ border: "1px solid rgba(179,164,255,0.11)" }}>
                      <div>
                        <p className="font-semibold text-[#e9e7ff] text-lg">{med.pill_name}</p>
                        <p className="text-sm text-[#f8f8ff]/80">💊 Dosage: {med.dosage}</p>
                        <p className="text-sm text-[#f8f8ff]/80">🕓 Time: {new Date(`1970-01-01T${med.time_of_day}`).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}</p>
                        <p className="text-sm text-[#f8f8ff]/80">🔁 {med.frequency}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="w-9 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ background: "linear-gradient(90deg, rgba(179,164,255,0.13), rgba(106,92,255,0.08))", border: "1px solid rgba(255,255,255,0.02)", boxShadow: "0 6px 18px rgba(99,102,241,0.04)" }}>
                          {med.short_label || "Pill"}
                        </div>
                        <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(90deg, rgba(179,164,255,0.24), rgba(106,92,255,0.18))", boxShadow: "0 6px 20px rgba(106,92,255,0.08)" }}>
                          <Pill className="w-4 h-4" />
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Adherence Calendar */}
          <div className="bg-white/3 backdrop-blur-2xl border border-[#b887ff]/8 rounded-2xl p-5 shadow-2xl">
            <h2 className="text-2xl font-bold text-center mb-5" style={{ background: "linear-gradient(90deg, #ff8ab8, #b887ff)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Adherence Calendar</h2>
            <MedicineCalendar loggedMedicines={loggedMedicines} />
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

        {/* Chatbot */}
        <ChatbotWidget />
      </div>
    </Layout>
  );
};

// Chatbot Widget
const ChatbotWidget = () => {
  useEffect(() => {
    const iframe = document.createElement("iframe");
    iframe.src = "https://cdn.botpress.cloud/webchat/v3.3/shareable.html?configUrl=https://files.bpcontent.cloud/2025/10/11/00/20251011005231-Q44JAFSO.json";
    iframe.style.position = "fixed"; iframe.style.bottom = "20px"; iframe.style.right = "20px"; iframe.style.width = "400px"; iframe.style.height = "500px"; iframe.style.border = "none"; iframe.style.borderRadius = "20px"; iframe.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)"; iframe.style.zIndex = "9999"; iframe.style.display = "none"; iframe.id = "bp-chatbot-iframe";
    document.body.appendChild(iframe);

    const chatButton = document.createElement("div");
    chatButton.innerHTML = `<span class="mr-2">💬</span>Chat with MedTrack`;
    Object.assign(chatButton.style, { position: "fixed", bottom: "540px", right: "20px", backgroundColor: "#221E65", color: "#fff", padding: "12px 22px", borderRadius: "30px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 5px 20px rgba(0,0,0,0.3)", zIndex: "10000", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s ease" });
    chatButton.onclick = () => { iframe.style.display = iframe.style.display === "none" ? "block" : "none"; };
    document.body.appendChild(chatButton);

    return () => { document.body.removeChild(iframe); document.body.removeChild(chatButton); };
  }, []);
  return null;
};

export default Dashboard;
