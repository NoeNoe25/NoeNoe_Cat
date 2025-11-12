import React from "react";

const MessageList = ({ messages, messagesEndRef }) => {
  const getSenderName = (type) => {
    switch (type) {
      case "user":
        return "You";
      case "gemini":
        return "Cat Robot";
      case "transcript":
        return "Voice";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="messages-container">
      {messages.map((msg) => (
        <div key={msg.id} className={`message ${msg.type}-message`}>
          <b>{getSenderName(msg.type)}:</b>
          <span className="message-text"> {msg.text}</span>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
