import '@testing-library/jest-dom/vitest';

// Mantine potrzebuje tych API przeglądarki, których nie ma w jsdom.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

// jsdom nie ma przewijania do elementu; Mantine woła je przy wyborze opcji z listy (Select).
Element.prototype.scrollIntoView = () => {};

// Pole tekstowe, które rośnie przy pisaniu (Textarea autosize), nasłuchuje wczytania czcionek; jsdom nie ma document.fonts.
if (!('fonts' in document)) {
  Object.defineProperty(document, 'fonts', { value: { addEventListener: () => {}, removeEventListener: () => {}, ready: Promise.resolve() } });
}
