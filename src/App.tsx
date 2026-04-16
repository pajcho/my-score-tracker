import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ui/themeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/routes";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { localStoragePersister, queryClient } from "@/lib/queryClient";

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister: localStoragePersister,
      maxAge: 10 * 60 * 1000,
    }}
  >
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="score-tracker-theme"
      disableTransitionOnChange
    >
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </PersistQueryClientProvider>
);

export default App;
