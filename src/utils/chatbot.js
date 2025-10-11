import { fetchPerformersWithLogs } from "../integrations/supabase/frontendHelper";
import { sendMessageToBot } from "./botpressClient";
/**
 * Returns a chatbot message for the user's medicine status.
 * @param {string} userId
 * @returns {Promise<string>}
 */
export async function handleChatbot(userId) {
  try {
    // 1️⃣ Get all performers & their medicines for this user
    const performers = await fetchPerformersWithLogs(userId);

    // Flatten all medicines
    const medicines = performers.flatMap(p => p.medicines || []);

    if (!medicines || medicines.length === 0) {
      return "You don't have any medicines added yet.";
    }

    // 2️⃣ Check each medicine for today's doses
    const reminders = [];

    for (const med of medicines) {
      if (med.status.toLowerCase() !== "taken") {
        reminders.push(`You have a pending dose of "${med.pill_name}" today.`);
      }
    }

    // 3️⃣ Return message
    if (reminders.length === 0) {
      return "Great! You have taken all your medicines today.";
    }

    return reminders.join("\n");

  } catch (error) {
    console.error("Chatbot error:", error);
    return "Oops! Something went wrong while checking your medicines.";
  }
}
export async function handleChatbot(userId, message) {
  // Optionally, combine with medicine reminders
  const botResponse = await sendMessageToBot(userId, message);
  return botResponse;
}