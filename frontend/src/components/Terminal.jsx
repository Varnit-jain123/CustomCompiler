import React, { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, X } from 'lucide-react';
import './Terminal.css';

const Terminal = ({ output, onClear, theme }) => {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-title">
          <TerminalIcon size={16} />
          <span>Output</span>
        </div>
        <button
          onClick={onClear}
          className="clear-btn"
          title="Clear Output"
        >
          <X size={16} />
          Clear
        </button>
      </div>
      <pre ref={terminalRef} className="terminal-output">
        {output || '👋 Welcome to Online C Compiler!\n\nWrite your C code and click "Run" to compile and execute.\n\nKeyboard Shortcuts:\n  • Ctrl+Enter - Run code\n  • Ctrl+S - Save code\n  • Tab - Insert 4 spaces'}
      </pre>
    </div>
  );
};

export default Terminal;