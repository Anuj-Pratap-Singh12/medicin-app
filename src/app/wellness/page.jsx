"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Target } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const WellnessPage = () => {
  const [performers, setPerformers] = useState([]);
  const [selectedPerformer, setSelectedPerformer] = useState(null);
  const [logData, setLogData] = useState([]);
  const [takenCount, setTakenCount] = useState(0);
  const [missedCount, setMissedCount] = useState(0);
  const [user, setUser] = useState(null);

  // Fetch user session
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

  // Fetch performers
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

  // Fetch logs for selected performer
// Fetch logs for selected performer
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

      // Fetch logs for all medicines of the performer
      const { data, error } = await supabase
        .from("medicine_logs")
        .select(`
          status,
          timestamp,
          medicines!inner(performer_id)
        `)
        .gte("timestamp", sevenDaysAgo.toISOString())
        .eq("medicines.performer_id", selectedPerformer.id)
        .order("timestamp", { ascending: true });

      if (error) throw error;

      const logs = data || [];

      // Count taken vs missed
      const taken = logs.filter((log) => log.status === "Taken").length;
      const missed = logs.filter((log) => log.status === "Missed").length;

      setLogData(logs);
      setTakenCount(taken);
      setMissedCount(missed);
    } catch (err) {
      console.error("fetchLogs error:", err);
      setLogData([]);
      setTakenCount(0);
      setMissedCount(0);
    }
  };

  fetchLogs();
}, [selectedPerformer]);

  const COLORS = ["#a78bfa", "#f472b6"]; // violet, pink
  const chartData = [
    { name: "Taken", value: takenCount },
    { name: "Missed", value: missedCount },
  ];

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="flex min-h-screen bg-black text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 relative p-8 overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="mb-6 text-center relative z-10"
        >
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent mb-3">
            Wellness Dashboard
          </h1>
          <p className="text-purple-200/60">Track adherence per performer</p>

          {/* Performer dropdown */}
          <select
            value={selectedPerformer?.id || ""}
            onChange={(e) => {
              const perf = performers.find((p) => p.id === Number(e.target.value));
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

        {/* Stats */}
        <div className="grid gap-8 md:grid-cols-2 z-10 relative">
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-black/40 border border-purple-500/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-purple-200">
                  Weekly Adherence
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-fuchsia-300" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-violet-300">
                  {takenCount + missedCount > 0
                    ? ((takenCount / (takenCount + missedCount)) * 100).toFixed(1) + "%"
                    : "0%"}
                </div>
                <p className="text-xs text-purple-300/70">Adherence over last 7 days</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="bg-black/40 border border-purple-500/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-purple-200">
                  Total Logs
                </CardTitle>
                <Target className="h-5 w-5 text-fuchsia-300" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-violet-300">
                  {takenCount + missedCount}
                </div>
                <p className="text-xs text-purple-300/70">Taken + Missed entries</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Chart */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-8 z-10 relative"
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
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default WellnessPage;
