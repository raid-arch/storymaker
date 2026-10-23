import { useEffect } from "react";
/** Keep navigation out of the way only while a software keyboard reduces the viewport. */
export default function useMobileViewport() {
  useEffect(() => {
    let width = innerWidth,
      baseline = window.visualViewport?.height || innerHeight;
    const update = () => {
      const height = window.visualViewport?.height || innerHeight;
      if (Math.abs(innerWidth - width) > 80) {
        width = innerWidth;
        baseline = height;
      }
      const focused = document.activeElement?.matches(
        'input,textarea,[contenteditable="true"]',
      );
      baseline = Math.max(baseline, height);
      document.documentElement.classList.toggle(
        "mobile-keyboard-open",
        innerWidth <= 720 && !!focused && baseline - height > 120,
      );
      document.documentElement.style.setProperty(
        "--visible-viewport-height",
        `${height}px`,
      );
    };
    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    update();
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      document.documentElement.classList.remove("mobile-keyboard-open");
    };
  }, []);
}
