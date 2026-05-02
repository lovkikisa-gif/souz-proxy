import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, var(--color-bg-primary) 0%, #0f172a 50%, #1a1033 100%)",
      padding: 16,
    }}>
      {/* Decorative gradient orbs */}
      <div style={{ position: "fixed", top: "-20%", left: "-10%", width: "40vw", height: "40vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-20%", right: "-10%", width: "50vw", height: "50vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div className="glass-card animate-fade-in" style={{ width: "min(420px, 100%)", padding: "36px 32px", position: "relative", zIndex: 1 }}>
        <Outlet />
      </div>
    </div>
  );
}
