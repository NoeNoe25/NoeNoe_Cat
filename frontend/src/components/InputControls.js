import React from "react";

const InputControls = ({
  inputValue,
  onInputChange,
  onSendMessage,
  isRecording,
  onStartRecording,
  onStopRecording,
}) => {
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      onSendMessage();
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <div className="input-container">
      <input
        type="text"
        className="message-input"
        placeholder="Type a message..."
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={isRecording}
      />
      <button
        className="send-button"
        onClick={onSendMessage}
        disabled={isRecording}
      >
        🚀 Send
      </button>
      <button
        className={`mic-button ${isRecording ? "recording" : ""}`}
        onClick={handleMicClick}
      >
        {isRecording ? "⏹ Stop" : "🎤 Voice"}
      </button>
    </div>
  );
};

export default InputControls;
