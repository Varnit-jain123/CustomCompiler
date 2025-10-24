import React, { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Trash2 } from 'lucide-react';

const Terminal = ({ output, onClear }) => {
  const terminalRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to bottom when new output arrives
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  const formatOutput = (text) => {
    if (!text) return [];

    const lines = text.split('\n');
    return lines.map((line, index) => {
      let className = 'terminal-line';
      
      if (line.toLowerCase().includes('error')) {
        className += ' error';
      } else if (line.toLowerCase().includes('warning')) {
        className += ' warning';
      } else if (line.toLowerCase().includes('success')) {
        className += ' success';
      } else if (line.includes('%')) {
        className += ' progress';
      }

      return (
        <div key={index} className={className}>
          {line}
        </div>
      );
    });
  };

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-title">
          <TerminalIcon size={16} />
          <span>Output</span>
        </div>
        <button
          className="terminal-clear-btn"
          onClick={onClear}
          title="Clear output"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="terminal-content" ref={terminalRef}>
        {output ? (
          formatOutput(output)
        ) : (
          <div className="terminal-empty">
            Click "Verify" to compile or "Upload" to flash your board
          </div>
        )}
      </div>
    </div>
  );
};

export default Terminal;