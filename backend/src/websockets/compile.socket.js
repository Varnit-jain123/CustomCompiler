const logger = require('../utils/logger.util');

class CompileSocketHandler {
  constructor() {
    this.connections = new Map();
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    const connectionId = this.generateConnectionId();
    
    logger.info(`Compile WebSocket connected: ${connectionId}`);

    this.connections.set(connectionId, ws);

    ws.on('message', (message) => {
      this.handleMessage(connectionId, message);
    });

    ws.on('close', () => {
      logger.info(`Compile WebSocket disconnected: ${connectionId}`);
      this.connections.delete(connectionId);
    });

    ws.on('error', (error) => {
      logger.error(`Compile WebSocket error: ${connectionId}`, error);
    });

    // Send connection confirmation
    this.send(ws, {
      type: 'connected',
      connectionId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle incoming messages
   */
  handleMessage(connectionId, message) {
    try {
      const data = JSON.parse(message.toString());
      logger.debug(`Compile WebSocket message from ${connectionId}:`, data);

      // Handle different message types
      switch (data.type) {
        case 'ping':
          this.handlePing(connectionId);
          break;
        case 'subscribe':
          this.handleSubscribe(connectionId, data.compilationId);
          break;
        default:
          logger.warn(`Unknown message type: ${data.type}`);
      }

    } catch (error) {
      logger.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle ping
   */
  handlePing(connectionId) {
    const ws = this.connections.get(connectionId);
    if (ws) {
      this.send(ws, { type: 'pong', timestamp: new Date().toISOString() });
    }
  }

  /**
   * Handle subscription
   */
  handleSubscribe(connectionId, compilationId) {
    const ws = this.connections.get(connectionId);
    if (ws) {
      ws.compilationId = compilationId;
      this.send(ws, {
        type: 'subscribed',
        compilationId,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Broadcast progress to all connected clients
   */
  broadcastProgress(compilationId, progressData) {
    for (const [connectionId, ws] of this.connections.entries()) {
      if (ws.compilationId === compilationId || !ws.compilationId) {
        this.send(ws, {
          type: 'progress',
          compilationId,
          ...progressData,
          timestamp: new Date().toISOString()
        });
      }
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
    return `compile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active connection count
   */
  getConnectionCount() {
    return this.connections.size;
  }
}

module.exports = new CompileSocketHandler();