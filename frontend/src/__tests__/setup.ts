import '@testing-library/jest-dom';

// Polyfill ResizeObserver for Recharts in jsdom tests
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
