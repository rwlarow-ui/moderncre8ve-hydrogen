import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "invisible";
          appearance?: "always" | "execute" | "interaction-only";
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "invisible";
  appearance?: "always" | "execute" | "interaction-only";
  className?: string;
}

export function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  onError,
  theme = "auto",
  size = "normal",
  appearance = "interaction-only",
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Callers pass inline callbacks, whose identity changes on every render.
  // Keep the latest in a ref so a re-render (e.g. the caller storing the
  // token) doesn't tear down and re-run a completed challenge.
  const callbacksRef = useRef({ onVerify, onExpire, onError });
  useLayoutEffect(() => {
    callbacksRef.current = { onVerify, onExpire, onError };
  });

  useEffect(() => {
    if (!containerRef.current || !siteKey) {
      return;
    }

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current) {
        return;
      }
      // Clean up existing widget
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => callbacksRef.current.onVerify(token),
        "expired-callback": () => callbacksRef.current.onExpire?.(),
        "error-callback": () => callbacksRef.current.onError?.(),
        theme,
        size,
        appearance,
      });
    };

    // Render now if the script is loaded, otherwise poll until it is.
    let checkInterval: ReturnType<typeof setInterval> | undefined;
    if (window.turnstile) {
      renderWidget();
    } else {
      checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          renderWidget();
        }
      }, 100);
    }

    // One cleanup for both paths, so a widget rendered after a late script
    // load is still removed on unmount.
    return () => {
      clearInterval(checkInterval);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, theme, size, appearance]);

  if (!siteKey) {
    return null;
  }

  return <div ref={containerRef} className={className} />;
}

/**
 * Token state for a form protected by TurnstileWidget.
 *
 * Turnstile tokens are single-use and the server redeems one on every
 * submission, so after each response (success or error) the stored token is
 * cleared and `widgetKey` changes. Pass it as the widget's `key` to remount it
 * and run a fresh challenge. `response` is the fetcher/action data, a new
 * object for every completed submission.
 */
export function useTurnstileToken(response: unknown) {
  const [token, setToken] = useState("");
  const [widgetKey, setWidgetKey] = useState(0);
  useEffect(() => {
    if (response) {
      setToken("");
      setWidgetKey((key) => key + 1);
    }
  }, [response]);
  return { token, setToken, widgetKey };
}

/**
 * Honeypot field — hidden from real users, bots will fill it in.
 * The field name is intentionally deceptive ("website").
 */
export function HoneypotField() {
  const id = useId();
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-9999px",
        opacity: 0,
        height: 0,
        overflow: "hidden",
      }}
    >
      <label htmlFor={id}>Website</label>
      <input
        type="text"
        id={id}
        name="website"
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
