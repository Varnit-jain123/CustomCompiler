import React, { useState, useEffect, useRef } from "react";
import "./Chatbot.css"; // We'll create this CSS file next
import { apiService } from "../services/api";

const Chatbot = () => {
  // State for messages: { role: 'user' | 'model', text: '...' }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Ref for the message list div
  const messagesEndRef = useRef(null);

  // Function to scroll to the bottom of the messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userPrompt = input.trim();
    if (!userPrompt) return; // Don't send empty messages

    // Clear the input and set loading
    setInput("");
    setIsLoading(true);

    // Add user's message to state immediately
    const userMessage = { role: "user", text: userPrompt };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    try {
      const data = await apiService.sendChatMessage({
        history: messages,
        prompt: userPrompt,
      });
      console.log("Chatbot API response:", data.data.text);

      const botMessage = { role: "model", text: data.data.text };
      setMessages([...newMessages, botMessage]);
    } catch (error) {
      console.error("Error in Chatbot component:", error);
      const errorMessage = {
        role: "model",
        text: "Sorry, I ran into an error. Please try again.",
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {/* Simple text display. You can add Markdown rendering later! */}
            <pre>{msg.text}</pre>
          </div>
        ))}
        {isLoading && (
          <div className="message model">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        {/* Empty div to scroll to */}
        <div ref={messagesEndRef} />
      </div>
      <form className="chatbot-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for code..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
};

export default Chatbot;
