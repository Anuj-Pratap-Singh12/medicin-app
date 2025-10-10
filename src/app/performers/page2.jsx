"use client";

import { useState, useEffect , useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Users,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Pill,
  Edit,
  Trash2,
  Save,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  fetchPerformersWithLogs,
  logDoseStatus,
  autoMarkMissedDoses,
} from "@/integrations/supabase/frontendHelper";

const PerformersPage = () => {
  const [performers, setPerformers] = useState([]);
  const [newPerformer, setNewPerformer] = useState("");
  const [loading, setLoading] = useState(false);
  const [medicineForms, setMedicineForms] = useState({});
  const [openForm, setOpenForm] = useState(null);
  const [editMedicine, setEditMedicine] = useState(null);
  const [editPerformer, setEditPerformer] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
  const getUser = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Supabase auth error:", error);
        return;
      }
      if (data?.session?.user) setUser(data.session.user);
    } catch (err) {
      console.error("Failed to get user session:", err);
    }
  };

  getUser();
}, []);

// ---------------------------------------------
// Fetch performers + medicines & setup realtime
// ---------------------------------------------
  // 1️⃣ Fetch user session
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Supabase auth error:", error);
          return;
        }
        if (data?.session?.user) setUser(data.session.user);
      } catch (err) {
        console.error("Failed to get user session:", err);
      }
    };

    getUser();
  }, []);

  // 2️⃣ Fetch performers + medicines (top-level useCallback)
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const performersData = await fetchPerformersWithLogs(user.id);
      const normalized = performersData.map((p) => ({
        ...p,
        medicines: (p.medicines || []).sort((a, b) => {
          if (!a.time_of_day) return 1;
          if (!b.time_of_day) return -1;
          return a.time_of_day.localeCompare(b.time_of_day);
        }),
      }));
      setPerformers(normalized);
    } catch (err) {
      console.error("Error fetching performers:", err);
    }
  }, [user]); // ✅ user as dependency is correct

  // 3️⃣ useEffect for initial fetch + realtime subscriptions
  useEffect(() => {
    if (!user) return;

    fetchData(); // initial fetch

    const performerChannel = supabase
      .channel("performers-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "performers" },
        fetchData
      )
      .subscribe();

    const medicineChannel = supabase
      .channel("medicines-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medicines" },
        fetchData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(performerChannel);
      supabase.removeChannel(medicineChannel);
    };
  }, [user, fetchData]); // include fetchData for proper dependency

  // Add performer
  const addPerformer = async () => {
    if (!newPerformer.trim() || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("performers")
        .insert([{ name: newPerformer, user_id: user.id }])
        .select("*");

      if (error) throw error;

      const newPerfs = (data || []).map((p) => ({ ...p, medicines: [] }));
      setPerformers((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        ...newPerfs,
      ]);
      setNewPerformer("");
      toast.success("Performer added!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add performer");
    } finally {
      setLoading(false);
    }
  };

  // Update performer
  const updatePerformer = async (id, name) => {
    try {
      const { error } = await supabase
        .from("performers")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
      setPerformers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name } : p))
      );
      setEditPerformer(null);
      toast.success("Performer updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update performer");
    }
  };

  // Delete performer
  const deletePerformer = async (id) => {
    if (!confirm("Delete this performer and all related medicines?")) return;
    try {
      const { error } = await supabase.from("performers").delete().eq("id", id);
      if (error) throw error;
      setPerformers((prev) => prev.filter((p) => p.id !== id));
      toast.success("Performer deleted!");
    } catch {
      toast.error("Failed to delete performer");
    }
  };

  // ✅ FIXED: Add medicine with safe defaults
  const addMedicine = async (performerId) => {
    const formKey = `performer-${performerId}`;
    const form = medicineForms[formKey] || {};

    console.log("➡️ addMedicine called with performerId:", performerId);
    console.log("➡️ medicineForms state:", medicineForms);
    console.log("➡️ form values:", form);

    if (!form.pill_name || !form.time_of_day) {
      toast.error("Please fill in all fields");
      return;
    }

    // Safe default frequency
    const frequency =
      form.frequency === "Custom"
        ? form.customFrequency
        : form.frequency || "Daily";

    const timeOfDay =
      form.time_of_day.length === 5
        ? form.time_of_day + ":00"
        : form.time_of_day;

        setLoading(true);


    try {
      const { data, error } = await supabase
        .from("medicines")
        .insert([
          {
            performer_id: Number(performerId),
            pill_name: form.pill_name,
            dosage: form.dosage || "",
            time_of_day: timeOfDay,
            frequency,
            status: "Upcoming",
          },
        ])
        .select("*");

      console.log("Supabase insert response:", { data, error });
      if (error) {
  console.error("❌ Supabase insert error:", JSON.stringify(error, null, 2));
  toast.error("Failed to add medicine: " + error.message);
  return;
}
    
      if (data && data.length > 0) {
        setPerformers((prev) =>
          prev.map((p) =>
            Number(p.id) === Number(performerId)
              ? {
                  ...p,
                  medicines: [...(p.medicines || []), ...data].sort((a, b) => {
                    if (!a.time_of_day) return 1;
                    if (!b.time_of_day) return -1;
                    return a.time_of_day.localeCompare(b.time_of_day);
                  }),
                }
              : p
          )
        );
      }

      setMedicineForms((prev) => ({
        ...prev,
        [formKey]: {
          pill_name: "",
          dosage: "",
          frequency: "Daily",
          time_of_day: "",
        },
      }));
      setOpenForm(null);
      toast.success("Medicine added!");
    } catch (err) {
      console.error("❌ Add medicine error:", err);
      toast.error("Failed to add medicine");
    }
    finally {
    setLoading(false);
  }
    
  };

  // Update medicine
  const updateMedicine = async (medicineId, performerId) => {
    const updates = medicineForms[medicineId];
    if (!updates || Object.keys(updates).length === 0) {
      toast.error("No changes to save");
      return;
    }

    const frequency =
      updates.frequency === "Custom"
        ? updates.customFrequency
        : updates.frequency;

    try {
      const { error } = await supabase
        .from("medicines")
        .update({ ...updates, frequency })
        .eq("id", medicineId);
      if (error) throw error;

      setPerformers((prev) =>
        prev.map((perf) =>
          perf.id === performerId
            ? {
                ...perf,
                medicines: perf.medicines.map((med) =>
                  med.id === medicineId
                    ? { ...med, ...updates, frequency }
                    : med
                ),
              }
            : perf
        )
      );
      setEditMedicine(null);
      toast.success("Medicine updated!");
    } catch {
      toast.error("Failed to update medicine");
    }
  };

  // Delete medicine
  const deleteMedicine = async (medicineId, performerId) => {
    if (!confirm("Are you sure you want to delete this medicine?")) return;
    try {
      const { error } = await supabase
        .from("medicines")
        .delete()
        .eq("id", medicineId);
      if (error) throw error;
      setPerformers((prev) =>
        prev.map((perf) =>
          perf.id === performerId
            ? {
                ...perf,
                medicines: perf.medicines.filter(
                  (med) => med.id !== medicineId
                ),
              }
            : perf
        )
      );
      toast.success("Medicine deleted!");
    } catch {
      toast.error("Failed to delete medicine");
    }
  };
  // 🧩 Refresh performers and medicines after status update
const refreshData = async () => {
  if (!user) return;
  const performersData = await fetchPerformersWithLogs(user.id);
  const normalized = performersData.map((p) => ({
    ...p,
    medicines: (p.medicines || []).sort((a, b) => {
      if (!a.time_of_day) return 1;
      if (!b.time_of_day) return -1;
      return a.time_of_day.localeCompare(b.time_of_day);
    }),
  }));
  setPerformers(normalized);
};


  // Log status
 // ✅ Log status + refresh immediately
const handleLogStatus = async (medicine, status) => {
  if (!medicine?.id) {
    toast.error("Invalid medicine");
    return;
  }

  console.log("Logging dose:", { medicineId: medicine.id, status });

  const success = await logDoseStatus(medicine.id, status);
  if (!success) {
    toast.error("Failed to log status");
    return;
  }

  // 🔁 Immediately update local UI
  setPerformers((prev) =>
    prev.map((perf) => ({
      ...perf,
      medicines: perf.medicines.map((med) =>
        med.id === medicine.id ? { ...med, status } : med
      ),
    }))
  );

  toast.success(`Marked as ${status}`);

  // 🔄 Refresh from backend (important for charts or synced data)
  await refreshData();
};

  const getTimeLeft = (time) => {
    if (!time) return "No time set";
    const now = new Date();
    const pillTime = new Date();
    const [hours, minutes] = time.split(":").map(Number);
    pillTime.setHours(hours, minutes, 0);
    const diff = pillTime - now;
    if (diff <= 0) return "Due now";
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m left`;
  };

  return (
    <Layout>
      <div className="relative min-h-screen p-6 bg-gradient-to-b from-black via-purple-900 to-black">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-6 text-center"
        >
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent animate-pulse mb-2">
            Performers & Medicines
          </h1>
          <p className="text-purple-300/70">
            Manage performers, pill schedules, and logs
          </p>
        </motion.div>

        {/* Add performer */}
        <div className="flex gap-3 justify-center mb-6">
          <input
            type="text"
            value={newPerformer}
            onChange={(e) => setNewPerformer(e.target.value)}
            placeholder="Enter performer name"
            className="px-4 py-2 rounded-lg border border-purple-500/50 bg-black/40 text-white placeholder-purple-300"
          />
          <Button
            onClick={addPerformer}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />{" "}
            {loading ? "Adding..." : "Add Performer"}
          </Button>
        </div>

        {/* Performer Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {Array.isArray(performers) &&
              performers.length > 0 &&
              performers.map((performer) => (
                <motion.div
                  key={performer.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 border border-purple-700 rounded-xl shadow-md bg-black/80 text-white flex flex-col"
                >
                  {/* Performer Header */}
                  <div className="flex justify-between items-center mb-4">
                    {editPerformer === performer.id ? (
                      <input
                        type="text"
                        defaultValue={performer.name}
                        onBlur={(e) =>
                          updatePerformer(performer.id, e.target.value)
                        }
                        className="bg-black/50 border border-purple-500 rounded-lg px-2 py-1 text-white w-full"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Users className="w-8 h-8 text-purple-400" />
                        <h2 className="font-semibold text-purple-200">
                          {performer.name}
                        </h2>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditPerformer(performer.id)}
                      >
                        <Edit className="w-4 h-4 text-purple-300" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deletePerformer(performer.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>

                  {/* Medicine List */}
                  <AnimatePresence>
                    {performer.medicines?.map((med) => (
                      <motion.div
                        key={med.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="relative p-3 border border-purple-600 rounded-lg bg-purple-950/50 flex flex-col gap-2"
                      >
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditMedicine(med.id)}
                          >
                            <Edit className="w-4 h-4 text-purple-300" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              deleteMedicine(med.id, performer.id)
                            }
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>

                        {editMedicine === med.id ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              placeholder="Pill name"
                              defaultValue={med.pill_name}
                              onChange={(e) =>
                                setMedicineForms((prev) => ({
                                  ...prev,
                                  [med.id]: {
                                    ...prev[med.id],
                                    pill_name: e.target.value,
                                  },
                                }))
                              }
                              className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                            />
                            <input
                              type="text"
                              placeholder="Dosage"
                              defaultValue={med.dosage}
                              onChange={(e) =>
                                setMedicineForms((prev) => ({
                                  ...prev,
                                  [med.id]: {
                                    ...prev[med.id],
                                    dosage: e.target.value,
                                  },
                                }))
                              }
                              className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                            />
                            <input
                              type="time"
                              defaultValue={med.time_of_day}
                              onChange={(e) =>
                                setMedicineForms((prev) => ({
                                  ...prev,
                                  [med.id]: {
                                    ...prev[med.id],
                                    time_of_day: e.target.value,
                                  },
                                }))
                              }
                              className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                            />
                            <select
                              defaultValue={med.frequency}
                              onChange={(e) =>
                                setMedicineForms((prev) => ({
                                  ...prev,
                                  [med.id]: {
                                    ...prev[med.id],
                                    frequency: e.target.value,
                                  },
                                }))
                              }
                              className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                            >
                              <option value="Daily">Daily</option>
                              <option value="Weekly">Weekly</option>
                              <option value="Custom">Custom</option>
                            </select>
                            {medicineForms[med.id]?.frequency === "Custom" && (
                              <input
                                type="text"
                                placeholder="Custom frequency"
                                onChange={(e) =>
                                  setMedicineForms((prev) => ({
                                    ...prev,
                                    [med.id]: {
                                      ...prev[med.id],
                                      customFrequency: e.target.value,
                                    },
                                  }))
                                }
                                className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                              />
                            )}
                            <Button
                              onClick={() =>
                                updateMedicine(med.id, performer.id)
                              }
                              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1"
                            >
                              <Save className="w-4 h-4" /> Save
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <Pill className="w-5 h-5 text-green-400" />
                              <div>
                                <p className="font-medium text-purple-200">
                                  {med.pill_name} ({med.dosage})
                                </p>
                                <p className="text-xs text-purple-400">
                                  {med.time_of_day} • {med.frequency} (
                                  {getTimeLeft(med.time_of_day)})
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                className={`flex-1 ${
                                  med.status === "Taken"
                                    ? "bg-green-600 text-black"
                                    : "bg-purple-700 text-white"
                                }`}
                                onClick={() =>
                                  handleLogStatus(med, "Taken")
                                }
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" /> Taken
                              </Button>
                              <Button
                                size="sm"
                                className={`flex-1 ${
                                  med.status === "Missed"
                                    ? "bg-red-600 text-black"
                                    : "bg-purple-700 text-white"
                                }`}
                                onClick={() =>
                                  handleLogStatus(med, "Missed")
                                }
                              >
                                <XCircle className="w-4 h-4 mr-1" /> Missed
                              </Button>
                            </div>
                          </>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* ✅ Add Medicine Button */}
                  {openForm === performer.id ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <input
                        type="text"
                        placeholder="Medicine name"
                        onChange={(e) =>
                          setMedicineForms((prev) => ({
                            ...prev,
                            [`performer-${performer.id}`]: {
                              ...prev[`performer-${performer.id}`],
                              pill_name: e.target.value,
                            },
                          }))
                        }
                        className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                      />
                      <input
                        type="text"
                        placeholder="Dosage"
                        onChange={(e) =>
                          setMedicineForms((prev) => ({
                            ...prev,
                            [`performer-${performer.id}`]: {
                              ...prev[`performer-${performer.id}`],
                              dosage: e.target.value,
                            },
                          }))
                        }
                        className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                      />
                      <input
                        type="time"
                        onChange={(e) =>
                          setMedicineForms((prev) => ({
                            ...prev,
                            [`performer-${performer.id}`]: {
                              ...prev[`performer-${performer.id}`],
                              time_of_day: e.target.value,
                            },
                          }))
                        }
                        className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                      />
                      <select
                        onChange={(e) =>
                          setMedicineForms((prev) => ({
                            ...prev,
                            [`performer-${performer.id}`]: {
                              ...prev[`performer-${performer.id}`],
                              frequency: e.target.value,
                            },
                          }))
                        }
                        className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                      >
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Custom">Custom</option>
                      </select>

                      {medicineForms[`performer-${performer.id}`]?.frequency ===
                        "Custom" && (
                        <input
                          type="text"
                          placeholder="Custom frequency"
                          onChange={(e) =>
                            setMedicineForms((prev) => ({
                              ...prev,
                              [`performer-${performer.id}`]: {
                                ...prev[`performer-${performer.id}`],
                                customFrequency: e.target.value,
                              },
                            }))
                          }
                          className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                        />
                      )}

                      <Button
                        onClick={() => addMedicine(performer.id)}
                        className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1"
                      >
                        <Pill className="w-4 h-4" /> Add Medicine
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        setOpenForm(performer.id);
                        setMedicineForms((prev) => ({
                          ...prev,
                          [`performer-${performer.id}`]: {
                            pill_name: "",
                            dosage: "",
                            frequency: "Daily",
                            time_of_day: "",
                          },
                        }));
                      }}
                      className="mt-4 bg-purple-700 hover:bg-purple-800 text-white flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" /> Add Medicine
                    </Button>
                  )}
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
};

export default PerformersPage;






"use client";

import { useState, useEffect , useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Users,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Pill,
  Edit,
  Trash2,
  Save,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  fetchPerformersWithLogs,
  logDoseStatus,
  autoMarkMissedDoses,
} from "@/integrations/supabase/frontendHelper";

const PerformersPage = () => {
  const [performers, setPerformers] = useState([]);
  const [newPerformer, setNewPerformer] = useState("");
  const [loading, setLoading] = useState(false);
  const [medicineForms, setMedicineForms] = useState({});
  const [openForm, setOpenForm] = useState(null);
  const [editMedicine, setEditMedicine] = useState(null);
  const [editPerformer, setEditPerformer] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
  const getUser = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Supabase auth error:", error);
        return;
      }
      if (data?.session?.user) setUser(data.session.user);
    } catch (err) {
      console.error("Failed to get user session:", err);
    }
  };

  getUser();
}, []);

// ---------------------------------------------
// Fetch performers + medicines & setup realtime
// ---------------------------------------------
  // 1️⃣ Fetch user session
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Supabase auth error:", error);
          return;
        }
        if (data?.session?.user) setUser(data.session.user);
      } catch (err) {
        console.error("Failed to get user session:", err);
      }
    };

    getUser();
  }, []);

  // 2️⃣ Fetch performers + medicines (top-level useCallback)
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const performersData = await fetchPerformersWithLogs(user.id);
      const normalized = performersData.map((p) => ({
        ...p,
        medicines: (p.medicines || []).sort((a, b) => {
          if (!a.time_of_day) return 1;
          if (!b.time_of_day) return -1;
          return a.time_of_day.localeCompare(b.time_of_day);
        }),
      }));
      setPerformers(normalized);
    } catch (err) {
      console.error("Error fetching performers:", err);
    }
  }, [user]); // ✅ user as dependency is correct

  // 3️⃣ useEffect for initial fetch + realtime subscriptions
  useEffect(() => {
    if (!user) return;

    fetchData(); // initial fetch

    const performerChannel = supabase
      .channel("performers-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "performers" },
        fetchData
      )
      .subscribe();

    const medicineChannel = supabase
      .channel("medicines-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medicines" },
        fetchData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(performerChannel);
      supabase.removeChannel(medicineChannel);
    };
  }, [user, fetchData]); // include fetchData for proper dependency

  // Add performer
  const addPerformer = async () => {
    if (!newPerformer.trim() || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("performers")
        .insert([{ name: newPerformer, user_id: user.id }])
        .select("*");

      if (error) throw error;

      const newPerfs = (data || []).map((p) => ({ ...p, medicines: [] }));
      setPerformers((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        ...newPerfs,
      ]);
      setNewPerformer("");
      toast.success("Performer added!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add performer");
    } finally {
      setLoading(false);
    }
  };

  // Update performer
  const updatePerformer = async (id, name) => {
    try {
      const { error } = await supabase
        .from("performers")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
      setPerformers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name } : p))
      );
      setEditPerformer(null);
      toast.success("Performer updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update performer");
    }
  };

  // Delete performer
  const deletePerformer = async (id) => {
    if (!confirm("Delete this performer and all related medicines?")) return;
    try {
      const { error } = await supabase.from("performers").delete().eq("id", id);
      if (error) throw error;
      setPerformers((prev) => prev.filter((p) => p.id !== id));
      toast.success("Performer deleted!");
    } catch {
      toast.error("Failed to delete performer");
    }
  };

  // ✅ FIXED: Add medicine with safe defaults
  const addMedicine = async (performerId) => {
    const formKey = `performer-${performerId}`;
    const form = medicineForms[formKey] || {};

    console.log("➡️ addMedicine called with performerId:", performerId);
    console.log("➡️ medicineForms state:", medicineForms);
    console.log("➡️ form values:", form);

    if (!form.pill_name || !form.time_of_day) {
      toast.error("Please fill in all fields");
      return;
    }

    // Safe default frequency
    const frequency =
      form.frequency === "Custom"
        ? form.customFrequency
        : form.frequency || "Daily";

    const timeOfDay =
      form.time_of_day.length === 5
        ? form.time_of_day + ":00"
        : form.time_of_day;

    try {
      const { data, error } = await supabase
        .from("medicines")
        .insert([
          {
            performer_id: Number(performerId),
            pill_name: form.pill_name,
            dosage: form.dosage || "",
            time_of_day: timeOfDay,
            frequency,
            status: "Upcoming",
          },
        ])
        .select("*");

      console.log("Supabase insert response:", { data, error });
      if (error) throw error;

      if (data && data.length > 0) {
        setPerformers((prev) =>
          prev.map((p) =>
            p.id === Number(performerId)
              ? {
                  ...p,
                  medicines: [...(p.medicines || []), ...data].sort((a, b) => {
                    if (!a.time_of_day) return 1;
                    if (!b.time_of_day) return -1;
                    return a.time_of_day.localeCompare(b.time_of_day);
                  }),
                }
              : p
          )
        );
      }

      setMedicineForms((prev) => ({
        ...prev,
        [formKey]: {
          pill_name: "",
          dosage: "",
          frequency: "Daily",
          time_of_day: "",
        },
      }));
      setOpenForm(null);
      toast.success("Medicine added!");
    } catch (err) {
      console.error("❌ Add medicine error:", err);
      toast.error("Failed to add medicine");
    }
  };

  // Update medicine
  const updateMedicine = async (medicineId, performerId) => {
    const updates = medicineForms[medicineId];
    if (!updates || Object.keys(updates).length === 0) {
      toast.error("No changes to save");
      return;
    }

    const frequency =
      updates.frequency === "Custom"
        ? updates.customFrequency
        : updates.frequency;

    try {
      const { error } = await supabase
        .from("medicines")
        .update({ ...updates, frequency })
        .eq("id", medicineId);
      if (error) throw error;

      setPerformers((prev) =>
        prev.map((perf) =>
          perf.id === performerId
            ? {
                ...perf,
                medicines: perf.medicines.map((med) =>
                  med.id === medicineId
                    ? { ...med, ...updates, frequency }
                    : med
                ),
              }
            : perf
        )
      );
      setEditMedicine(null);
      toast.success("Medicine updated!");
    } catch {
      toast.error("Failed to update medicine");
    }
  };

  // Delete medicine
  const deleteMedicine = async (medicineId, performerId) => {
    if (!confirm("Are you sure you want to delete this medicine?")) return;
    try {
      const { error } = await supabase
        .from("medicines")
        .delete()
        .eq("id", medicineId);
      if (error) throw error;
      setPerformers((prev) =>
        prev.map((perf) =>
          perf.id === performerId
            ? {
                ...perf,
                medicines: perf.medicines.filter(
                  (med) => med.id !== medicineId
                ),
              }
            : perf
        )
      );
      toast.success("Medicine deleted!");
    } catch {
      toast.error("Failed to delete medicine");
    }
  };
  // 🧩 Refresh performers and medicines after status update
const refreshData = async () => {
  if (!user) return;
  const performersData = await fetchPerformersWithLogs(user.id);
  const normalized = performersData.map((p) => ({
    ...p,
    medicines: (p.medicines || []).sort((a, b) => {
      if (!a.time_of_day) return 1;
      if (!b.time_of_day) return -1;
      return a.time_of_day.localeCompare(b.time_of_day);
    }),
  }));
  setPerformers(normalized);
};


  // Log status
 // ✅ Log status + refresh immediately
const handleLogStatus = async (medicine, status) => {
  if (!medicine?.id) {
    toast.error("Invalid medicine");
    return;
  }

  console.log("Logging dose:", { medicineId: medicine.id, status });

  const success = await logDoseStatus(medicine.id, status);
  if (!success) {
    toast.error("Failed to log status");
    return;
  }

  // 🔁 Immediately update local UI
  setPerformers((prev) =>
    prev.map((perf) => ({
      ...perf,
      medicines: perf.medicines.map((med) =>
        med.id === medicine.id ? { ...med, status } : med
      ),
    }))
  );

  toast.success(`Marked as ${status}`);

  // 🔄 Refresh from backend (important for charts or synced data)
  await refreshData();
};

  const getTimeLeft = (time) => {
    if (!time) return "No time set";
    const now = new Date();
    const pillTime = new Date();
    const [hours, minutes] = time.split(":").map(Number);
    pillTime.setHours(hours, minutes, 0);
    const diff = pillTime - now;
    if (diff <= 0) return "Due now";
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m left`;
  };

  return (
    <Layout>
      <div className="relative min-h-screen p-6 bg-gradient-to-b from-black via-purple-900 to-black">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-6 text-center"
        >
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent animate-pulse mb-2">
            Performers & Medicines
          </h1>
          <p className="text-purple-300/70">
            Manage performers, pill schedules, and logs
          </p>
        </motion.div>

        {/* Add performer */}
        <div className="flex gap-3 justify-center mb-6">
          <input
            type="text"
            value={newPerformer}
            onChange={(e) => setNewPerformer(e.target.value)}
            placeholder="Enter performer name"
            className="px-4 py-2 rounded-lg border border-purple-500/50 bg-black/40 text-white placeholder-purple-300"
          />
          <Button
            onClick={addPerformer}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />{" "}
            {loading ? "Adding..." : "Add Performer"}
          </Button>
        </div>

        {/* Performer Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {Array.isArray(performers) &&
              performers.length > 0 &&
              performers.map((performer) => (
                <motion.div
                  key={performer.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 border border-purple-700 rounded-xl shadow-md bg-black/80 text-white flex flex-col"
                >
                  {/* Performer Header */}
                  <div className="flex justify-between items-center mb-4">
                    {editPerformer === performer.id ? (
                      <input
                        type="text"
                        defaultValue={performer.name}
                        onBlur={(e) =>
                          updatePerformer(performer.id, e.target.value)
                        }
                        className="bg-black/50 border border-purple-500 rounded-lg px-2 py-1 text-white w-full"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Users className="w-8 h-8 text-purple-400" />
                        <h2 className="font-semibold text-purple-200">
                          {performer.name}
                        </h2>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditPerformer(performer.id)}
                      >
                        <Edit className="w-4 h-4 text-purple-300" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deletePerformer(performer.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>

                  {/* Medicine List */}
                  <AnimatePresence>
                    {performer.medicines?.map((med) => (
                      <motion.div
                        key={med.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="relative p-3 border border-purple-600 rounded-lg bg-purple-950/50 flex flex-col gap-2"
                      >
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditMedicine(med.id)}
                          >
                            <Edit className="w-4 h-4 text-purple-300" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              deleteMedicine(med.id, performer.id)
                            }
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>

                        {editMedicine === med.id ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              placeholder="Pill name"
                              defaultValue={med.pill_name}
                              onChange={(e) =>
                                setMedicineForms((prev) => ({
                                  ...prev,
                                  [med.id]: {
                                    ...prev[med.id],
                                    pill_name: e.target.value,
                                  },
                                }))
                              }
                              className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                            />
                            <input
                              type="text"
                              placeholder="Dosage"
                              defaultValue={med.dosage}
                              onChange={(e) =>
                                setMedicineForms((prev) => ({
                                  ...prev,
                                  [med.id]: {
                                    ...prev[med.id],
                                    dosage: e.target.value,
                                  },
                                }))
                              }
                              className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                            />
                            <input
                              type="time"
                              defaultValue={med.time_of_day}
                              onChange={(e) =>
                                setMedicineForms((prev) => ({
                                  ...prev,
                                  [med.id]: {
                                    ...prev[med.id],
                                    time_of_day: e.target.value,
                                  },
                                }))
                              }
                              className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                            />
                            <select
                              defaultValue={med.frequency}
                              onChange={(e) =>
                                setMedicineForms((prev) => ({
                                  ...prev,
                                  [med.id]: {
                                    ...prev[med.id],
                                    frequency: e.target.value,
                                  },
                                }))
                              }
                              className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                            >
                              <option value="Daily">Daily</option>
                              <option value="Weekly">Weekly</option>
                              <option value="Custom">Custom</option>
                            </select>
                            {medicineForms[med.id]?.frequency === "Custom" && (
                              <input
                                type="text"
                                placeholder="Custom frequency"
                                onChange={(e) =>
                                  setMedicineForms((prev) => ({
                                    ...prev,
                                    [med.id]: {
                                      ...prev[med.id],
                                      customFrequency: e.target.value,
                                    },
                                  }))
                                }
                                className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                              />
                            )}
                            <Button
                              onClick={() =>
                                updateMedicine(med.id, performer.id)
                              }
                              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1"
                            >
                              <Save className="w-4 h-4" /> Save
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <Pill className="w-5 h-5 text-green-400" />
                              <div>
                                <p className="font-medium text-purple-200">
                                  {med.pill_name} ({med.dosage})
                                </p>
                                <p className="text-xs text-purple-400">
                                  {med.time_of_day} • {med.frequency} (
                                  {getTimeLeft(med.time_of_day)})
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                className={`flex-1 ${
                                  med.status === "Taken"
                                    ? "bg-green-600 text-black"
                                    : "bg-purple-700 text-white"
                                }`}
                                onClick={() =>
                                  handleLogStatus(med, "Taken")
                                }
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" /> Taken
                              </Button>
                              <Button
                                size="sm"
                                className={`flex-1 ${
                                  med.status === "Missed"
                                    ? "bg-red-600 text-black"
                                    : "bg-purple-700 text-white"
                                }`}
                                onClick={() =>
                                  handleLogStatus(med, "Missed")
                                }
                              >
                                <XCircle className="w-4 h-4 mr-1" /> Missed
                              </Button>
                            </div>
                          </>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* ✅ Add Medicine Button */}
                  {openForm === performer.id ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <input
                        type="text"
                        placeholder="Medicine name"
                        onChange={(e) =>
                          setMedicineForms((prev) => ({
                            ...prev,
                            [`performer-${performer.id}`]: {
                              ...prev[`performer-${performer.id}`],
                              pill_name: e.target.value,
                            },
                          }))
                        }
                        className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                      />
                      <input
                        type="text"
                        placeholder="Dosage"
                        onChange={(e) =>
                          setMedicineForms((prev) => ({
                            ...prev,
                            [`performer-${performer.id}`]: {
                              ...prev[`performer-${performer.id}`],
                              dosage: e.target.value,
                            },
                          }))
                        }
                        className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                      />
                      <input
                        type="time"
                        onChange={(e) =>
                          setMedicineForms((prev) => ({
                            ...prev,
                            [`performer-${performer.id}`]: {
                              ...prev[`performer-${performer.id}`],
                              time_of_day: e.target.value,
                            },
                          }))
                        }
                        className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                      />
                      <select
                        onChange={(e) =>
                          setMedicineForms((prev) => ({
                            ...prev,
                            [`performer-${performer.id}`]: {
                              ...prev[`performer-${performer.id}`],
                              frequency: e.target.value,
                            },
                          }))
                        }
                        className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                      >
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Custom">Custom</option>
                      </select>

                      {medicineForms[`performer-${performer.id}`]?.frequency ===
                        "Custom" && (
                        <input
                          type="text"
                          placeholder="Custom frequency"
                          onChange={(e) =>
                            setMedicineForms((prev) => ({
                              ...prev,
                              [`performer-${performer.id}`]: {
                                ...prev[`performer-${performer.id}`],
                                customFrequency: e.target.value,
                              },
                            }))
                          }
                          className="px-2 py-1 border rounded-lg bg-black/60 text-white"
                        />
                      )}

                      <Button
                        onClick={() => addMedicine(performer.id)}
                        className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1"
                      >
                        <Pill className="w-4 h-4" /> Add Medicine
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        setOpenForm(performer.id);
                        setMedicineForms((prev) => ({
                          ...prev,
                          [`performer-${performer.id}`]: {
                            pill_name: "",
                            dosage: "",
                            frequency: "Daily",
                            time_of_day: "",
                          },
                        }));
                      }}
                      className="mt-4 bg-purple-700 hover:bg-purple-800 text-white flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" /> Add Medicine
                    </Button>
                  )}
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
};

export default PerformersPage;

