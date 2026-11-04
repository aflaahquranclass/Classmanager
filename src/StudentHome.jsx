// Shared pieces of the student dashboards (Hifz and Thilawa): the big
// "do this next" button, the quick-access buttons and the small section
// labels, so both dashboards look and behave the same.

export const HOME_CSS = `
  .sh { display: flex; flex-direction: column; gap: 12px; }
  .sh-label { margin: 10px 2px 0; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6B819A; }

  .sh-next {
    display: flex; align-items: center; gap: 14px; width: 100%; padding: 18px 20px; border-radius: 16px; font: inherit; text-align: left;
    cursor: pointer; color: #FFFFFF; border: none;
  }
  .sh-next:focus-visible { outline: 3px solid #176FD1; outline-offset: 3px; }
  .sh-next-icon { flex-shrink: 0; width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.22); }
  .sh-next-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .sh-next-text small { font-size: 12px; opacity: 0.75; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
  .sh-next-text b { font-size: 18px; font-weight: 700; line-height: 1.3; letter-spacing: -0.01em; }
  .sh-next-go { flex-shrink: 0; background: #FFFFFF; color: #0D4F85; font-weight: 700; font-size: 14px; border-radius: 10px; padding: 10px 18px; }

  .sh-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  @media (min-width: 1100px) { .sh-tiles { grid-template-columns: repeat(6, 1fr); } }
  .sh-tile {
    position: relative; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 18px 6px 16px; border-radius: 16px;
    font: inherit; font-size: 13.5px; font-weight: 600; color: #1F3A5A; text-align: center; cursor: pointer;
  }
  .sh-tile:focus-visible { outline: 3px solid #176FD1; outline-offset: 2px; }
  /* One accent colour for every button; red is kept for "waiting" only. */
  .sh-ic { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: #EEF4FB; color: #176FD1; }
  .sh-dot {
    position: absolute; top: 8px; right: 10px; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; box-sizing: border-box;
    background: #E5484D; color: #FFFFFF; font-size: 11px; font-weight: 700; box-shadow: 0 0 0 2px #FFFFFF;
    display: flex; align-items: center; justify-content: center;
  }

  @media (max-width: 520px) {
    .sh-next { padding: 16px; gap: 12px; }
    .sh-next-icon { width: 44px; height: 44px; }
    .sh-next-text b { font-size: 16px; }
    .sh-next-go { padding: 9px 14px; font-size: 14px; }
    .sh-tiles { gap: 8px; }
    .sh-tile { font-size: 12.5px; padding: 14px 4px 12px; gap: 8px; }
    .sh-ic { width: 40px; height: 40px; }
    .sh-dot { right: 8px; }
  }
`;

// step: { Icon, kicker, title, go, onClick } — or null while loading.
export function NextStepButton({ step, loading = "Loading…" }) {
  if (!step) return <section className="sp-card hz-muted" style={{ padding: 18 }}>{loading}</section>;
  return (
    <button type="button" className="sh-next sp-grad" onClick={step.onClick}>
      <span className="sh-next-icon" aria-hidden="true"><step.Icon size={22} /></span>
      <span className="sh-next-text"><small>{step.kicker}</small><b>{step.title}</b></span>
      <span className="sh-next-go" aria-hidden="true">{step.go}</span>
    </button>
  );
}

// tiles: [{ key, label, Icon, dot?, onClick }]
export function QuickTiles({ tiles }) {
  return (
    <>
      <h2 className="sh-label">Quick access</h2>
      <nav className="sh-tiles" aria-label="Quick access">
        {tiles.map(({ key, label, Icon, dot = 0, onClick }) => (
          <button key={key} type="button" className="sh-tile sp-card" onClick={onClick}>
            {dot > 0 && <span className="sh-dot" aria-label={`${dot} waiting`}>{dot}</span>}
            <span className="sh-ic" aria-hidden="true"><Icon size={21} strokeWidth={1.9} /></span>
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
