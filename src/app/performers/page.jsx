"use client";

import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Users, PlusCircle, CheckCircle2, XCircle, Trash2, Pill, Edit, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchPerformersWithLogs, logDoseStatus } from "@/integrations/supabase/frontendHelper";

const PerformersPage = () => {
  const [performers, setPerformers] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newPerformer, setNewPerformer] = useState("");
  const [editPerformer, setEditPerformer] = useState(null);
  const [editMedicine, setEditMedicine] = useState(null);
  const [openForm, setOpenForm] = useState(null);
  const [medicineForms, setMedicineForms] = useState({});

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) setUser(data.session.user);
    };
    fetchUser();
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await fetchPerformersWithLogs(user.id);
      setPerformers(list || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // Performer functions
  const addPerformer = async () => {
    if (!newPerformer.trim() || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("performers")
        .insert([{ name: newPerformer, user_id: user.id }])
        .select("*");
      if (error) throw error;
      setPerformers(prev => [...prev, ...data.map(p => ({ ...p, medicines: [] }))]);
      setNewPerformer("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deletePerformer = async (id) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("performers").delete().eq("id", id);
      if (error) throw error;
      setPerformers(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updatePerformer = async (id, name) => {
    if (!name.trim()) return;
    try {
      const { error } = await supabase.from("performers").update({ name }).eq("id", id);
      if (error) throw error;
      setPerformers(prev => prev.map(p => (p.id === id ? { ...p, name } : p)));
      setEditPerformer(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Medicine functions
  const addMedicine = async (performerId) => {
    const med = medicineForms[`performer-${performerId}`];
    if (!med?.pill_name?.trim() || !med?.dosage?.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("medicines")
        .insert([{ ...med, performer_id: performerId }])
        .select("*");
      if (error) throw error;
      setPerformers(prev =>
        prev.map(p =>
          p.id === performerId ? { ...p, medicines: [...p.medicines, ...data] } : p
        )
      );
      setOpenForm(null);
      setMedicineForms(prev => ({ ...prev, [`performer-${performerId}`]: {} }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateMedicine = async (medId, performerId) => {
    const med = medicineForms[medId];
    try {
      const { error } = await supabase.from("medicines").update(med).eq("id", medId);
      if (error) throw error;
      setPerformers(prev =>
        prev.map(p =>
          p.id === performerId
            ? {
                ...p,
                medicines: p.medicines.map(m => (m.id === medId ? { ...m, ...med } : m)),
              }
            : p
        )
      );
      setEditMedicine(null);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMedicine = async (medId, performerId) => {
    try {
      const { error } = await supabase.from("medicines").delete().eq("id", medId);
      if (error) throw error;
      setPerformers(prev =>
        prev.map(p =>
          p.id === performerId
            ? { ...p, medicines: p.medicines.filter(m => m.id !== medId) }
            : p
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogStatus = async (medicine, status) => {
    if (!medicine?.id) return;
    const success = await logDoseStatus(medicine.id, status);
    if (!success) return;
    setPerformers(prev =>
      prev.map(perf => ({
        ...perf,
        medicines: perf.medicines.map(m => (m.id === medicine.id ? { ...m, status } : m)),
      }))
    );
  };

  if (loading)
    return (
      <Layout sidebarTheme="dark">
        <div className="flex flex-col items-center justify-center min-h-[70vh]"
             style={{ background: "linear-gradient(180deg,#22216a 0%, #240c4a 38%, #140c2a 100%)" }}>
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="p-4 rounded-full"
            style={{
              background: "linear-gradient(90deg,#6a5cff,#7e56ff)",
              boxShadow: "0 12px 48px rgba(124,109,255,0.24)",
            }}
          >
            <Users className="w-10 h-10 text-white/95" />
          </motion.div>
        </div>
      </Layout>
    );

  return (
    <Layout sidebarTheme="dark">
      <div className="min-h-screen px-4 py-8 text-white"
           style={{ background: "linear-gradient(180deg,#22216a 0%, #240c4a 24%, #140c2a 100%)" }}>
        {/* HEADER */}
        <motion.div className="text-center mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          <h1 className="text-4xl font-extrabold text-[#b3a4ff] mb-2">Performers</h1>
          <p className="text-[#e6e6ff]/80">Manage performers and their medicine schedules</p>
        </motion.div>

        {/* ADD PERFORMER */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 mb-8 items-center">
          <input
            type="text"
            value={newPerformer}
            onChange={e => setNewPerformer(e.target.value)}
            placeholder="Enter performer name"
            className="px-4 py-2 rounded-xl border border-[#b3a4ff]/50 bg-[#240c4a] text-white placeholder-[#b3a4ff]/50 focus:ring-2 focus:ring-[#6a5cff] focus:outline-none w-full sm:w-auto transition-all"
          />
          <Button onClick={addPerformer} disabled={loading} className="px-5 py-2 rounded-xl bg-[#6a5cff] hover:bg-[#7e56ff] text-white flex items-center gap-2 shadow-md">
            <PlusCircle className="w-4 h-4" /> {loading ? "Adding..." : "Add Performer"}
          </Button>
        </div>

        {/* PERFORMERS CARDS */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {performers.map((performer) => (
              <motion.div
                key={performer.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-5 rounded-2xl shadow-2xl border border-[#6a5cff]/20 bg-white/5 glassy hover:shadow-[#6a5cff]/25 transition-all"
              >
                {/* Performer Header */}
                <div className="flex justify-between items-center mb-4">
                  {editPerformer === performer.id ? (
                    <input
                      type="text"
                      defaultValue={performer.name}
                      onBlur={(e) => updatePerformer(performer.id, e.target.value)}
                      className="bg-[#240c4a]/80 border border-[#6a5cff] rounded-lg px-2 py-1 text-white w-full"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Users className="w-8 h-8 text-[#b3a4ff]" />
                      <h2 className="font-semibold text-[#e6e6ff]">{performer.name}</h2>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditPerformer(performer.id)}>
                      <Edit className="w-4 h-4 text-[#b3a4ff]" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deletePerformer(performer.id)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </div>

                {/* Medicines */}
                <AnimatePresence>
                  {performer.medicines?.map((med) => (
                    <motion.div
                      key={med.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="relative p-3 border border-[#6a5cff]/50 rounded-lg bg-white/5 flex flex-col gap-2"
                    >
                      {/* Edit/Delete Buttons */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditMedicine(med.id)}>
                          <Edit className="w-4 h-4 text-[#b3a4ff]" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteMedicine(med.id, performer.id)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>

                      {editMedicine === med.id ? (
                        <div className="flex flex-col gap-2">
                          <input type="text" defaultValue={med.pill_name} placeholder="Pill name"
                            onChange={(e) => setMedicineForms(prev => ({ ...prev, [med.id]: { ...prev[med.id], pill_name: e.target.value } })) }
                            className="px-2 py-1 border rounded-lg bg-[#240c4a]/60 text-white" />
                          <input type="text" defaultValue={med.dosage} placeholder="Dosage"
                            onChange={(e) => setMedicineForms(prev => ({ ...prev, [med.id]: { ...prev[med.id], dosage: e.target.value } })) }
                            className="px-2 py-1 border rounded-lg bg-[#240c4a]/60 text-white" />
                          <input type="time" defaultValue={med.time_of_day}
                            onChange={(e) => setMedicineForms(prev => ({ ...prev, [med.id]: { ...prev[med.id], time_of_day: e.target.value } })) }
                            className="px-2 py-1 border rounded-lg bg-[#240c4a]/60 text-white" />
                          <select defaultValue={med.frequency}
                            onChange={(e) => setMedicineForms(prev => ({ ...prev, [med.id]: { ...prev[med.id], frequency: e.target.value } })) }
                            className="px-2 py-1 border rounded-lg bg-[#240c4a]/60 text-white">
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Custom">Custom</option>
                          </select>
                          {medicineForms[med.id]?.frequency === "Custom" && (
                            <input type="text" placeholder="Custom frequency"
                              onChange={(e) => setMedicineForms(prev => ({ ...prev, [med.id]: { ...prev[med.id], customFrequency: e.target.value } })) }
                              className="px-2 py-1 border rounded-lg bg-[#240c4a]/60 text-white" />
                          )}
                          <Button onClick={() => updateMedicine(med.id, performer.id)} className="bg-[#6a5cff] hover:bg-[#7e56ff] text-white flex items-center gap-1">
                            <Save className="w-4 h-4" /> Save
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Pill className="w-5 h-5 text-green-400" />
                            <div>
                              <p className="font-medium text-[#e6e6ff]">{med.pill_name} ({med.dosage})</p>
                              <p className="text-xs text-[#b3a4ff]">{med.time_of_day} • {med.frequency}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" className={`flex-1 ${med.status === "Taken" ? "bg-green-600 text-black" : "bg-[#6a5cff] text-white"}`} onClick={() => handleLogStatus(med, "Taken")}>
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Taken
                            </Button>
                            <Button size="sm" className={`flex-1 ${med.status === "Missed" ? "bg-red-600 text-black" : "bg-[#6a5cff] text-white"}`} onClick={() => handleLogStatus(med, "Missed")}>
                              <XCircle className="w-4 h-4 mr-1" /> Missed
                            </Button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Add Medicine Button */}
                {openForm === performer.id ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <input type="text" placeholder="Medicine name" onChange={(e) =>
                      setMedicineForms(prev => ({ ...prev, [`performer-${performer.id}`]: { ...prev[`performer-${performer.id}`], pill_name: e.target.value } }))
                    } className="px-2 py-1 border rounded-lg bg-[#240c4a]/60 text-white" />
                    <input type="text" placeholder="Dosage" onChange={(e) =>
                      setMedicineForms(prev => ({ ...prev, [`performer-${performer.id}`]: { ...prev[`performer-${performer.id}`], dosage: e.target.value } }))
                    } className="px-2 py-1 border rounded-lg bg-[#240c4a]/60 text-white" />
                    <input type="time" onChange={(e) =>
                      setMedicineForms(prev => ({ ...prev, [`performer-${performer.id}`]: { ...prev[`performer-${performer.id}`], time_of_day: e.target.value } }))
                    } className="px-2 py-1 border rounded-lg bg-[#240c4a]/60 text-white" />
                    <select onChange={(e) =>
                      setMedicineForms(prev => ({ ...prev, [`performer-${performer.id}`]: { ...prev[`performer-${performer.id}`], frequency: e.target.value } }))
                    } className="px-2 py-1 border rounded-lg bg-[#240c4a]/60 text-white">
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Custom">Custom</option>
                    </select>
                    {medicineForms[`performer-${performer.id}`]?.frequency === "Custom" && (
                      <input type="text" placeholder="Custom frequency" onChange={(e) =>
                        setMedicineForms(prev => ({ ...prev, [`performer-${performer.id}`]: { ...prev[`performer-${performer.id}`], customFrequency: e.target.value } }))
                      } className="px-2 py-1 border rounded-lg bg-[#240c4a]/60 text-white" />
                    )}
                    <Button onClick={() => addMedicine(performer.id)} className="bg-[#6a5cff] hover:bg-[#7e56ff] text-white flex items-center gap-1">
                      <Pill className="w-4 h-4" /> Add Medicine
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setOpenForm(performer.id)} className="mt-4 bg-[#6a5cff] hover:bg-[#7e56ff] text-white flex items-center gap-2">
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
