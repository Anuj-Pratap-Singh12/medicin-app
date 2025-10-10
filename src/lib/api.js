/**
 * Updates a medicine and syncs changes to Google Calendar.
 * @param {number} medicineId - The ID of the medicine to update.
 * @param {object} updates - The updated medicine data.
 * @param {object} user - The Supabase user.
 * @returns {boolean} True if success, false otherwise.
 */
export const updateMedicineAndSync = async (medicineId, updates, user) => {
  try {
    // 1️⃣ Update medicine in Supabase
    const { data: updatedMedicine, error: updateError } = await supabase
      .from("medicines")
      .update(updates)
      .eq("id", medicineId)
      .select()
      .single();

    if (updateError) throw updateError;
    toast.success("Medicine updated successfully!");

    // 2️⃣ Sync with Google Calendar
    if (updatedMedicine.google_calendar_event_id) {
      console.log("🚀 Syncing updated medicine with Google Calendar...");
      const { error: syncError } = await supabase.functions.invoke(
        "update-calendar-event",
        {
          body: {
            user,
            eventId: updatedMedicine.google_calendar_event_id,
            pill_name: updatedMedicine.pill_name,
            time_of_day: updatedMedicine.time_of_day,
            dosage: updatedMedicine.dosage,
            frequency: updatedMedicine.frequency,
          },
        }
      );

      if (syncError) {
        console.error("❌ Calendar update error:", syncError);
        toast.error("Failed to sync update with Google Calendar.");
      } else {
        toast.success("Synced with Google Calendar!");
      }
    } else {
      console.log("ℹ️ No existing event ID. Creating new one...");
      const today = new Date();
      const startTime = new Date(
        today.toDateString() + " " + updatedMedicine.time_of_day
      );
      const endTime = new Date(startTime.getTime() + 30 * 60000);

      const { data: eventData, error: eventError } = await supabase.functions.invoke(
        "create-calendar-event",
        {
          body: {
            user,
            medicine: {
              ...updatedMedicine,
              start_datetime: startTime.toISOString(),
              end_datetime: endTime.toISOString(),
            },
          },
        }
      );

      if (eventError) {
        console.error("❌ Calendar create error:", eventError);
        toast.error("Failed to create new Google Calendar event.");
      } else if (eventData?.eventId) {
        await supabase
          .from("medicines")
          .update({ google_calendar_event_id: eventData.eventId })
          .eq("id", medicineId);
        toast.success("Created and synced new event to Calendar!");
      }
    }

    return true;
  } catch (err) {
    console.error("❌ updateMedicineAndSync error:", err);
    toast.error("Failed to update medicine");
    return false;
  }
};
