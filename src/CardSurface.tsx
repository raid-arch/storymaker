import { useEffect, useRef, useState } from "react";
import type { HTMLAttributes, PointerEvent } from "react";
import { MoreHorizontal } from "lucide-react";

/** A long press is a shortcut, never a requirement. Scrolling must stay native. */
export default function CardSurface({
  onActions,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { onActions: () => void }) {
  const callback = useRef(onActions);
  const surface = useRef<HTMLElement>(null);
  callback.current = onActions;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const suppressClick = useRef(false);
  const releaseGuard = useRef<() => void>(() => {});
  const [pressing, setPressing] = useState(false);
  const cancel = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    start.current = null;
    setPressing(false);
  };
  useEffect(() => () => releaseGuard.current(), []);
  useEffect(() => {
    const element = surface.current;
    // Android's selection/search UI must not compete with card actions.
    // Keep this local: text in editors and writing dialogs stays selectable.
    const preventSelection = (event: Event) => event.preventDefault();
    element?.addEventListener("selectstart", preventSelection);
    return () => element?.removeEventListener("selectstart", preventSelection);
  }, []);
  useEffect(() => {
    if (!pressing) return;
    window.addEventListener("scroll", cancel, true);
    window.addEventListener("pointerup", cancel);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener("scroll", cancel, true);
      window.removeEventListener("pointerup", cancel);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
    };
  }, [pressing]);
  const show = () => {
    cancel();
    suppressClick.current = true;
    releaseGuard.current();
    // Chrome can send the compatibility click to the newly opened sheet,
    // rather than the original card. Consume that click at document level.
    // A fresh press or key starts a deliberate action and removes the guard.
    const clear = () => {
      document.removeEventListener("click", block, true);
      document.removeEventListener("pointerdown", clear, true);
      document.removeEventListener("keydown", clear, true);
    };
    const block = (event: MouseEvent) => {
      if (!event.detail) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      clear();
    };
    document.addEventListener("click", block, true);
    document.addEventListener("pointerdown", clear, true);
    document.addEventListener("keydown", clear, true);
    releaseGuard.current = clear;
    callback.current();
  };
  const pointerDown = (event: PointerEvent<HTMLElement>) => {
    cancel();
    suppressClick.current = false;
    if (
      (event.target as HTMLElement).closest("[data-card-surface]") !==
      event.currentTarget
    )
      return;
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      event.pointerType === "mouse" ||
      (event.target as HTMLElement).closest("[data-card-menu]")
    )
      return;
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    setPressing(true);
    timer.current = setTimeout(show, 550);
  };
  return (
    <section
      {...props}
      ref={surface}
      data-card-surface
      data-pressing={pressing || undefined}
      onPointerDown={pointerDown}
      onPointerMove={(event) => {
        const origin = start.current;
        if (
          origin &&
          (origin.id !== event.pointerId ||
            Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 10)
        )
          cancel();
      }}
      onPointerLeave={cancel}
      onContextMenu={(event) => {
        if (
          (event.target as HTMLElement).closest("[data-card-surface]") !==
          event.currentTarget
        )
          return;
        event.stopPropagation();
        event.preventDefault();
        show();
      }}
      onClickCapture={(event) => {
        if (event.detail > 0 && suppressClick.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {children}
    </section>
  );
}

export function CardMenuButton({
  name,
  onClick,
}: {
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-card-menu
      className="card-menu-button icon-button"
      aria-label={`${name}の操作`}
      aria-haspopup="dialog"
      onClick={onClick}
    >
      <MoreHorizontal size={21} />
    </button>
  );
}
