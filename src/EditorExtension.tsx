import { useState, type ReactNode } from "react";
/** Disclosure preferences stay on this device; closing a section never edits story data. */
export default function EditorExtension({
  recordId,
  id,
  title,
  description,
  used = false,
  initiallyOpen = false,
  children,
}: {
  recordId: string;
  id: string;
  title: string;
  description: string;
  used?: boolean;
  initiallyOpen?: boolean;
  children: ReactNode;
}) {
  const storageKey = `tsuzuriniwa:extension:${recordId}:${id}`;
  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === null ? used || initiallyOpen : saved === "true";
    } catch {
      return used || initiallyOpen;
    }
  });
  return (
    <details
      className="editor-extension"
      data-extension={id}
      open={open}
      onToggle={(e) => {
        const next = e.currentTarget.open;
        setOpen(next);
        try {
          localStorage.setItem(storageKey, String(next));
        } catch {}
      }}
    >
      <summary>
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        {used && <span className="extension-used">入力あり</span>}
      </summary>
      <div className="editor-extension-content">{children}</div>
    </details>
  );
}
