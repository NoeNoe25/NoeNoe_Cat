import React from "react";

const Header = ({
  geminiStatus,
  onToggleHistory,
  showTable,
  onExportCSV,
  isExporting,
}) => {
  return (
    <header className="header">
      <div className="header-left">
        <h1>🐈‍⬛ CatGPT</h1>
        <div className="status-bar" style={{ color: geminiStatus.color }}>
          {`Gemini Server: ${geminiStatus.status}`}
        </div>
      </div>

      <div className="header-right">
        <button onClick={onToggleHistory} className="view-table-button">
          {showTable ? "📋 Hide History" : "📋 View History"}
        </button>

        <button
          onClick={onExportCSV}
          disabled={isExporting}
          className="export-button"
        >
          {isExporting ? "⏳ Exporting..." : "📊 Export CSV"}
        </button>
      </div>
    </header>
  );
};

export default Header;
