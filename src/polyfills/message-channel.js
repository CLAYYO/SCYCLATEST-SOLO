// MessageChannel polyfill for Cloudflare Workers
// This polyfill provides MessageChannel and MessagePort APIs that are missing in Cloudflare Workers runtime

if (typeof MessageChannel === 'undefined') {
  class MessagePort {
    constructor() {
      this.onmessage = null;
      this.onmessageerror = null;
      this._listeners = new Map();
      this._otherPort = null;
    }

    postMessage(data) {
      if (this._otherPort) {
        // Simulate async message delivery
        setTimeout(() => {
          if (this._otherPort.onmessage) {
            this._otherPort.onmessage({ data, type: 'message' });
          }
          
          const listeners = this._otherPort._listeners.get('message');
          if (listeners) {
            listeners.forEach(listener => {
              listener({ data, type: 'message' });
            });
          }
        }, 0);
      }
    }

    addEventListener(type, listener) {
      if (!this._listeners.has(type)) {
        this._listeners.set(type, new Set());
      }
      this._listeners.get(type).add(listener);
    }

    removeEventListener(type, listener) {
      const listeners = this._listeners.get(type);
      if (listeners) {
        listeners.delete(listener);
      }
    }

    start() {
      // MessagePort.start() is a no-op in this polyfill
    }

    close() {
      this._otherPort = null;
      this._listeners.clear();
    }
  }

  class MessageChannel {
    constructor() {
      this.port1 = new MessagePort();
      this.port2 = new MessagePort();
      
      // Connect the ports
      this.port1._otherPort = this.port2;
      this.port2._otherPort = this.port1;
    }
  }

  // Make MessageChannel and MessagePort available globally
  globalThis.MessageChannel = MessageChannel;
  globalThis.MessagePort = MessagePort;
}