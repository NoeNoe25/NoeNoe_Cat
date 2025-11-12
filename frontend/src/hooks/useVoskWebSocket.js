import { useState, useRef, useCallback } from "react";

const useVoskWebSocket = (setMessages) => {
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const isManualStopRef = useRef(false);

  const ws = useRef(null);
  const audioContext = useRef(null);
  const workletNode = useRef(null);
  const mediaStream = useRef(null);
  const finalTranscriptRef = useRef("");
  const onSilenceDetectedRef = useRef(null);

  // Set callback for silence detection
  const setOnSilenceDetected = useCallback((callback) => {
    onSilenceDetectedRef.current = callback;
  }, []);

  const handleVoskMessage = useCallback(
    (event) => {
      const result = JSON.parse(event.data);
      let currentTranscript = "";

      if (result.partial) {
        currentTranscript = finalTranscriptRef.current + " " + result.partial;
      }
      if (result.text) {
        finalTranscriptRef.current += " " + result.text;
        currentTranscript = finalTranscriptRef.current.trim();
      }

      if (!currentTranscript) return;

      // Update transcript in UI
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.type === "transcript") {
          const updated = [...prev];
          updated[updated.length - 1].text = currentTranscript;
          return updated;
        } else {
          return [
            ...prev,
            { type: "transcript", text: currentTranscript, id: "transcript" },
          ];
        }
      });
    },
    [setMessages]
  );

  const handleWorkletMessage = useCallback((event) => {
    const { type, data } = event.data;

    if (type === "pcm" && ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(data);
    }

    if (type === "silence") {
      console.log(
        "🔊 Silence detected in worklet, current state:",
        isRecordingRef.current
      );
      console.log("🛑 Manual stop flag:", isManualStopRef.current);

      // Only process silence if it wasn't a manual stop
      if (isRecordingRef.current && !isManualStopRef.current) {
        setTimeout(() => {
          if (isRecordingRef.current && !isManualStopRef.current) {
            const finalTranscript = finalTranscriptRef.current.trim();
            handleSilenceStop();

            // Call the silence detected callback with the final transcript
            if (onSilenceDetectedRef.current && finalTranscript) {
              onSilenceDetectedRef.current(finalTranscript);
            }
          }
        }, 0);
      }
    }
  }, []);

  const handleSilenceStop = useCallback(() => {
    setIsRecording(false);
    isRecordingRef.current = false;

    // Clean up resources
    if (workletNode.current) {
      workletNode.current.disconnect();
      workletNode.current = null;
    }

    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }

    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach((track) => track.stop());
      mediaStream.current = null;
    }

    if (ws.current) {
      if (ws.current.readyState === WebSocket.OPEN) ws.current.close();
      ws.current = null;
    }

    // Remove transcript message from UI
    setMessages((prev) => prev.filter((m) => m.type !== "transcript"));
  }, [setMessages]);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return;

    try {
      setIsRecording(true);
      isRecordingRef.current = true;
      isManualStopRef.current = false; // Reset manual stop flag
      finalTranscriptRef.current = "";

      // Get user media
      mediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Setup audio context and worklet
      audioContext.current = new AudioContext({
        sampleRate: 16000,
        latencyHint: "interactive",
      });

      const source = audioContext.current.createMediaStreamSource(
        mediaStream.current
      );

      await audioContext.current.audioWorklet.addModule("vosk-processor.js");
      workletNode.current = new AudioWorkletNode(
        audioContext.current,
        "vosk-processor"
      );
      workletNode.current.port.onmessage = handleWorkletMessage;

      // Connect to Vosk server
      ws.current = new WebSocket("ws://localhost:2700");
      ws.current.binaryType = "arraybuffer";
      ws.current.onmessage = handleVoskMessage;
      ws.current.onopen = () => console.log("✅ Vosk WS Connected");
      ws.current.onclose = () => {
        console.log("❌ Vosk WS Disconnected");
        if (isRecordingRef.current && !isManualStopRef.current) {
          handleSilenceStop();
        }
      };

      // Connect audio nodes
      source.connect(workletNode.current);
      workletNode.current.connect(audioContext.current.destination);

      console.log("🎤 Recording started");
    } catch (error) {
      console.error("Failed to start recording:", error);
      setIsRecording(false);
      isRecordingRef.current = false;
      isManualStopRef.current = false;
    }
  }, [handleWorkletMessage, handleVoskMessage, handleSilenceStop]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return "";

    console.log("🛑 Manual stopRecording called");

    // Set manual stop flag to prevent silence detection
    isManualStopRef.current = true;

    const finalTranscript = finalTranscriptRef.current.trim();

    // Clean up resources
    if (workletNode.current) {
      workletNode.current.disconnect();
      workletNode.current = null;
    }

    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }

    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach((track) => track.stop());
      mediaStream.current = null;
    }

    if (ws.current) {
      if (ws.current.readyState === WebSocket.OPEN) ws.current.close();
      ws.current = null;
    }

    // Update state
    setIsRecording(false);
    isRecordingRef.current = false;

    // Remove transcript message from UI
    setMessages((prev) => prev.filter((m) => m.type !== "transcript"));

    return finalTranscript;
  }, [setMessages]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    setOnSilenceDetected,
    finalTranscript: finalTranscriptRef.current,
  };
};

export default useVoskWebSocket;
