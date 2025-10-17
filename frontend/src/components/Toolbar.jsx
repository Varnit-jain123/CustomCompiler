import React from 'react';
import { Play, Save, Upload, FileText, Sun, Moon, ZoomIn, ZoomOut } from 'lucide-react';
import './Toolbar.css';

const Toolbar = ({
  onRun,
  onSave,
  onLoad,
  onNew,
  onToggleTheme,
  onFontSizeChange,
  isRunning,
  theme,
  fontSize
}) => {
  const handleFontIncrease = () => {
    if (fontSize < 24) onFontSizeChange(fontSize + 2);
  };

  const handleFontDecrease = () => {
    if (fontSize > 10) onFontSizeChange(fontSize - 2);
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <h1 className="toolbar-title">
          <span className="title-icon">⚡</span>
          Online C Compiler
        </h1>
      </div>

      <div className="toolbar-center">
        <button
          onClick={onRun}
          disabled={isRunning}
          className="toolbar-btn run-btn"
          title="Run Code (Ctrl+Enter)"
        >
          <Play size={18} />
          <span>{isRunning ? 'Running...' : 'Run'}</span>
        </button>
      </div>

      <div className="toolbar-right">
        <button
          onClick={onNew}
          className="toolbar-btn"
          title="New File"
        >
          <FileText size={18} />
        </button>

        <button
          onClick={onSave}
          className="toolbar-btn"
          title="Save Code (Ctrl+S)"
        >
          <Save size={18} />
        </button>

        <label className="toolbar-btn" title="Load Code">
          <Upload size={18} />
          <input
            type="file"
            accept=".c,.cpp,.txt"
            onChange={onLoad}
            style={{ display: 'none' }}
          />
        </label>

        <div className="toolbar-divider"></div>

        <button
          onClick={handleFontDecrease}
          className="toolbar-btn"
          title="Decrease Font Size"
        >
          <ZoomOut size={18} />
        </button>

        <span className="font-size-indicator">{fontSize}px</span>

        <button
          onClick={handleFontIncrease}
          className="toolbar-btn"
          title="Increase Font Size"
        >
          <ZoomIn size={18} />
        </button>

        <div className="toolbar-divider"></div>

        <button
          onClick={onToggleTheme}
          className="toolbar-btn"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </div>
  );
};

export default Toolbar;