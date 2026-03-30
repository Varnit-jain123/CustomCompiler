import React from 'react';
import MonacoEditor from '@monaco-editor/react';

const Editor = ({ code, onChange, readOnly, theme }) => {
  const handleEditorChange = (value) => {
    if (onChange && !readOnly) {
      onChange(value);
    }
  };

  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    readOnly: readOnly || false,
    theme: 'vs-dark',
    wordWrap: 'on'
  };

  return (
    <div className="editor-container">
      <MonacoEditor
        height="100%"
        defaultLanguage="cpp"
        value={code}
        onChange={handleEditorChange}
        options={editorOptions}
        theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
      />
    </div>
  );
};

export default Editor;