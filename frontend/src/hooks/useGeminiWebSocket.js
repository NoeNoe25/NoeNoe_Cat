import { useState, useRef, useCallback } from "react";

// Single audio context for the entire app
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioQueue = Promise.resolve();

const useGeminiWebSocket = (setMessages) => {
  const [geminiStatus, setGeminiStatus] = useState({
    status: "Connecting...",
    color: "orange",
  });

  const ws = useRef(null);

  // Single audio playback function with proper queue management
  const playAudioFromBase64 = useCallback((base64Data) => {
    audioQueue = audioQueue
      .then(async () => {
        try {
          // Ensure audio context is resumed
          if (audioCtx.state === "suspended") {
            await audioCtx.resume();
          }

          const audioBytes = Uint8Array.from(atob(base64Data), (c) =>
            c.charCodeAt(0)
          );
          const audioBlob = new Blob([audioBytes], { type: "audio/mpeg" });
          const arrayBuffer = await audioBlob.arrayBuffer();

          // Decode audio data
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

          // Create and play audio source
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioCtx.destination);

          // Wait for this audio to finish before playing next
          await new Promise((resolve) => {
            source.onended = resolve;
            source.start();
          });

          console.log("🔊 Audio playback completed");
        } catch (error) {
          console.error("Audio playback error:", error);
        }
      })
      .catch((error) => {
        console.error("Audio queue error:", error);
      });
  }, []);

  const handleMessage = useCallback(
    (event) => {
      const chunk = event.data;

      if (chunk === "[[END]]") return;

      // Handle audio chunks
      if (chunk.startsWith("AUDIO::")) {
        const audioB64 = chunk.substring(7);
        console.log("🎵 Received audio chunk, queuing playback...");
        playAudioFromBase64(audioB64);
        return;
      }

      // Handle text chunks
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.type === "gemini") {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...lastMessage,
            text: lastMessage.text + chunk,
          };
          return updated;
        } else {
          return [...prev, { type: "gemini", text: chunk, id: Date.now() }];
        }
      });
    },
    [setMessages, playAudioFromBase64]
  );

  const connect = useCallback(() => {
    ws.current = new WebSocket("ws://localhost:8765");

    ws.current.onopen = () => {
      console.log("✅ Gemini WS Connected");
      setGeminiStatus({ status: "Connected", color: "green" });
    };

    ws.current.onclose = () => {
      console.log("❌ Gemini WS Disconnected");
      setGeminiStatus({ status: "Disconnected", color: "red" });
    };

    ws.current.onerror = (err) => {
      console.error("⚠️ Gemini WS Error:", err);
      setGeminiStatus({ status: "Error", color: "red" });
    };

    ws.current.onmessage = handleMessage;
  }, [handleMessage]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);

  const sendMessage = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(message);
    } else {
      console.warn("Gemini WebSocket not connected");
    }
  }, []);

  const isConnected = useCallback(() => {
    return ws.current && ws.current.readyState === WebSocket.OPEN;
  }, []);

  // Connect on mount
  useState(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    geminiStatus,
    sendMessage,
    isConnected,
    connect,
    disconnect,
  };
};

export default useGeminiWebSocket;
