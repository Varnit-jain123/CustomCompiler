import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Trash2 } from 'lucide-react';
import { apiService } from '../services/api';
import websocketService from '../services/websocket';

const SerialMonitor = ({ port, onClose }) => {
  const [output, setOutput] = useState('');
  const [input, setInput] = useState('');
  const [baudRate, setBaudRate] = useState(9600);
  const [lineEnding, setLineEnding] = useState('\n');
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    connectSerial();
    return () => {
      disconnectSerial();
    };
  }, [port, baudRate]);

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  const connectSerial = async () => {
    try {
      // Connect to serial port
      await apiService.connectSerial({ port, baudRate });
      setConnected(true);
      appendOutput(`Connected to ${port} at ${baudRate} baud\n`);

      // Connect WebSocket
      const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:5000'}/ws/serial?port=${encodeURIComponent(port)}`;
      await websocketService.connect(wsUrl);

      websocketService.on('data', handleSerialData);
      websocketService.on('error', handleSerialError);
      websocketService.on('disconnect', handleSerialDisconnect);

      wsRef.current = websocketService;

    } catch (error) {
      console.error('Failed to connect to serial:', error);
      appendOutput(`Error: Failed to connect to ${port}\n`);
    }
  };

  const disconnectSerial = async () => {
    try {
      if (wsRef.current) {
        wsRef.current.off('data', handleSerialData);
        wsRef.current.off('error', handleSerialError);
        wsRef.current.off('disconnect', handleSerialDisconnect);
        wsRef.current.disconnect();
      }

      await apiService.disconnectSerial({ port });
      setConnected(false);
    } catch (error) {
      console.error('Failed to disconnect from serial:', error);
    }
  };

  const handleSerialData = (data) => {
    if (data.type === 'data') {
      appendOutput(data.data + '\n');
    }
  };

  const handleSerialError = (data) => {
    appendOutput(`\nError: ${data.message}\n`);
  };

  const handleSerialDisconnect = () => {
    setConnected(false);
    appendOutput('\nDisconnected from serial port\n');
  };

  const appendOutput = (text) => {
    setOutput(prev => prev + text);
  };

  const handleSend = () => {
    if (input.trim() && connected) {
      wsRef.current.send({
        type: 'send',
        data: input,
        lineEnding
      });
      appendOutput(`> ${input}\n`);
      setInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setOutput('');
  };

  return (
    <div className="serial-monitor-overlay">
      <div className="serial-monitor">
        <div className="serial-monitor-header">
          <h3>Serial Monitor - {port}</h3>
          <div className="serial-monitor-controls">
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(Number(e.target.value))}
              disabled={connected}
            >
              <option value={300}>300</option>
              <option value={1200}>1200</option>
              <option value={2400}>2400</option>
              <option value={4800}>4800</option>
              <option value={9600}>9600</option>
              <option value={19200}>19200</option>
              <option value={38400}>38400</option>
              <option value={57600}>57600</option>
              <option value={115200}>115200</option>
            </select>
            <select
              value={lineEnding}
              onChange={(e) => setLineEnding(e.target.value)}
            >
              <option value="">No line ending</option>
              <option value="\n">Newline</option>
              <option value="\r">Carriage return</option>
              <option value="\r\n">Both NL & CR</option>
            </select>
            <label>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              Auto-scroll
            </label>
            <button onClick={handleClear} title="Clear output">
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="serial-monitor-output" ref={terminalRef}>
          <pre>{output || 'Waiting for data...'}</pre>
        </div>

        <div className="serial-monitor-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type message and press Enter..."
            disabled={!connected}
          />
          <button
            onClick={handleSend}
            disabled={!connected || !input.trim()}
            title="Send"
          >
            <Send size={16} />
          </button>
        </div>

        <div className="serial-monitor-status">
          <span className={connected ? 'connected' : 'disconnected'}>
            {connected ? '● Connected' : '○ Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SerialMonitor;