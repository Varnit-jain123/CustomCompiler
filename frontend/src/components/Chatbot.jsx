import React, { useState, useEffect, useRef } from "react";
import "./Chatbot.css";
import { apiService } from "../services/api";

const Chatbot = () => {
  // State for messages: { role: 'user' | 'model', text: '...' }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

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

  const handleCopy = (textToCopy, index) => {
    if (!navigator.clipboard) {
      // Fallback for insecure contexts (non-HTTPS) or very old browsers
      alert("Clipboard API not available. Please copy manually.");
      return;
    }

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        // Success! Show feedback.
        setCopiedIndex(index);
        // Reset the "Copied!" message after 2 seconds
        setTimeout(() => {
          setCopiedIndex(null);
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
        alert("Failed to copy text. Please copy manually.");
      });
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message-wrapper ${msg.role}`}>
            <div className={`message ${msg.role}`}>
              <pre>{msg.text}</pre>
            </div>

            {/* --- NEW COPY BUTTON --- */}
            {msg.role === "model" && msg.text && (
              <button
                className={`copy-button ${
                  copiedIndex === index ? "copied" : ""
                }`}
                onClick={() => handleCopy(msg.text, index)}
                title="Copy code"
              >
                {copiedIndex === index ? (
                  "Copied!"
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
                    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zM-1 1.5A1.5 1.5 0 0 1 .5 0h3a.5.5 0 0 1 0 1h-3A.5.5 0 0 0 0 1.5v1a.5.5 0 0 1-1 0v-1z" />
                  </svg>
                )}
              </button>
            )}
            {/* --- END OF NEW BUTTON --- */}
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
