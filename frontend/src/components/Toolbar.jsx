import React, { useState } from 'react';
import { Upload, Wifi, CheckCircle} from 'lucide-react';
import BoardSelector from './BoardSelector';
import PortSelector from './PortSelector';
import OTADeviceSelector from './OTADeviceSelector';

const Toolbar = ({
  selectedBoard,
  onBoardSelect,
  selectedPort,
  onPortSelect,
  selectedOTADevice,
  onOTADeviceSelect,
  onVerify,
  onUpload,
  onUploadOTA,
  onSerialMonitor,
  isCompiling,
  isUploading,
  uploadMethod,
  onUploadMethodChange
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleVerify = () => {
    if (!isCompiling && !isUploading && selectedBoard) {
      onVerify();
    }
  };

  const handleUpload = () => {
    if (!isCompiling && !isUploading && selectedBoard) {
      if (uploadMethod === 'usb' && selectedPort) {
        onUpload();
      } else if (uploadMethod === 'ota' && selectedOTADevice) {
        onUploadOTA();
      }
    }
  };

  const handleSerialMonitor = () => {
    if (selectedPort && !isUploading) {
      onSerialMonitor();
    }
  };

  const isESP = selectedBoard && (selectedBoard.includes('esp32') || selectedBoard.includes('esp8266'));

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <BoardSelector
          selectedBoard={selectedBoard}
          onSelect={onBoardSelect}
        />

        {/* Upload Method Selector (only for ESP boards) */}
        {isESP && (
          <div className="upload-method-selector">
            <label>
              <input
                type="radio"
                value="usb"
                checked={uploadMethod === 'usb'}
                onChange={(e) => onUploadMethodChange(e.target.value)}
              />
              USB
            </label>
            <label>
              <input
                type="radio"
                value="ota"
                checked={uploadMethod === 'ota'}
                onChange={(e) => onUploadMethodChange(e.target.value)}
              />
              OTA (WiFi)
            </label>
          </div>
        )}

        {/* Show appropriate selector based on upload method */}
        {uploadMethod === 'usb' ? (
          <PortSelector
            selectedPort={selectedPort}
            onSelect={onPortSelect}
            disabled={isUploading}
          />
        ) : (
          <OTADeviceSelector
            selectedDevice={selectedOTADevice}
            onSelect={onOTADeviceSelect}
            disabled={isUploading}
          />
        )}
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
          disabled={
            isCompiling || 
            isUploading || 
            !selectedBoard || 
            (uploadMethod === 'usb' && !selectedPort) ||
            (uploadMethod === 'ota' && !selectedOTADevice)
          }
          title={uploadMethod === 'ota' ? 'Compile and upload via WiFi' : 'Compile and upload via USB'}
        >
          {uploadMethod === 'ota' ? <Wifi size={16} /> : <Upload size={16} />}
          <span>{isUploading ? 'Uploading...' : `Upload (${uploadMethod.toUpperCase()})`}</span>
        </button>

        {uploadMethod === 'usb' && (
          <button
            className="toolbar-btn serial"
            onClick={handleSerialMonitor}
            disabled={!selectedPort || isUploading}
            title="Open Serial Monitor"
          >
            <Wifi size={16} />
            <span>Serial Monitor</span>
          </button>
        )}
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
          {uploadMethod === 'ota' && (
            <label>
              OTA Password:
              <input type="password" placeholder="Optional" />
            </label>
          )}
        </div>
      )}
    </div>
  );
};

export default Toolbar;