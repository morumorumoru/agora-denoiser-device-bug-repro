/// <reference types="react" />
/// <reference types="react-dom" />

declare module "react" {
  export function useState<T>(
    initialState: T | (() => T)
  ): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(
    effect: () => void | (() => void),
    deps?: any[]
  ): void;
  export function useRef<T>(initialValue: T): { current: T };
  export const StrictMode: any;
}

declare module "react-dom/client" {
  export function createRoot(container: Element | DocumentFragment): {
    render(element: any): void;
  };
}
