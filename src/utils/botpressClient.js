const BOT_URL = "http://localhost:3000/api/v1/bots/<bot-id>/converse";

export async function sendMessageToBot(userId, message) {
  try {
    const res = await fetch(BOT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "text",
        text: message,
        user: userId,
      }),
    });

    if (!res.ok) throw new Error("Failed to fetch from Botpress");

    const data = await res.json();
    // Botpress can return multiple messages
    return data.responses?.map(r => r.text).join("\n") || "No response";
  } catch (err) {
    console.error("Botpress error:", err);
    return "Oops! Bot is not available right now.";
  }
}
