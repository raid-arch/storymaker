import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

const stack: HTMLElement[] = [];
let previousOverflow = "";

export default function Modal({
  children,
  onClose,
  wide = false,
  label = "編集・確認",
  variant = "",
}: {
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  label?: string;
  variant?: "" | "actions" | "writing";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const backdropPress = useRef(false);
  const previousFocus = useRef(document.activeElement as HTMLElement | null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const element = ref.current!;
    const previous = previousFocus.current;
    if (!stack.length) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    stack.push(element);
    // Let autofocus inputs keep focus. Other dialogs start at their container.
    if (!element.contains(document.activeElement)) element.focus();
    const key = (event: KeyboardEvent) => {
      if (
        stack.at(-1) !== element ||
        event.defaultPrevented ||
        event.isComposing ||
        document.querySelector("dialog[open]")
      )
        return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(
        element.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ),
      ).filter((node) => node.getClientRects().length);
      const first = nodes[0],
        last = nodes.at(-1);
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === element)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === element)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    const focus = (event: FocusEvent) => {
      if (
        stack.at(-1) === element &&
        !element.contains(event.target as Node) &&
        !document.querySelector("dialog[open]")
      )
        element.focus();
    };
    document.addEventListener("keydown", key);
    document.addEventListener("focusin", focus);
    return () => {
      stack.splice(stack.indexOf(element), 1);
      if (!stack.length) document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", key);
      document.removeEventListener("focusin", focus);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      className={`modal-backdrop ${variant ? `${variant}-backdrop` : ""}`}
      onPointerDown={(event) => {
        backdropPress.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (
          backdropPress.current &&
          event.target === event.currentTarget &&
          stack.at(-1) === ref.current
        )
          onClose();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""} ${variant ? `${variant}-dialog` : ""}`}
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}
