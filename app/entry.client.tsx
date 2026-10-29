import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

/**
 * Browser extensions (password managers such as Dashlane, translators,
 * grammar checkers) inject, move or wrap DOM nodes inside the tree React
 * manages. When React later removes or inserts next to one of those nodes,
 * the DOM throws `NotFoundError` from `removeChild` / `insertBefore`, the
 * root error boundary catches it, and the whole page is replaced with
 * "Something's wrong here." Skip those impossible operations instead of
 * crashing (workaround from facebook/react#11538). Real removals and
 * insertions are unaffected.
 */
function guardDomAgainstExtensions() {
  if (typeof Node !== "function" || !Node.prototype) {
    return;
  }

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function removeChild(child) {
    if (child.parentNode !== this) {
      // biome-ignore lint/suspicious/noConsole: leave a trace when an extension forces a skip
      console.warn(
        "[storefront] Skipped removeChild: node was moved by another script (often a browser extension).",
        child,
      );
      return child;
    }
    return originalRemoveChild.call(this, child);
  } as typeof Node.prototype.removeChild;

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function insertBefore(newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      // biome-ignore lint/suspicious/noConsole: leave a trace when an extension forces a skip
      console.warn(
        "[storefront] Skipped insertBefore: reference node was moved by another script (often a browser extension).",
        referenceNode,
      );
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode);
  } as typeof Node.prototype.insertBefore;
}

if (!window.location.origin.includes("webcache.googleusercontent.com")) {
  guardDomAgainstExtensions();
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    );
  });
}
