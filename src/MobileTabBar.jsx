import { Menu } from "lucide-react";
import { NotificationBell } from "./notifications/NotificationBell.jsx";

// Phone bottom bar for the teacher and student portals (in place of the blue
// top bar): a few main pages, Alerts (the notification inbox) and More (the
// full menu). Shown only on phones and small tablets; on wider screens the
// side menu is always there instead.
//
//   tabs: [{ key, label, Icon, active, dot?, onClick }]
export const MOBILE_TAB_CSS = `
  .mtb { display: none; }
  @media (max-width: 900px) {
    .tp-has-tabs .tp-mobile-bar { display: none !important; }
    .tp-has-tabs .tp-content { padding-top: env(safe-area-inset-top); padding-bottom: calc(68px + env(safe-area-inset-bottom)); }
    .mtb {
      display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 50;
      padding: 6px 4px calc(6px + env(safe-area-inset-bottom)); background: #FFFFFF;
      border-top: 1px solid #E3ECF5; box-shadow: 0 -4px 18px rgba(16,40,70,0.06);
    }
  }
  .mtb-tab {
    flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
    min-height: 52px; padding: 4px 2px; border: none; background: transparent; border-radius: 12px; cursor: pointer;
    font: inherit; font-size: 11px; font-weight: 600; color: #6B819A; -webkit-tap-highlight-color: transparent;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .mtb-tab:focus-visible { outline: 2px solid #176FD1; outline-offset: -2px; }
  .mtb-tab.mtb-on { color: #176FD1; }
  .mtb-ic { position: relative; display: flex; align-items: center; justify-content: center; width: 52px; height: 28px; border-radius: 999px; transition: background 0.15s; }
  .mtb-on .mtb-ic { background: #EAF2FC; }
  .mtb-ic .nb-count, .mtb-dot { position: absolute; top: -3px; right: 6px; }
  .mtb-dot { min-width: 17px; height: 17px; padding: 0 5px; box-sizing: border-box; border-radius: 999px; background: #E5484D; color: #FFFFFF; font-size: 10px; font-weight: 700; line-height: 17px; text-align: center; box-shadow: 0 0 0 2px #FFFFFF; }
`;

export default function MobileTabBar({ tabs, onMore, moreActive = false, showAlerts = true }) {
  return (
    <nav className="mtb no-print" aria-label="Main">
      <style>{MOBILE_TAB_CSS}</style>
      {tabs.map(({ key, label, Icon, active, dot = 0, onClick }) => (
        <button key={key} type="button" className={`mtb-tab ${active ? "mtb-on" : ""}`} aria-current={active ? "page" : undefined} onClick={onClick}>
          <span className="mtb-ic"><Icon size={22} strokeWidth={active ? 2.2 : 1.9} aria-hidden="true" />{dot > 0 && <span className="mtb-dot" aria-label={`${dot} waiting`}>{dot > 9 ? "9+" : dot}</span>}</span>
          {label}
        </button>
      ))}
      {showAlerts && <NotificationBell tab />}
      <button type="button" className={`mtb-tab ${moreActive ? "mtb-on" : ""}`} onClick={onMore} aria-label="More: open the full menu">
        <span className="mtb-ic"><Menu size={22} strokeWidth={moreActive ? 2.2 : 1.9} aria-hidden="true" /></span>
        More
      </button>
    </nav>
  );
}
