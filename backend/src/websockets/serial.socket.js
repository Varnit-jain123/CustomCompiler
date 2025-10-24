const logger = require('../utils/logger.util');
const serialMonitor = require('../services/serial-monitor.service');

class SerialSocketHandler {
  constructor() {
    this.connections = new Map();
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    const connectionId = this.generateConnectionId();
    const url = new URL(req.url, `ws://${req.headers.host}`);
    const port = url.searchParams.get('port');

    if (!port) {
      ws.close(1008, 'Port parameter required');
      return;
    }

    logger.info(`Serial WebSocket connected: ${connectionId} for port ${port}`);

    this.connections.set(connectionId, { ws, port });

    // Setup serial data listener
    const listener = (data) => {
      this.send(ws, data);
    };

    serialMonitor.addListener(port, listener);

    ws.on('message', (message) => {
      this.handleMessage(connectionId, port, message);
    });

    ws.on('close', () => {
      logger.info(`Serial WebSocket disconnected: ${connectionId}`);
      serialMonitor.removeListener(port, listener);
      this.connections.delete(connectionId);
    });

    ws.on('error', (error) => {
      logger.error(`Serial WebSocket error: ${connectionId}`, error);
    });

    // Send connection confirmation
    this.send(ws, {
      type: 'connected',
      connectionId,
      port,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle incoming messages
   */
  handleMessage(connectionId, port, message) {
    try {
      const data = JSON.parse(message.toString());
      logger.debug(`Serial WebSocket message from ${connectionId}:`, data);

      switch (data.type) {
        case 'send':
          this.handleSend(port, data.data, data.lineEnding);
          break;
        case 'ping':
          this.handlePing(connectionId);
          break;
        default:
          logger.warn(`Unknown message type: ${data.type}`);
      }

    } catch (error) {
      logger.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle send data
   */
  async handleSend(port, data, lineEnding = '\n') {
    try {
      await serialMonitor.sendData(port, data, lineEnding);
    } catch (error) {
      logger.error('Failed to send serial data:', error);
    }
  }

  /**
   * Handle ping
   */
  handlePing(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.send(connection.ws, {
        type: 'pong',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Send message to WebSocket
   */
  send(ws, data) {
    if (ws.readyState === 1) { // OPEN
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Generate unique connection ID
   */
  generateConnectionId() {
    return `serial-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active connection count
   */
  getConnectionCount() {
    return this.connections.size;
  }
}

module.exports = new SerialSocketHandler();