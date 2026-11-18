<<<<<<< HEAD
import '@testing-library/jest-dom';

// Polyfill ResizeObserver for Recharts in jsdom tests
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
=======
import '@testing-library/jest-dom';

// Polyfill ResizeObserver for Recharts in jsdom tests
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
>>>>>>> 14f90995ced414a546f88517b9802fe68493c8b9
