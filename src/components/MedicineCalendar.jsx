"use client";

import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./calendarFix.css";

const formatDate = (date) => date.toISOString().split("T")[0];

export default function InteractiveCalendar() {
  const [date, setDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);

  const today = new Date();
  const dummyData = {};

  // Fill past dates with random status
  for (let i = 1; i <= today.getDate(); i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), i);
    const formatted = formatDate(d);
    const rand = Math.random();
    if (rand < 0.4) dummyData[formatted] = "green";
    else if (rand < 0.7) dummyData[formatted] = "yellow";
    else dummyData[formatted] = "red";
  }

  const messages = {
    green: "Potion administered successfully ✅",
    yellow: "Ritual rescheduled ⚠️",
    red: "Elixir missed ❌",
  };

  const tileContent = ({ date: tileDate, view }) => {
    if (view !== "month") return null;
    const d = formatDate(tileDate);
    const status = dummyData[d];
    if (!status) return null;

    return (
      <motion.div
        className={`w-2 h-2 rounded-full absolute top-2 right-2`}
        style={{
          backgroundColor:
            status === "green"
              ? "#32CD99"
              : status === "yellow"
              ? "#FFC857"
              : "#FF6B6B",
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
      />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative max-w-md mx-auto mt-10 p-6 rounded-2xl shadow-2xl bg-[#140c2a]/60 backdrop-blur-lg border border-[#3f2fff]/40 text-white"
    >
      <h2 className="text-2xl font-bold text-center mb-4 text-[#b3a4ff]">
        Alchemist's Ritual Calendar
      </h2>

      <div className="rounded-lg shadow-inner relative">
        <AnimatePresence>
          {hoveredDate && dummyData[hoveredDate] && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[110%] bg-[#22216a]/90 px-3 py-1.5 rounded-lg text-sm text-white shadow-lg z-20"
            >
              {messages[dummyData[hoveredDate]]}
            </motion.div>
          )}
        </AnimatePresence>

        <Calendar
          onChange={setDate}
          value={date}
          tileProps={({ date, view }) => ({
            onMouseEnter: () =>
              view === "month" && setHoveredDate(formatDate(date)),
            onMouseLeave: () => view === "month" && setHoveredDate(null),
          })}
          tileContent={tileContent}
          prevLabel={<ChevronLeft size={20} />}
          nextLabel={<ChevronRight size={20} />}
          showNeighboringMonth={false}
          className="custom-calendar text-lg font-semibold bg-[#22216a] rounded-lg p-2 border border-[#3f2fff]/30 text-white"
        />
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-5 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#32CD99] rounded-full"></span> Administered
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#FFC857] rounded-full"></span> Rescheduled
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#FF6B6B] rounded-full"></span> Missed
        </span>
      </div>
    </motion.div>
  );
}
