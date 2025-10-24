import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Usb, RefreshCw } from 'lucide-react';

const PortSelector = ({ selectedPort, onSelect, disabled }) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDevices();
    
    // Auto-refresh every 3 seconds
    const interval = setInterval(loadDevices, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const loadDevices = async () => {
    try {
      const response = await apiService.listDevices();
      setDevices(response.data.devices);
      
      // Auto-select if only one device
      if (!selectedPort && response.data.devices.length === 1) {
        onSelect(response.data.devices[0].port);
      }
      
      // Clear selection if selected port is no longer available
      if (selectedPort && !response.data.devices.find(d => d.port === selectedPort)) {
        onSelect('');
      }
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await apiService.refreshDevices();
      await loadDevices();
    } catch (err) {
      console.error('Failed to refresh devices:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePortChange = (e) => {
    onSelect(e.target.value);
  };

  return (
    <div className="port-selector">
      <label htmlFor="port-select">
        <Usb size={16} />
        <span>Port:</span>
      </label>
      <select
        id="port-select"
        value={selectedPort || ''}
        onChange={handlePortChange}
        disabled={disabled || loading}
      >
        <option value="">Select a port...</option>
        {devices.map(device => (
          <option key={device.port} value={device.port}>
            {device.port} - {device.boardName}
          </option>
        ))}
      </select>
      <button
        className="refresh-btn"
        onClick={handleRefresh}
        disabled={refreshing || disabled}
        title="Refresh devices"
      >
        <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
      </button>
      {devices.length === 0 && !loading && (
        <div className="port-info warning">
          No devices detected. Connect your board via USB.
        </div>
      )}
    </div>
  );
};

export default PortSelector;