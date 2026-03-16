interface Props {
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}

export function FeatureToggle({ label, description, active, onToggle }: Readonly<Props>) {
  return (
    <div class="feature-toggle">
      <div class="feature-toggle__info">
        <span class="feature-toggle__label">{label}</span>
        <span class="feature-toggle__desc">{description}</span>
      </div>
      <button
        class={`toggle-btn ${active ? 'toggle-btn--active' : ''}`}
        onClick={onToggle}
        aria-pressed={active}
      >
        {active ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}
