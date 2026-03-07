import { useEffect, useRef } from "react";

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
        callback: onVerify,
        "expired-callback": onExpire,
        "error-callback": onError,
        theme,
        size,
        appearance,
      });
    };

    // If Turnstile is already loaded, render immediately
    if (window.turnstile) {
      renderWidget();
    } else {
      // Wait for script to load
      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          renderWidget();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
    };
  }, [siteKey, theme, size, appearance, onError, onExpire, onVerify]);

  if (!siteKey) {
    return null;
  }

  return <div ref={containerRef} className={className} />;
}

/**
 * Honeypot field — hidden from real users, bots will fill it in.
 * The field name is intentionally deceptive ("website").
 */
export function HoneypotField() {
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
      <label htmlFor="website">Website</label>
      <input
        type="text"
        id="website"
        name="website"
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
