/// <reference types="vite/client" />

interface HermesPluginSDK {
  React: typeof import("react");
  ReactDOM: typeof import("react-dom");
  components: Record<string, React.ComponentType<any>>;
  hooks: Record<string, any>;
  utils: Record<string, any>;
  useI18n: () => (key: string) => string;
  fetchJSON: <T = any>(url: string, init?: RequestInit) => Promise<T>;
  api: {
    getStatus: () => Promise<{ version: string; [key: string]: any }>;
    getSessions: (limit?: number) => Promise<{ sessions: any[] }>;
  };
}

interface HermesPlugins {
  register: (name: string, component: React.ComponentType<any>) => void;
  registerSlot: (
    plugin: string,
    slot: string,
    component: React.ComponentType<any>
  ) => void;
}

declare global {
  interface Window {
    __HERMES_PLUGIN_SDK__: HermesPluginSDK;
    __HERMES_PLUGINS__: HermesPlugins;
  }
}

export {};
