import { useEffect, useState } from "react";

export default function MinimalMobileApp() {
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const info: string[] = [];
      info.push(`Window: ${typeof window}`);
      info.push(`UserAgent: ${navigator?.userAgent || "N/A"}`);
      info.push(`Location: ${window?.location?.href || "N/A"}`);
      info.push(`Tauri: ${(window as any).__TAURI__ ? "Available" : "Not Available"}`);
      info.push(`Timestamp: ${new Date().toISOString()}`);
      setDebugInfo(info);
      setMounted(true);
    } catch (error) {
      console.error("Error in MinimalMobileApp useEffect:", error);
    }
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          padding: "20px",
          fontFamily: "sans-serif",
          textAlign: "center",
        }}
      >
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "sans-serif",
        maxWidth: "400px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ marginBottom: "20px" }}>Salesforce Dashboard</h1>

      <div
        style={{
          backgroundColor: "#f5f5f5",
          padding: "16px",
          marginBottom: "16px",
          borderRadius: "8px",
        }}
      >
        <h2>Welcome to Mobile</h2>
        <p>This is a minimal mobile version of the Salesforce Dashboard.</p>
      </div>

      <div
        style={{
          backgroundColor: "#f5f5f5",
          padding: "16px",
          marginBottom: "16px",
          borderRadius: "8px",
        }}
      >
        <h3>Quick Stats</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0066cc" }}>127</div>
            <div style={{ fontSize: "12px", color: "#666" }}>Accounts</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0066cc" }}>43</div>
            <div style={{ fontSize: "12px", color: "#666" }}>Opportunities</div>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#f5f5f5",
          padding: "16px",
          borderRadius: "8px",
        }}
      >
        <h3>Debug Info</h3>
        <div style={{ fontSize: "12px" }}>
          {debugInfo.map((info, index) => (
            <div
              key={index}
              style={{
                marginBottom: "4px",
                color: "#666",
                wordBreak: "break-all",
              }}
            >
              {info}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
