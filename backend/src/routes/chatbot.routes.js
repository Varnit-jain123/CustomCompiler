// In your main server.js or a new routes/chatbot.js file
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();

// Initialize the Gemini Pro model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System instruction to guide the model
const systemInstruction = {
  role: "system",
  parts: [
    {
      text: "You are an expert code generation assistant inside a code editor. Your main job is to provide high-quality, clean, and efficient code snippets based on the user's request. Only output raw code, unless the user explicitly asks for an explanation or instructions. Do not use markdown backticks (```) in your response.",
    },
  ],
};

router.post("/chat", async (req, res) => {
  try {
    const { history, prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemInstruction,
    });

    // Format the history for the Gemini API
    const chatHistory = history.map((msg) => ({
      role: msg.role, // "user" or "model"
      parts: [{ text: msg.text }],
    }));

    const chat = model.startChat({
      history: chatHistory,
    });

    const result = await chat.sendMessage(prompt);
    const response = result.response;
    const text = response.text();
    console.log("Gemini response:", text);

    res.json({ text }); // Send the bot's response text back to the client
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: "Failed to communicate with AI" });
  }
});

// Make sure to export the router if it's in a separate file
module.exports = router;
