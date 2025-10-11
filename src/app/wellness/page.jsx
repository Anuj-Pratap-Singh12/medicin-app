"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Target } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const WellnessPage = () => {
  const [performers, setPerformers] = useState([]);
  const [selectedPerformer, setSelectedPerformer] = useState(null);
  const [logData, setLogData] = useState([]);
  const [takenCount, setTakenCount] = useState(0);
  const [missedCount, setMissedCount] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data?.session?.user) setUser(data.session.user);
      } catch (err) {
        console.error("Error fetching user session:", err);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchPerformers = async () => {
      try {
        const { data, error } = await supabase
          .from("performers")
          .select("*")
          .eq("user_id", user.id);
        if (error) throw error;
        setPerformers(data || []);
      } catch (err) {
        console.error("Error fetching performers:", err);
      }
    };
    fetchPerformers();
  }, [user]);

  useEffect(() => {
    if (!selectedPerformer) {
      setLogData([]);
      setTakenCount(0);
      setMissedCount(0);
      return;
    }

    const fetchLogs = async () => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data, error } = await supabase
          .from("medicine_logs")
          .select(`status,timestamp,medicines!inner(performer_id)`)
          .gte("timestamp", sevenDaysAgo.toISOString())
          .eq("medicines.performer_id", selectedPerformer.id)
          .order("timestamp", { ascending: true });

        if (error) throw error;

        const logs = data || [];
        setTakenCount(logs.filter((l) => l.status === "Taken").length);
        setMissedCount(logs.filter((l) => l.status === "Missed").length);
        setLogData(logs);
      } catch (err) {
        console.error("fetchLogs error:", err);
        setLogData([]);
        setTakenCount(0);
        setMissedCount(0);
      }
    };

    fetchLogs();
  }, [selectedPerformer]);

  const COLORS = ["#a78bfa", "#f472b6"]; // purple-pink gradient
  const chartData = [
    { name: "Taken", value: takenCount },
    { name: "Missed", value: missedCount },
  ];

  const barData = [
    { status: "Taken", count: takenCount },
    { status: "Missed", count: missedCount },
  ];

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div
      className="flex min-h-screen text-white relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg,#22216a 0%, #240c4a 38%, #140c2a 100%)",
      }}
    >
      <Sidebar />

      {/* Floating Glows */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 left-0 w-64 h-64 bg-[#6a5cff]/20 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-0 right-0 w-64 h-64 bg-[#ff8ab8]/20 rounded-full blur-3xl"
      />

      <main className="flex-1 relative p-8 overflow-hidden z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="mb-6 text-center"
        >
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-[#6a5cff] via-[#5b4bff] to-[#3f2fff] bg-clip-text text-transparent mb-3">
            Wellness Dashboard
          </h1>
          <p className="text-purple-200/60">Track adherence per performer</p>

          <select
            value={selectedPerformer?.id || ""}
            onChange={(e) => {
              const perf = performers.find(
                (p) => p.id === Number(e.target.value)
              );
              setSelectedPerformer(perf || null);
            }}
            className="mt-4 px-3 py-2 rounded-lg bg-black/40 border border-purple-500 text-white"
          >
            <option value="">Select Performer</option>
            {performers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid gap-8 md:grid-cols-2">
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-black/40 border border-purple-500/30 shadow-[0_0_20px_rgba(167,139,250,0.3)]">
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-purple-200">
                  Weekly Adherence
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-fuchsia-300" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-violet-300">
                  {takenCount + missedCount > 0
                    ? ((takenCount / (takenCount + missedCount)) * 100).toFixed(
                        1
                      ) + "%"
                    : "0%"}
                </div>
                <p className="text-xs text-purple-300/70">
                  Adherence over last 7 days
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="bg-black/40 border border-purple-500/30 shadow-[0_0_20px_rgba(244,114,182,0.3)]">
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-purple-200">
                  Total Logs
                </CardTitle>
                <Target className="h-5 w-5 text-fuchsia-300" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-violet-300">
                  {takenCount + missedCount}
                </div>
                <p className="text-xs text-purple-300/70">
                  Taken + Missed entries
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Pie & Bar Charts */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <Card className="bg-black/40 border border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-purple-200">
                  Weekly Ritual Status (Taken vs Missed)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {takenCount + missedCount === 0 ? (
                  <p className="text-purple-400/70 italic text-center mt-20">
                    ✨ No logs yet for selected performer ✨
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(20,12,42,0.9)",
                          border: "none",
                          color: "#fff",
                        }}
                      />
                      <Legend wrapperStyle={{ color: "#ccc" }} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <Card className="bg-black/40 border border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-purple-200">
                  Weekly Ritual Status - Bar Chart
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {takenCount + missedCount === 0 ? (
                  <p className="text-purple-400/70 italic text-center mt-20">
                    ✨ No logs yet for selected performer ✨
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                      <CartesianGrid stroke="#444" strokeDasharray="3 3" />
                      <XAxis dataKey="status" tick={{ fill: "#ccc" }} />
                      <YAxis tick={{ fill: "#ccc" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(20,12,42,0.9)",
                          border: "none",
                          color: "#fff",
                        }}
                      />
                      <Bar dataKey="count" fill="#a78bfa" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="count" fill="#f472b6" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default WellnessPage;
