import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ThemeProvider from "@/components/layout/ThemeToggle/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { fontVariables } from "@/lib/font";
import { safeLocalStorage } from "@/lib/platform";
import { cn } from "@/lib/utils";

// Simple mobile dashboard component
function MobileDashboard() {
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  useEffect(() => {
    const info: string[] = [];
    info.push(`Window: ${typeof window}`);
    info.push(`UserAgent: ${navigator?.userAgent || "N/A"}`);
    info.push(`Location: ${window?.location?.href || "N/A"}`);
    info.push(`Tauri: ${(window as any).__TAURI__ ? "Available" : "Not Available"}`);
    info.push(`Timestamp: ${new Date().toISOString()}`);
    setDebugInfo(info);
  }, []);

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Salesforce Dashboard</h1>
      <div className="space-y-4">
        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-lg font-semibold">Welcome to Mobile</h2>
          <p className="text-muted-foreground">This is a simplified mobile version of the Salesforce Dashboard.</p>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Quick Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">127</div>
              <div className="text-sm text-muted-foreground">Accounts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">43</div>
              <div className="text-sm text-muted-foreground">Opportunities</div>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Debug Info</h3>
          <div className="text-xs space-y-1">
            {debugInfo.map((info, index) => (
              <div key={index} className="text-muted-foreground break-all">
                {info}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MobileApp() {
  const [mounted, setMounted] = useState(false);
  const activeThemeValue = safeLocalStorage.getItem("active_theme") || "";
  const isScaled = activeThemeValue?.endsWith("-scaled");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading mobile app...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div
        className={cn(
          "bg-background min-h-screen font-sans antialiased",
          activeThemeValue ? `theme-${activeThemeValue}` : "",
          isScaled ? "theme-scaled" : "",
          fontVariables
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange enableColorScheme>
          <Toaster />
          <Routes>
            <Route path="*" element={<MobileDashboard />} />
          </Routes>
        </ThemeProvider>
      </div>
    </BrowserRouter>
  );
}
