import React from "react";

const ChatHistoryTable = ({ chatData, isExporting, onExportCSV, onClose }) => {
  return (
    <div className="table-overlay">
      <div className="table-container">
        <div className="table-header">
          <h3>Chat History ({chatData.length} conversations)</h3>
          <div className="table-actions">
            <button
              onClick={onExportCSV}
              disabled={isExporting}
              className="export-button"
            >
              {isExporting ? "⏳ Exporting..." : "📊 Export CSV"}
            </button>
            <button onClick={onClose} className="close-button">
              Close
            </button>
          </div>
        </div>
        <div className="table-content">
          {chatData.length > 0 ? (
            <table className="chat-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User Message</th>
                  <th>Bot Reply</th>
                  <th>Audio</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {chatData.map((chat) => (
                  <tr key={chat.id}>
                    <td className="id-column">{chat.id}</td>
                    <td className="message-column">{chat.user_text}</td>
                    <td className="message-column">{chat.bot_reply}</td>
                    <td className="audio-column">
                      {chat.audio_path ? "✅" : "❌"}
                    </td>
                    <td className="date-column">
                      {new Date(chat.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-data">No chat history found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHistoryTable;
