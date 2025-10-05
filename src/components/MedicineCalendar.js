"use client";

import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { supabase } from "@/integrations/supabase/client";

const MedicineCalendar = ({ userId }) => {
  const [date, setDate] = useState(new Date());
  const [takenDates, setTakenDates] = useState([]); // Dates where all medicines taken
  const [loading, setLoading] = useState(true);

  // Fetch logs from Supabase
  const fetchLogs = async () => {
    if (!userId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("medicine_logs")
      .select("date, status")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching logs:", error);
      setTakenDates([]);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setTakenDates([]);
      setLoading(false);
      return;
    }

    // Group logs by date
    const grouped = data.reduce((acc, log) => {
      const d = new Date(log.date).toDateString();
      if (!acc[d]) acc[d] = [];
      acc[d].push(log);
      return acc;
    }, {});

    // Only dates where all medicines were taken
    const completedDates = Object.entries(grouped)
      .filter(([_, logs]) => logs.every((l) => l.status === "Taken"))
      .map(([date]) => date);

    setTakenDates(completedDates);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;

    fetchLogs();

    // Real-time updates
    const subscription = supabase
      .channel("medicine-logs-calendar")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "medicine_logs",
          filter: `user_id=eq.${userId}`,
        },
        fetchLogs
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [userId]);

  const tileClassName = ({ date: tileDate, view }) => {
    if (view === "month") {
      const d = tileDate.toDateString();
      if (takenDates.includes(d)) return "bg-green-500 text-white rounded-full";
      return "bg-yellow-400 text-black rounded-full";
    }
  };

  return (
    <div className="flex flex-col items-center mt-10">
      {loading && <p className="mb-2 text-gray-500">Loading...</p>}
      <Calendar
        onChange={setDate}
        value={date}
        tileClassName={tileClassName}
        prevLabel="<"
        nextLabel=">"
        showNeighboringMonth={true}
      />
    </div>
  );
};

export default MedicineCalendar;
