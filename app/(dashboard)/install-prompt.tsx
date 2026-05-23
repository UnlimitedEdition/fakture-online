"use client";

import { useEffect, useState } from "react";

// Chrome/Edge/Android fire `beforeinstallprompt` with this event shape; the type
// isn't in lib.dom yet (still a working-draft).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// iOS Safari exposes `standalone` on the navigator (non-standard).
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

const DISMISS_KEY = "fo_install_dismissed";
const DISMISS_TTL_DAYS = 30;

function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Date.parse(raw);
    if (Number.isNaN(ts)) return false;
    const ageDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return ageDays < DISMISS_TTL_DAYS;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as NavigatorWithStandalone;
  if (nav.standalone === true) return true;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  return false;
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as NavigatorWithStandalone & {
    MSStream?: unknown;
  };
  const ua = nav.userAgent || "";
  // MSStream check excludes old IE-on-Windows-Phone false positives.
  const win = window as unknown as { MSStream?: unknown };
  return /iPad|iPhone|iPod/.test(ua) && !win.MSStream;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (isDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS Safari does not fire beforeinstallprompt — show a hint instead.
    if (isIos()) {
      setShowIosHint(true);
      setVisible(true);
    }

    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    } catch {
      /* localStorage unavailable — ignore */
    }
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
      } else {
        // User dismissed the native prompt — respect that for the TTL.
        dismiss();
      }
    } catch {
      /* prompt failed — ignore */
    } finally {
      setDeferredPrompt(null);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Instaliraj aplikaciju"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white shadow-[0_-4px_16px_rgba(15,23,42,0.12)] border-t border-gray-100 px-4 py-3 flex items-center gap-3"
    >
      <div className="flex-1 text-sm text-slate-700 leading-snug">
        {showIosHint ? (
          <>
            <p className="font-medium text-slate-800">
              Instaliraj FaktureOnline na početni ekran
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Za instalaciju: Share ikona → Add to Home Screen
            </p>
          </>
        ) : (
          <p className="font-medium text-slate-800">
            Instaliraj FaktureOnline na početni ekran
          </p>
        )}
      </div>
      {!showIosHint && (
        <button
          type="button"
          onClick={install}
          className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Instaliraj
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Zatvori"
        className="text-slate-400 hover:text-slate-600 p-2 -mr-2 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
        </svg>
      </button>
    </div>
  );
}
