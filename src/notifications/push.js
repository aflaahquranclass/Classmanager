// Phone notifications (Web Push). A teacher or student turns them on from the
// bell; the device is saved in push_subscriptions and the Worker (/api/push)
// pushes each in-app notification the admin sends to it.
//
// iPhone/iPad only allow this once the portal is added to the Home Screen
// (iOS 16.4+), so there we point to the install guide instead.

import { supabase } from "../supabaseClient.js";

// Public half of the VAPID key pair (the private half is a Worker secret).
const VAPID_PUBLIC_KEY = "BCoYQ_A_boa81YQbEYA4-pUbCqgnbDdzOY_ssrT4N83WYW0RUNECvfjD2sowEvlwSQadCwbEE3Fn8nMFI0I4rCM";

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isInstalled = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

const keyBytes = (b64u) => Uint8Array.from(atob(b64u.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

// "on" | "off" | "blocked" | "install" (iPhone: add to Home Screen first) | "unsupported"
export async function pushState() {
  if (isIos() && !isInstalled()) return "install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

async function saveSubscription(sub) {
  const { endpoint, keys } = sub.toJSON();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth, p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
}

// Asks the phone for permission and saves this device. Returns the new state.
export async function enablePush() {
  if ((await Notification.requestPermission()) !== "granted") return pushState();
  const reg = await navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready);
  const sub = (await reg.pushManager.getSubscription())
    || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
  await saveSubscription(sub);
  return "on";
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
  return "off";
}

// Keeps the saved device in step with this login (e.g. after signing in as
// someone else on the same phone). Quietly does nothing when push is off.
export async function refreshPush() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager?.getSubscription();
    if (sub && Notification.permission === "granted") await saveSubscription(sub);
  } catch { /* offline, or no login yet */ }
}

export function clearAppBadge() {
  navigator.clearAppBadge?.().catch(() => {});
}

// Called after an in-app notification is saved: pushes it to recipients'
// phones. Returns a toast line ("" when nobody had phone notifications on).
export async function sendPush(notificationId) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
      body: JSON.stringify({ action: "send", notification_id: notificationId }),
    });
    if (!res.ok || !(res.headers.get("Content-Type") || "").includes("json")) return "";
    const data = await res.json();
    return data.sent ? `${data.sent} phone notification${data.sent === 1 ? "" : "s"} sent.` : "";
  } catch {
    return "";
  }
}

// Where the install guide lives (the public website), for this address.
export const INSTALL_GUIDE_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "/install"
  : "https://aflaahqc.com/install";
