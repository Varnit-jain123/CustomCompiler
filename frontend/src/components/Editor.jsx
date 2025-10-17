import React, { useState, useRef, useEffect } from 'react';
import Toolbar from './Toolbar';
import Terminal from './Terminal';
import apiService from '../services/api';
import './Editor.css';

const DEFAULT_CODE = `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`;

const Editor = () => {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [executables, setExecutables] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState(14);
  const editorRef = useRef(null);

  useEffect(() => {
    fetchExecutables();
  }, []);

  const fetchExecutables = async () => {
    const result = await apiService.getExecutables();
    if (result.success) {
      setExecutables(result.executables || []);
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('⏳ Compiling...\n');

    const result = await apiService.compileCode(code, 'c');

    if (result.success) {
      const outputText = [
        '✅ Compilation Successful!',
        '',
        '📊 Output:',
        '─────────────────────────────────────',
        result.output || '(no output)',
        '─────────────────────────────────────',
        '',
        `💾 Executable: ${result.executableName}`,
        `⏱️  Compilation Time: ${result.compilationTime}ms`,
        `⚡ Execution Time: ${result.executionTime}ms`,
      ].join('\n');
      setOutput(outputText);
      fetchExecutables();
    } else {
      const errorText = [
        '❌ Compilation Failed!',
        '',
        '🔴 Error Details:',
        '─────────────────────────────────────',
        result.error,
        '─────────────────────────────────────',
      ].join('\n');
      setOutput(errorText);
    }

    setIsRunning(false);
  };

  const handleRunExecutable = async (execName) => {
    setIsRunning(true);
    setOutput(`⏳ Running ${execName}...\n`);

    const result = await apiService.runExecutable(execName);

    if (result.success) {
      const outputText = [
        '✅ Execution Successful!',
        '',
        '📊 Output:',
        '─────────────────────────────────────',
        result.output || '(no output)',
        '─────────────────────────────────────',
        '',
        `⚡ Execution Time: ${result.executionTime}ms`,
      ].join('\n');
      setOutput(outputText);
    } else {
      const errorText = [
        '❌ Execution Failed!',
        '',
        '🔴 Error Details:',
        '─────────────────────────────────────',
        result.error,
        '─────────────────────────────────────',
      ].join('\n');
      setOutput(errorText);
    }

    setIsRunning(false);
  };

  const handleDeleteExecutable = async (execName) => {
    const result = await apiService.deleteExecutable(execName);
    if (result.success) {
      setOutput(`🗑️  Deleted: ${execName}\n`);
      fetchExecutables();
    } else {
      setOutput(`❌ Failed to delete: ${result.error}\n`);
    }
  };

  const handleDownloadExecutable = (execName) => {
    const url = apiService.getDownloadUrl(execName);
    window.open(url, '_blank');
  };

  const handleSaveCode = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'code.c';
    a.click();
    URL.revokeObjectURL(url);
    setOutput('💾 Code saved as code.c\n');
  };

  const handleLoadCode = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCode(event.target.result);
        setOutput(`📂 Loaded: ${file.name}\n`);
      };
      reader.readAsText(file);
    }
  };

  const handleClearOutput = () => {
    setOutput('');
  };

  const handleNewFile = () => {
    if (window.confirm('Create a new file? Any unsaved changes will be lost.')) {
      setCode(DEFAULT_CODE);
      setOutput('📄 New file created\n');
    }
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleFontSizeChange = (size) => {
    setFontSize(size);
  };

  const handleKeyDown = (e) => {
    // Handle Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4;
      }, 0);
    }

    // Handle Ctrl+S (Save)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSaveCode();
    }

    // Handle Ctrl+Enter (Run)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunCode();
    }
  };

  return (
    <div className={`editor-container ${theme}`}>
      <Toolbar
        onRun={handleRunCode}
        onSave={handleSaveCode}
        onLoad={handleLoadCode}
        onNew={handleNewFile}
        onToggleTheme={handleToggleTheme}
        onFontSizeChange={handleFontSizeChange}
        isRunning={isRunning}
        theme={theme}
        fontSize={fontSize}
      />

      <div className="editor-main">
        <div className="editor-section">
          <div className="editor-header">
            <span className="file-name">📄 main.c</span>
            <div className="editor-info">
              <span>Lines: {code.split('\n').length}</span>
              <span>Length: {code.length}</span>
            </div>
          </div>
          <textarea
            ref={editorRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            className="code-editor"
            spellCheck="false"
            style={{ fontSize: `${fontSize}px` }}
            placeholder="Write your C code here..."
          />
        </div>

        <div className="sidebar">
          <div className="sidebar-header">
            <span>📦 Executables ({executables.length})</span>
          </div>
          <div className="executables-list">
            {executables.length === 0 ? (
              <div className="empty-state">
                <p>No executables yet</p>
                <small>Run your code to create executables</small>
              </div>
            ) : (
              executables.map((exec) => (
                <div key={exec.name} className="executable-item">
                  <div
                    className="executable-name"
                    onClick={() => handleRunExecutable(exec.name)}
                    title={`Click to run: ${exec.name}`}
                  >
                    <span className="exec-icon">⚙️</span>
                    <span className="exec-text">{exec.name}</span>
                  </div>
                  <div className="executable-actions">
                    <button
                      onClick={() => handleDownloadExecutable(exec.name)}
                      title="Download"
                      className="action-btn download-btn"
                    >
                      ⬇️
                    </button>
                    <button
                      onClick={() => handleDeleteExecutable(exec.name)}
                      title="Delete"
                      className="action-btn delete-btn"
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="executable-meta">
                    <small>{new Date(exec.created).toLocaleString()}</small>
                    <small>{(exec.size / 1024).toFixed(2)} KB</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Terminal
        output={output}
        onClear={handleClearOutput}
        theme={theme}
      />
    </div>
  );
};

export default Editor;