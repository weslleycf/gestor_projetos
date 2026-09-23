import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ProvedorAvisos } from "@/components/ui";
import { inicializarUi } from "@/store/ui";
import "./index.css";

inicializarUi();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

// PWA (Fase 5): o service worker só é registrado na build de produção, para não
// interferir no recarregamento rápido durante o desenvolvimento.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ProvedorAvisos>
          <App />
        </ProvedorAvisos>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
