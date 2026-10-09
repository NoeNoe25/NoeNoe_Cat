import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

// Components
import Header from "./components/Header";
import MessageList from "./components/MessageList";
import InputControls from "./components/InputControls";
import ChatHistoryTable from "./components/ChatHistoryTable";

// Hooks
import useGeminiWebSocket from "./hooks/useGeminiWebSocket";
import useVoskWebSocket from "./hooks/useVoskWebSocket";

// Utils
import { exportToCSV, fetchChatData } from "./utils/exportUtils";

function App() {
  // State
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [chatData, setChatData] = useState([]);

  // Refs
  const messagesEndRef = useRef(null);

  // Hooks
  const {
    geminiStatus,
    sendMessage: sendToGemini,
    isConnected: isGeminiConnected,
  } = useGeminiWebSocket(setMessages);

  const { isRecording, startRecording, stopRecording, setOnSilenceDetected } =
    useVoskWebSocket(setMessages);

  // Auto-scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message handler
  const sendMessage = useCallback(
    (messageText = inputValue) => {
      const message = messageText.trim();
      if (!message || !isGeminiConnected()) return;

      // Add user message to UI
      setMessages((prev) => [
        ...prev,
        { type: "user", text: message, id: Date.now() },
      ]);

      // Send to Gemini
      sendToGemini(message);
      setInputValue("");
    },
    [inputValue, isGeminiConnected, sendToGemini]
  );

  // Handle silence detection - auto send the message
  const handleSilenceDetected = useCallback(
    (transcript) => {
      console.log("🎯 Silence detected, auto-sending transcript:", transcript);
      if (transcript && isGeminiConnected()) {
        sendMessage(transcript);
      }
    },
    [isGeminiConnected, sendMessage]
  );

  // Set up silence detection callback
  useEffect(() => {
    setOnSilenceDetected(handleSilenceDetected);
  }, [setOnSilenceDetected, handleSilenceDetected]);

  // Handle manual stop recording
  const handleStopRecording = () => {
    const transcript = stopRecording();
    if (transcript) {
      console.log("🎤 Manual stop, sending transcript:", transcript);
      sendMessage(transcript);
    }
  };

  // Handle start recording
  const handleStartRecording = async () => {
    await startRecording();
  };

  // Export handlers
  const handleExportCSV = async () => {
    try {
      await exportToCSV(setIsExporting);
    } catch (error) {
      alert("Failed to export CSV. Please try again.");
    }
  };

  // Table view handlers
  const handleToggleTableView = async () => {
    if (!showTable) {
      try {
        const data = await fetchChatData();
        setChatData(data);
      } catch (error) {
        alert("Failed to load chat history. Please try again.");
      }
    }
    setShowTable(!showTable);
  };

  return (
    <div className="app">
      <Header
        geminiStatus={geminiStatus}
        onToggleHistory={handleToggleTableView}
        showTable={showTable}
        onExportCSV={handleExportCSV}
        isExporting={isExporting}
      />

      {showTable && (
        <ChatHistoryTable
          chatData={chatData}
          isExporting={isExporting}
          onExportCSV={handleExportCSV}
          onClose={handleToggleTableView}
        />
      )}

      <MessageList messages={messages} messagesEndRef={messagesEndRef} />

      <InputControls
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSendMessage={sendMessage}
        isRecording={isRecording}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
      />
    </div>
  );
}

export default App;
