import React, { useState } from 'react';
import { Play, Upload, Wifi, CheckCircle } from 'lucide-react';
import BoardSelector from './BoardSelector';
import PortSelector from './PortSelector';

const Toolbar = ({
  selectedBoard,
  onBoardSelect,
  selectedPort,
  onPortSelect,
  onVerify,
  onUpload,
  onSerialMonitor,
  isCompiling,
  isUploading
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleVerify = () => {
    if (!isCompiling && !isUploading && selectedBoard) {
      onVerify();
    }
  };

  const handleUpload = () => {
    if (!isCompiling && !isUploading && selectedBoard && selectedPort) {
      onUpload();
    }
  };

  const handleSerialMonitor = () => {
    if (selectedPort && !isUploading) {
      onSerialMonitor();
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <BoardSelector
          selectedBoard={selectedBoard}
          onSelect={onBoardSelect}
        />
        <PortSelector
          selectedPort={selectedPort}
          onSelect={onPortSelect}
          disabled={isUploading}
        />
      </div>

      <div className="toolbar-section actions">
        <button
          className="toolbar-btn verify"
          onClick={handleVerify}
          disabled={isCompiling || isUploading || !selectedBoard}
          title="Verify code (Compile without uploading)"
        >
          <CheckCircle size={16} />
          <span>{isCompiling ? 'Compiling...' : 'Verify'}</span>
        </button>

        <button
          className="toolbar-btn upload"
          onClick={handleUpload}
          disabled={isCompiling || isUploading || !selectedBoard || !selectedPort}
          title="Compile and upload to board"
        >
          <Upload size={16} />
          <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
        </button>

        <button
          className="toolbar-btn serial"
          onClick={handleSerialMonitor}
          disabled={!selectedPort || isUploading}
          title="Open Serial Monitor"
        >
          <Wifi size={16} />
          <span>Serial Monitor</span>
        </button>
      </div>

      <div className="toolbar-section">
        <button
          className="toolbar-btn advanced"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          Advanced {showAdvanced ? '▲' : '▼'}
        </button>
      </div>

      {showAdvanced && (
        <div className="toolbar-advanced">
          <label>
            Optimization:
            <select defaultValue="Os">
              <option value="O0">None (-O0)</option>
              <option value="O1">Basic (-O1)</option>
              <option value="O2">Full (-O2)</option>
              <option value="Os">Size (-Os)</option>
            </select>
          </label>
          <label>
            <input type="checkbox" />
            Debug symbols
          </label>
        </div>
      )}
    </div>
  );
};

export default Toolbar;