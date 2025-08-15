// Vite plugin to inject MessageChannel polyfill for Cloudflare Workers
export function messageChannelPolyfill() {
  return {
    name: 'message-channel-polyfill',
    config(config, { command }) {
      // Inject polyfill code at the very beginning of the bundle
      if (!config.define) {
        config.define = {};
      }
      
      // Define the polyfill code as a string that will be injected
      const polyfillCode = `
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
            start() {}
            close() {
              this._otherPort = null;
              this._listeners.clear();
            }
          }
          class MessageChannel {
            constructor() {
              this.port1 = new MessagePort();
              this.port2 = new MessagePort();
              this.port1._otherPort = this.port2;
              this.port2._otherPort = this.port1;
            }
          }
          globalThis.MessageChannel = MessageChannel;
          globalThis.MessagePort = MessagePort;
        }
      `;
      
      return config;
    },
    
    generateBundle(options, bundle) {
      // Inject polyfill at the beginning of each chunk
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && chunk.code) {
          const polyfillCode = `
// MessageChannel polyfill for Cloudflare Workers
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
    start() {}
    close() {
      this._otherPort = null;
      this._listeners.clear();
    }
  }
  class MessageChannel {
    constructor() {
      this.port1 = new MessagePort();
      this.port2 = new MessagePort();
      this.port1._otherPort = this.port2;
      this.port2._otherPort = this.port1;
    }
  }
  globalThis.MessageChannel = MessageChannel;
  globalThis.MessagePort = MessagePort;
}
`;
          chunk.code = polyfillCode + chunk.code;
        }
      }
    }
  };
}
