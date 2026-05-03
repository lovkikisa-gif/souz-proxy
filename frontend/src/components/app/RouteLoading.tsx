import { Button } from "../ui/Button";

interface RouteLoadingProps {
  title?: string;
  message?: string;
  fullscreen?: boolean;
  onRetry?: () => unknown | Promise<unknown>;
}

export function RouteLoading({
  title = "Loading your workspace",
  message = "We're checking your account setup and preparing the right next step.",
  fullscreen = true,
  onRetry,
}: RouteLoadingProps) {
  const content = (
    <div
      data-testid="route-loading"
      className="glass-card animate-fade-in"
      style={{
        width: "min(480px, calc(100vw - 32px))",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div
          className="skeleton"
          style={{ width: 56, height: 56, borderRadius: "50%" }}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            className="skeleton"
            style={{ width: "50%", height: 14, borderRadius: 999 }}
          />
          <div
            className="skeleton"
            style={{ width: "85%", height: 10, borderRadius: 999 }}
          />
          <div
            className="skeleton"
            style={{ width: "72%", height: 10, borderRadius: 999 }}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>{title}</h2>
        <p
          style={{
            fontSize: "0.875rem",
            lineHeight: 1.6,
            color: "var(--color-text-secondary)",
          }}
        >
          {message}
        </p>
      </div>

      {onRetry ? (
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <Button variant="secondary" onClick={() => void onRetry()}>
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );

  if (!fullscreen) {
    return content;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top left, rgba(139,92,246,0.12), transparent 32%), var(--color-bg-primary)",
        padding: 16,
      }}
    >
      {content}
    </div>
  );
}
