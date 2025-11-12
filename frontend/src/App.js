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

// import React, { useState, useEffect, useRef } from "react";
// import "./App.css";

// // Create the Web Audio context outside the component
// const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// function App() {
//   // --- State ---
//   const [messages, setMessages] = useState([]);
//   const [inputValue, setInputValue] = useState("");
//   const [isRecording, setIsRecording] = useState(false);
//   const [geminiStatus, setGeminiStatus] = useState({
//     status: "Connecting...",
//     color: "orange",
//   });
//   const [isExporting, setIsExporting] = useState(false);
//   const [showTable, setShowTable] = useState(false);
//   const [chatData, setChatData] = useState([]);

//   // --- Refs ---
//   const wsGemini = useRef(null);
//   const wsVosk = useRef(null);
//   const audioContext = useRef(null);
//   const workletNode = useRef(null);
//   const mediaStream = useRef(null);
//   const finalTranscriptRef = useRef("");
//   const audioQueue = useRef(Promise.resolve());
//   const messagesEndRef = useRef(null);
//   const isRecordingRef = useRef(false); // Add this ref for real-time state

//   // --- Utility Functions ---
//   const updateGeminiStatus = (status, color = "black") => {
//     setGeminiStatus({ status, color });
//   };

//   // --- Auto-scrolling Effect ---
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   // --- Sync isRecording state with ref ---
//   useEffect(() => {
//     isRecordingRef.current = isRecording;
//   }, [isRecording]);

//   // --- Gemini WebSocket Effect ---
//   useEffect(() => {
//     // 1. Initialize WebSocket connection
//     wsGemini.current = new WebSocket("ws://localhost:8765");
//     console.log("Attempting to connect to Gemini WS...");

//     wsGemini.current.onopen = () => {
//       console.log("✅ Gemini WS Connected");
//       updateGeminiStatus("Connected", "green");
//     };

//     wsGemini.current.onclose = () => {
//       console.log("❌ Gemini WS Disconnected");
//       updateGeminiStatus("Disconnected", "red");
//     };

//     wsGemini.current.onerror = (err) => {
//       console.error("⚠️ Gemini WS Error:", err);
//       updateGeminiStatus("Error", "red");
//     };

//     wsGemini.current.onmessage = (event) => {
//       const chunk = event.data;

//       if (chunk === "[[END]]") {
//         return;
//       }

//       // AUDIO chunk
//       if (chunk.startsWith("AUDIO::")) {
//         const audioB64 = chunk.substring(7);
//         const audioBytes = Uint8Array.from(atob(audioB64), (c) =>
//           c.charCodeAt(0)
//         );
//         const audioBlob = new Blob([audioBytes], { type: "audio/mpeg" });

//         // Queue playback
//         audioQueue.current = audioQueue.current.then(async () => {
//           try {
//             const arrayBuffer = await audioBlob.arrayBuffer();
//             const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
//             const source = audioCtx.createBufferSource();
//             source.buffer = audioBuffer;
//             source.connect(audioCtx.destination);
//             source.start();
//             await new Promise((resolve) => (source.onended = resolve));
//           } catch (err) {
//             console.error("Audio playback error:", err);
//           }
//         });
//         return;
//       }

//       // TEXT chunk
//       setMessages((prevMessages) => {
//         const lastMessage = prevMessages[prevMessages.length - 1];

//         // If last message was from Gemini, append to it
//         if (lastMessage && lastMessage.type === "gemini") {
//           const updatedMessages = [...prevMessages];
//           updatedMessages[updatedMessages.length - 1] = {
//             ...lastMessage,
//             text: lastMessage.text + chunk,
//           };
//           return updatedMessages;
//         } else {
//           // Otherwise, add a new Gemini message
//           return [
//             ...prevMessages,
//             { type: "gemini", text: chunk, id: Date.now() },
//           ];
//         }
//       });
//     };

//     // 2. Cleanup function
//     return () => {
//       console.log("Cleaning up Gemini WS");
//       wsGemini.current?.close();
//     };
//   }, []);

//   // --- Send Text Message ---
//   const sendMessage = (messageText = inputValue) => {
//     const message = messageText.trim();
//     if (!message || wsGemini.current?.readyState !== WebSocket.OPEN) return;

//     // Add user message to state
//     setMessages((prev) => [
//       ...prev,
//       { type: "user", text: message, id: Date.now() },
//     ]);

//     // Send to WebSocket
//     wsGemini.current.send(message);

//     // Clear input field
//     setInputValue("");
//   };

//   const handleSendClick = () => {
//     sendMessage();
//   };

//   const handleKeyPress = (e) => {
//     if (e.key === "Enter") {
//       sendMessage();
//     }
//   };

//   // --- Stop Recording Infrastructure (separate from state) ---
//   const stopRecordingInfrastructure = () => {
//     // 1. Disconnect Audio Nodes
//     if (workletNode.current) {
//       workletNode.current.disconnect();
//       workletNode.current = null;
//     }
//     if (audioContext.current) {
//       audioContext.current.close();
//       audioContext.current = null;
//     }
//     if (mediaStream.current) {
//       mediaStream.current.getTracks().forEach((t) => t.stop());
//       mediaStream.current = null;
//     }

//     // 2. Close Vosk WebSocket
//     if (wsVosk.current) {
//       if (wsVosk.current.readyState === WebSocket.OPEN) wsVosk.current.close();
//       wsVosk.current = null;
//     }
//   };

//   // --- Stop Recording Function ---
//   const stopRecording = (shouldSend = true) => {
//     if (!isRecordingRef.current) return;

//     console.log("🛑 stopRecording called with shouldSend:", shouldSend);
//     const transcript = finalTranscriptRef.current.trim();
//     console.log("📝 Final transcript:", transcript);

//     setIsRecording(false);
//     isRecordingRef.current = false;

//     // Stop infrastructure immediately
//     stopRecordingInfrastructure();

//     // Remove the temporary transcript message
//     setMessages((prev) => prev.filter((m) => m.type !== "transcript"));

//     // Send final transcript if needed
//     if (
//       shouldSend &&
//       transcript &&
//       wsGemini.current?.readyState === WebSocket.OPEN
//     ) {
//       console.log("🚀 Sending transcript to Gemini:", transcript);
//       sendMessage(transcript);
//     }

//     // Reset transcript buffer
//     finalTranscriptRef.current = "";
//   };

//   // --- Handle Silence Detection ---
//   const handleSilenceDetection = () => {
//     console.log("🔊 Silence detected, handling auto-stop");

//     const transcript = finalTranscriptRef.current.trim();
//     console.log("📝 Transcript at silence:", transcript);

//     // Update state immediately
//     setIsRecording(false);
//     isRecordingRef.current = false;

//     // Stop all recording infrastructure
//     stopRecordingInfrastructure();

//     // Remove transcript message from UI
//     setMessages((prev) => prev.filter((m) => m.type !== "transcript"));

//     // Send the transcript if we have one
//     if (transcript && wsGemini.current?.readyState === WebSocket.OPEN) {
//       console.log("🚀 Sending from silence detection:", transcript);
//       sendMessage(transcript);
//     } else {
//       console.log("❌ Could not send from silence detection:", {
//         hasTranscript: !!transcript,
//         geminiReady: wsGemini.current?.readyState === WebSocket.OPEN,
//       });
//     }

//     // Reset transcript
//     finalTranscriptRef.current = "";
//   };

//   // --- Start Recording Function ---
//   const startRecording = async () => {
//     // Clean up any previous instances
//     if (isRecordingRef.current) stopRecording(false);

//     setIsRecording(true);
//     isRecordingRef.current = true;
//     finalTranscriptRef.current = "";
//     console.log("Starting recording...");

//     try {
//       mediaStream.current = await navigator.mediaDevices.getUserMedia({
//         audio: true,
//       });
//       audioContext.current = new AudioContext({ sampleRate: 16000 });
//       const source = audioContext.current.createMediaStreamSource(
//         mediaStream.current
//       );

//       // We must use 'vosk-processor.js' from the /public folder
//       await audioContext.current.audioWorklet.addModule("vosk-processor.js");
//       workletNode.current = new AudioWorkletNode(
//         audioContext.current,
//         "vosk-processor"
//       );
//       wsVosk.current = new WebSocket("ws://localhost:2700");
//       wsVosk.current.binaryType = "arraybuffer";

//       wsVosk.current.onopen = () => console.log("✅ Vosk WS Connected");
//       wsVosk.current.onclose = () => {
//         console.log("❌ Vosk WS Disconnected");
//         if (isRecordingRef.current) stopRecording(false);
//       };
//       wsVosk.current.onerror = (err) => {
//         console.error("⚠️ Vosk WS Error:", err);
//         if (isRecordingRef.current) stopRecording(false);
//       };

//       // Handle messages from AudioWorklet
//       workletNode.current.port.onmessage = (event) => {
//         const { type, data } = event.data;
//         if (type === "pcm" && wsVosk.current?.readyState === WebSocket.OPEN) {
//           wsVosk.current.send(data);
//         }
//         if (type === "silence") {
//           console.log(
//             "Silence detected in worklet, current state:",
//             isRecordingRef.current
//           );

//           // Use the ref to check state and handle silence
//           if (isRecordingRef.current) {
//             // Use setTimeout to ensure this runs in the main thread
//             setTimeout(handleSilenceDetection, 0);
//           }
//         }
//       };

//       // Handle messages from Vosk server
//       wsVosk.current.onmessage = (event) => {
//         const result = JSON.parse(event.data);
//         let currentTranscript = "";

//         if (result.partial) {
//           currentTranscript = finalTranscriptRef.current + " " + result.partial;
//         }
//         if (result.text) {
//           finalTranscriptRef.current += " " + result.text;
//           currentTranscript = finalTranscriptRef.current.trim();
//         }

//         if (!currentTranscript) return;

//         // Update or add the transcript message in state
//         setMessages((prev) => {
//           const lastMessage = prev[prev.length - 1];
//           if (lastMessage && lastMessage.type === "transcript") {
//             // Update existing transcript message
//             const newMessages = [...prev];
//             newMessages[newMessages.length - 1].text = currentTranscript;
//             return newMessages;
//           } else {
//             // Add new transcript message
//             return [
//               ...prev,
//               { type: "transcript", text: currentTranscript, id: "transcript" },
//             ];
//           }
//         });
//       };

//       source.connect(workletNode.current);
//       workletNode.current.connect(audioContext.current.destination);
//     } catch (e) {
//       console.error("Start recording failed:", e);
//       stopRecording(false);
//     }
//   };

//   // --- Mic Button Handler ---
//   const handleMicClick = async () => {
//     if (audioCtx.state === "suspended") {
//       await audioCtx.resume();
//     }
//     if (audioContext.current?.state === "suspended") {
//       await audioContext.current.resume();
//     }

//     if (!isRecording) {
//       startRecording();
//     } else {
//       stopRecording(true);
//     }
//   };

//   // --- CSV Export Function ---
//   const exportToCSV = async () => {
//     setIsExporting(true);
//     try {
//       const response = await fetch("http://localhost:8008/export/chats-csv");

//       if (!response.ok) {
//         throw new Error("Failed to generate CSV");
//       }

//       // Create blob from response
//       const blob = await response.blob();

//       // Create download link
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.style.display = "none";
//       a.href = url;

//       // Get filename from response headers or use default
//       const contentDisposition = response.headers.get("Content-Disposition");
//       let filename = "chatgpt_conversations.csv";

//       if (contentDisposition) {
//         const filenameMatch = contentDisposition.match(/filename="(.+)"/);
//         if (filenameMatch) {
//           filename = filenameMatch[1];
//         }
//       }

//       a.download = filename;
//       document.body.appendChild(a);
//       a.click();

//       // Clean up
//       window.URL.revokeObjectURL(url);
//       document.body.removeChild(a);

//       console.log("✅ CSV exported successfully");
//     } catch (error) {
//       console.error("❌ CSV export failed:", error);
//       alert("Failed to export CSV. Please try again.");
//     } finally {
//       setIsExporting(false);
//     }
//   };

//   // --- Fetch Chat Data for Table View ---
//   const fetchChatData = async () => {
//     try {
//       const response = await fetch("http://localhost:8008/chats?limit=100");
//       const data = await response.json();
//       setChatData(data.data || []);
//     } catch (error) {
//       console.error("Failed to fetch chat data:", error);
//       alert("Failed to load chat history. Please try again.");
//     }
//   };

//   // --- Toggle Table View ---
//   const toggleTableView = () => {
//     if (!showTable) {
//       fetchChatData();
//     }
//     setShowTable(!showTable);
//   };

//   // --- Render JSX ---
//   return (
//     <>
//       <header>
//         <div className="header-left">
//           <h1>🐈‍⬛ CatGPT</h1>
//           <div
//             id="geminiStatus"
//             className="status-bar"
//             style={{ color: geminiStatus.color }}
//           >
//             {`Gemini Server: ${geminiStatus.status}`}
//           </div>
//         </div>

//         <div className="header-right">
//           <button onClick={toggleTableView} className="view-table-button">
//             {showTable ? "📋 Hide History" : "📋 View History"}
//           </button>

//           {/* CSV Export Button */}
//           <button
//             id="export-btn"
//             onClick={exportToCSV}
//             disabled={isExporting}
//             className="export-button"
//           >
//             {isExporting ? "⏳ Exporting..." : "📊 Export CSV"}
//           </button>
//         </div>
//       </header>

//       {/* Table View Overlay */}
//       {showTable && (
//         <div className="table-overlay">
//           <div className="table-container">
//             <div className="table-header">
//               <h3>Chat History ({chatData.length} conversations)</h3>
//               <div className="table-actions">
//                 {/* CSV Export Button in Table View */}
//                 <button
//                   onClick={exportToCSV}
//                   disabled={isExporting}
//                   className="export-button"
//                 >
//                   {isExporting ? "⏳ Exporting..." : "📊 Export CSV"}
//                 </button>
//                 <button onClick={toggleTableView} className="close-button">
//                   Close
//                 </button>
//               </div>
//             </div>
//             <div className="table-content">
//               {chatData.length > 0 ? (
//                 <table className="chat-table">
//                   <thead>
//                     <tr>
//                       <th>ID</th>
//                       <th>User Message</th>
//                       <th>Bot Reply</th>
//                       <th>Audio</th>
//                       <th>Created At</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {chatData.map((chat) => (
//                       <tr key={chat.id}>
//                         <td className="id-column">{chat.id}</td>
//                         <td className="message-column">{chat.user_text}</td>
//                         <td className="message-column">{chat.bot_reply}</td>
//                         <td className="audio-column">
//                           {chat.audio_path ? "✅" : "❌"}
//                         </td>
//                         <td className="date-column">
//                           {new Date(chat.created_at).toLocaleString()}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               ) : (
//                 <div className="no-data">No chat history found.</div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       <div id="messages">
//         {messages.map((msg) => (
//           <div key={msg.id} className={`message ${msg.type}-message`}>
//             <b>
//               {msg.type === "user"
//                 ? "You"
//                 : msg.type === "gemini"
//                 ? "Cat Robot"
//                 : "Voice"}
//               :
//             </b>
//             <span className="stream-text"> {msg.text}</span>
//           </div>
//         ))}
//         {/* Empty div for auto-scrolling */}
//         <div ref={messagesEndRef} />
//       </div>

//       <div className="input-container">
//         <input
//           type="text"
//           id="input"
//           placeholder="Type a message..."
//           value={inputValue}
//           onChange={(e) => setInputValue(e.target.value)}
//           onKeyPress={handleKeyPress}
//           disabled={isRecording}
//         />
//         <button id="send-btn" onClick={handleSendClick} disabled={isRecording}>
//           Send
//         </button>
//         <button id="mic-btn" onClick={handleMicClick}>
//           {isRecording ? "⏹ Stop" : "🎤 Start"}
//         </button>
//       </div>
//     </>
//   );
// }

// export default App;
