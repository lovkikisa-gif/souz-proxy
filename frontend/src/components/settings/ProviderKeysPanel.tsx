import { useState, useEffect } from "react";
import type { UserManagedProvider } from "../../types/onboarding";
import type { ProviderKey } from "../../types/settings";
import { getProviderKeys, setProviderKey, deleteProviderKey } from "../../api/providerKeys";
import { useAuth } from "../../auth/useAuth";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { showToast } from "../ui/Toast";
import { formStackStyle, helperTextStyle, sectionTitleStyle } from "./styles";

export function ProviderKeysPanel() {
  const { onboarding, refreshOnboarding } = useAuth();
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setKeys(await getProviderKeys()); }
    catch { showToast("Failed to load provider keys"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const providers = mergeProviderRows(
    onboarding?.availableUserManagedProviders ?? [],
    keys
  );

  if (loading) return <div className="skeleton" style={{ height: 80, width: "100%" }} />;

  return (
    <div style={formStackStyle}>
      <h3 style={sectionTitleStyle}>Provider Keys</h3>
      <p style={helperTextStyle}>
        Keys are stored securely and encrypted on the server. Full keys are never displayed.
      </p>
      {providers.length === 0 && <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>No provider keys configured.</p>}
      {providers.map((k) => (
        <ProviderKeyRow
          key={k.provider}
          providerKey={k}
          onUpdate={load}
          onOnboardingUpdate={refreshOnboarding}
        />
      ))}
    </div>
  );
}

function mergeProviderRows(
  providers: UserManagedProvider[],
  keys: ProviderKey[]
): ProviderKey[] {
  const rows = new Map<string, ProviderKey>();

  providers.forEach((provider) => {
    rows.set(provider.provider, {
      provider: provider.provider,
      configured: provider.configured,
      keyHint: null,
      updatedAt: null,
    });
  });

  keys.forEach((key) => {
    rows.set(key.provider, key);
  });

  return [...rows.values()].sort((left, right) =>
    left.provider.localeCompare(right.provider)
  );
}

function ProviderKeyRow({
  providerKey,
  onUpdate,
  onOnboardingUpdate,
}: {
  providerKey: ProviderKey;
  onUpdate: () => void;
  onOnboardingUpdate: () => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await setProviderKey(providerKey.provider, value.trim());
      setValue("");
      setEditing(false);
      await onOnboardingUpdate();
      showToast("Key saved", "success");
      onUpdate();
    } catch { showToast("Failed to save key"); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await deleteProviderKey(providerKey.provider);
      await onOnboardingUpdate();
      showToast("Key removed", "success");
      onUpdate();
    } catch { showToast("Failed to remove key"); }
    finally { setSaving(false); }
  };

  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editing ? 12 : 0 }}>
        <div>
          <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{providerKey.provider}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 2 }}>
            {providerKey.configured ? `Configured • ${providerKey.keyHint ?? ""}` : "Not configured"}
            {providerKey.updatedAt && ` • ${new Date(providerKey.updatedAt).toLocaleDateString()}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Button size="sm" variant="secondary" onClick={() => setEditing(!editing)}>
            {providerKey.configured ? "Replace" : "Add"}
          </Button>
          {providerKey.configured && <Button size="sm" variant="danger" onClick={remove} loading={saving && !editing}>Delete</Button>}
        </div>
      </div>
      {editing && (
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Paste API key" type="password" /></div>
          <Button size="sm" onClick={save} loading={saving} disabled={!value.trim()}>Save</Button>
        </div>
      )}
    </div>
  );
}
