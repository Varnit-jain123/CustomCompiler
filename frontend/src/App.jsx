import React, { useState, useEffect } from 'react';
import './App.css';
import Editor from './components/Editor';
import Terminal from './components/Terminal';
import Toolbar from './components/Toolbar';
import SerialMonitor from './components/SerialMonitor';
import { apiService } from './services/api';
import websocketService from './services/websocket';

const DEFAULT_CODE = `void setup() {
  // Initialize serial communication at 9600 baud
  Serial.begin(9600);
  
  // Initialize digital pin LED_BUILTIN as an output
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);   // Turn the LED on
  Serial.println("LED ON");
  delay(1000);                       // Wait for a second
  
  digitalWrite(LED_BUILTIN, LOW);    // Turn the LED off
  Serial.println("LED OFF");
  delay(1000);                       // Wait for a second
}`;

function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState('');
  const [selectedBoard, setSelectedBoard] = useState('');
  const [selectedPort, setSelectedPort] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSerialMonitor, setShowSerialMonitor] = useState(false);
  const [compilationId, setCompilationId] = useState(null);

  useEffect(() => {
    // Connect to compile WebSocket
    const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:5000'}/ws/compile`;
    
    websocketService.connect(wsUrl).then(() => {
      console.log('Connected to compile WebSocket');
      
      websocketService.on('progress', handleCompileProgress);
    }).catch(error => {
      console.error('WebSocket connection failed:', error);
    });

    return () => {
      websocketService.disconnect();
    };
  }, []);

  const handleCompileProgress = (data) => {
    if (data.compilationId === compilationId) {
      appendOutput(`[${data.stage}] ${data.message || ''} ${data.percentage || ''}%\n`);
    }
  };

  const appendOutput = (text) => {
    setOutput(prev => prev + text);
  };

  const clearOutput = () => {
    setOutput('');
  };

  const handleVerify = async () => {
    if (!selectedBoard) {
      alert('Please select a board');
      return;
    }

    setIsCompiling(true);
    clearOutput();
    appendOutput('Starting compilation...\n');

    try {
      const response = await apiService.compile({
        code,
        boardId: selectedBoard,
        options: {
          optimization: 'Os',
          debugSymbols: false
        }
      });

      setCompilationId(response.data.compilationId);

      const result = response.data.result;
      appendOutput(`\n✓ Compilation successful!\n`);
      appendOutput(`Build time: ${result.buildTime}ms\n`);
      appendOutput(`Firmware size: ${result.firmwareSize?.flash?.used || 0} bytes\n`);
      appendOutput(`Flash usage: ${result.firmwareSize?.flash?.percentage || 0}%\n`);
      appendOutput(`RAM usage: ${result.firmwareSize?.ram?.percentage || 0}%\n`);

      if (result.warnings && result.warnings.length > 0) {
        appendOutput(`\nWarnings: ${result.warnings.length}\n`);
      }

    } catch (error) {
      appendOutput(`\n✗ Compilation failed!\n`);
      
      const errorData = error.response?.data;
      if (errorData?.error) {
        appendOutput(`Error: ${errorData.error}\n`);
      }
      if (errorData?.details) {
        appendOutput(`\nDetails:\n${errorData.details}\n`);
      }
    } finally {
      setIsCompiling(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedBoard) {
      alert('Please select a board');
      return;
    }

    if (!selectedPort) {
      alert('Please select a port');
      return;
    }

    setIsUploading(true);
    clearOutput();
    appendOutput('Starting upload...\n');

    try {
      const response = await apiService.upload({
        code,
        boardId: selectedBoard,
        port: selectedPort,
        options: {
          optimization: 'Os',
          verify: true
        }
      });

      setCompilationId(response.data.uploadId);

      appendOutput(`\n✓ Compilation successful!\n`);
      appendOutput(`Build time: ${response.data.result.compilation.buildTime}ms\n`);
      appendOutput(`\n✓ Upload successful!\n`);
      appendOutput(`Upload time: ${response.data.result.upload.duration}ms\n`);
      appendOutput(`Bytes written: ${response.data.result.upload.bytesWritten}\n`);
      appendOutput(`Verified: ${response.data.result.upload.verified ? 'Yes' : 'No'}\n`);
      appendOutput(`\nBoard is now running your code!\n`);

    } catch (error) {
      appendOutput(`\n✗ Upload failed!\n`);
      
      const errorData = error.response?.data;
      if (errorData?.error) {
        appendOutput(`Error: ${errorData.error}\n`);
      }
      if (errorData?.stage) {
        appendOutput(`Failed at stage: ${errorData.stage}\n`);
      }
      if (errorData?.details) {
        appendOutput(`\nDetails:\n${errorData.details}\n`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSerialMonitor = () => {
    setShowSerialMonitor(true);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Arduino IDE Online</h1>
      </header>

      <Toolbar
        selectedBoard={selectedBoard}
        onBoardSelect={setSelectedBoard}
        selectedPort={selectedPort}
        onPortSelect={setSelectedPort}
        onVerify={handleVerify}
        onUpload={handleUpload}
        onSerialMonitor={handleSerialMonitor}
        isCompiling={isCompiling}
        isUploading={isUploading}
      />

      <div className="app-content">
        <div className="editor-panel">
          <Editor
            code={code}
            onChange={setCode}
            readOnly={isCompiling || isUploading}
          />
        </div>

        <div className="terminal-panel">
          <Terminal
            output={output}
            onClear={clearOutput}
          />
        </div>
      </div>

      {showSerialMonitor && selectedPort && (
        <SerialMonitor
          port={selectedPort}
          onClose={() => setShowSerialMonitor(false)}
        />
      )}
    </div>
  );
}

export default App;