import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import React from "react";
import { createRoot } from "react-dom/client";
import { queryClient } from "./lib/query";
import { router } from "./router";
import { initializeSettings } from "./lib/settings";
import { PwaProvider } from "./components/PwaProvider";
import "./styles.css";

initializeSettings();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <PwaProvider>
        <RouterProvider router={router} />
      </PwaProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
