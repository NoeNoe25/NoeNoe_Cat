export const exportToCSV = async (setIsExporting) => {
  setIsExporting(true);

  try {
    const response = await fetch("http://localhost:8008/export/chats-csv");

    if (!response.ok) {
      throw new Error("Failed to generate CSV");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = downloadUrl;

    // Get filename from headers or use default
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "chatgpt_conversations.csv";

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Clean up
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);

    console.log("✅ CSV exported successfully");
    return true;
  } catch (error) {
    console.error("❌ CSV export failed:", error);
    throw error;
  } finally {
    setIsExporting(false);
  }
};

export const fetchChatData = async () => {
  try {
    const response = await fetch("http://localhost:8008/chats?limit=100");
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Failed to fetch chat data:", error);
    throw error;
  }
};
