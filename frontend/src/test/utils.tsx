import { render } from "@testing-library/react";

export async function renderApp(path = "/app/") {
  window.history.replaceState({}, "", path);
  const { App } = await import("../app/App");
  return render(<App />);
}

export function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}
