import { useState } from "react";
import type { OptionRequest } from "../../types/chat";
import { answerOption } from "../../api/options";
import { Button } from "../ui/Button";

export function OptionCard({ option, onAnswered }: { option: OptionRequest; onAnswered: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [freeText, setFreeText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (option.selectionMode === "single") {
      next.clear();
      next.add(id);
    } else {
      next.has(id) ? next.delete(id) : next.add(id);
    }
    setSelected(next);
  };

  const submit = async () => {
    if (selected.size === 0 && !freeText.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await answerOption(option.optionId, { selectedOptionIds: [...selected], freeText: freeText.trim() || null });
      onAnswered();
    } catch { setError("Failed to submit"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="glass-card animate-fade-in" style={{ margin: "12px 0", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: "0.875rem" }}>💡</span>
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-accent)" }}>Souz needs your input</span>
      </div>
      <div style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: 4 }}>{option.title}</div>
      {option.content && <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", marginBottom: 12 }}>{option.content}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {option.options.map((o) => (
          <button key={o.id} onClick={() => toggle(o.id)} style={{
            padding: "8px 12px", textAlign: "left", borderRadius: "var(--radius-sm)", cursor: "pointer",
            background: selected.has(o.id) ? "rgba(139,92,246,0.15)" : "var(--color-bg-primary)",
            border: `1px solid ${selected.has(o.id) ? "var(--color-border-active)" : "var(--color-border)"}`,
            color: "var(--color-text-primary)", fontSize: "0.8125rem", fontFamily: "var(--font-sans)", transition: "all 0.15s ease",
          }}>
            <div style={{ fontWeight: 500 }}>{o.label}</div>
            {o.description && <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 2 }}>{o.description}</div>}
          </button>
        ))}
      </div>
      {option.allowFreeText && (
        <textarea value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="Additional input…" rows={2}
          style={{ width: "100%", padding: "8px 12px", fontSize: "0.8125rem", fontFamily: "var(--font-sans)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", outline: "none", resize: "vertical", marginBottom: 12 }}
        />
      )}
      {error && <div style={{ fontSize: "0.75rem", color: "var(--color-error)", marginBottom: 8 }}>{error}</div>}
      <Button onClick={submit} loading={submitting} size="sm" disabled={selected.size === 0 && !freeText.trim()}>Submit</Button>
    </div>
  );
}
