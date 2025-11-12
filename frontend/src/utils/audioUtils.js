// Audio context for playback
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export const playAudioFromBase64 = (base64Data) => {
  try {
    const audioBytes = Uint8Array.from(atob(base64Data), (c) =>
      c.charCodeAt(0)
    );
    const audioBlob = new Blob([audioBytes], { type: "audio/mpeg" });

    // Convert blob to array buffer and play
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result;
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start();
      } catch (err) {
        console.error("Audio playback error:", err);
      }
    };
    reader.readAsArrayBuffer(audioBlob);
  } catch (error) {
    console.error("Error processing base64 audio:", error);
  }
};

export const resumeAudioContext = async () => {
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
};
