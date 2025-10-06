"use client";

import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react"; // For nicer icons
import "./calendarFix.css";

// Helper to format dates consistently (YYYY-MM-DD)
const formatDate = (date) => {
  return date.toISOString().split("T")[0];
};

export default function InteractiveCalendar() {
  const [date, setDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);

  // 🟩🟨🟥 Dummy data using the consistent date format
  const dummyData = {
    [formatDate(new Date(2025, 9, 1))]: "green",
    [formatDate(new Date(2025, 9, 2))]: "red",
    [formatDate(new Date(2025, 9, 3))]: "yellow",
    [formatDate(new Date(2025, 9, 4))]: "green",
    [formatDate(new Date(2025, 9, 5))]: "yellow",
    [formatDate(new Date(2025, 9, 6))]: "red",
  };

  const messages = {
    green: "Potion administered successfully ✅",
    yellow: "Ritual rescheduled ⚠️",
    red: "Elixir missed ❌",
  };

  // 🔥 IMPROVEMENT: Using `tileContent` for a more robust hover interaction
  const tileContent = ({ date: tileDate, view }) => {
    if (view !== "month") return null;
    const d = formatDate(tileDate);
    const status = dummyData[d];
    if (!status) return null;

    // This div is the colored circle inside the tile
    return (
      <motion.div
        className={`w-2 h-2 rounded-full absolute top-2 right-2`}
        style={{
          backgroundColor:
            status === "green"
              ? "var(--green)"
              : status === "yellow"
              ? "var(--yellow)"
              : "var(--red)",
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
      />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      // 🔥 IMPROVEMENT: Glassmorphism effect with backdrop-blur
      className="relative max-w-md mx-auto mt-10 p-6 rounded-2xl shadow-2xl bg-black/30 backdrop-blur-lg border border-white/10 text-white"
    >
      {/* ✨ Optional: Adds a subtle glowing effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-2/3 bg-green-500/20 blur-3xl rounded-full -z-10" />

      <h2 className="text-2xl font-bold text-center mb-4 bg-gradient-to-r from-green-300 to-sky-300 bg-clip-text text-transparent">
        Alchemist's Ritual Calendar
      </h2>

      <div className="rounded-lg shadow-inner relative">
        {/* 🔥 IMPROVEMENT: Moved tooltip above calendar to prevent overlap */}
        <AnimatePresence>
          {hoveredDate && dummyData[hoveredDate] && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[110%] bg-gray-900/80 px-3 py-1.5 rounded-lg text-sm text-white shadow-lg z-20"
            >
              {messages[dummyData[hoveredDate]]}
            </motion.div>
          )}
        </AnimatePresence>

        <Calendar
          onChange={setDate}
          value={date}
          // 🔥 IMPROVEMENT: Attach hover events directly to tiles for precision
          tileProps={({ date, view }) => ({
            onMouseEnter: () => view === 'month' && setHoveredDate(formatDate(date)),
            onMouseLeave: () => view === 'month' && setHoveredDate(null),
          })}
          tileContent={tileContent}
          // 🔥 IMPROVEMENT: Using icons for navigation
          prevLabel={<ChevronLeft size={20} />}
          nextLabel={<ChevronRight size={20} />}
          showNeighboringMonth={false}
          className="custom-calendar text-lg font-semibold"
        />
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-5 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded-full"></span> Administered
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-yellow-400 rounded-full"></span> Rescheduled
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded-full"></span> Missed
        </span>
      </div>
    </motion.div>
  );
}