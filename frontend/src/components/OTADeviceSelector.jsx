import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Wifi, RefreshCw } from 'lucide-react';

const OTADeviceSelector = ({ selectedDevice, onSelect, disabled }) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDevices();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadDevices, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const loadDevices = async () => {
    try {
      const response = await apiService.getOTADevices();
      setDevices(response.data.devices);
      
      // Auto-select if only one device
      if (!selectedDevice && response.data.devices.length === 1) {
        onSelect(response.data.devices[0].id);
      }
    } catch (err) {
      console.error('Failed to load OTA devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await apiService.refreshOTADevices();
      await loadDevices();
    } catch (err) {
      console.error('Failed to refresh OTA devices:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeviceChange = (e) => {
    onSelect(e.target.value);
  };

  return (
    <div className="ota-device-selector">
      <label htmlFor="ota-device-select">
        <Wifi size={16} />
        <span>OTA Device:</span>
      </label>
      <select
        id="ota-device-select"
        value={selectedDevice || ''}
        onChange={handleDeviceChange}
        disabled={disabled || loading}
      >
        <option value="">Select OTA device...</option>
        {devices.map(device => (
          <option key={device.id} value={device.id}>
            {device.name} ({device.ip}) - {device.board}
          </option>
        ))}
      </select>
      <button
        className="refresh-btn"
        onClick={handleRefresh}
        disabled={refreshing || disabled}
        title="Refresh OTA devices"
      >
        <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
      </button>
      {devices.length === 0 && !loading && (
        <div className="ota-info warning">
          No OTA devices found. Make sure your ESP32 has OTA enabled and is on the same network.
        </div>
      )}
    </div>
  );
};

export default OTADeviceSelector;