import { Children, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
/** Desktop keeps both panes; small screens can open a dedicated detail page. */
export default function EditorSplit({
  children,
  mode,
  selection,
  label,
  initialDetail = false,
}: {
  children: ReactNode;
  mode?: "pages" | "inline";
  selection: string;
  label: string;
  initialDetail?: boolean;
}) {
  const [detail, setDetail] = useState(initialDetail);
  const previous = useRef(selection);
  useEffect(() => {
    if (!selection) setDetail(false);
    else if (previous.current !== selection) setDetail(true);
    previous.current = selection;
  }, [selection]);
  const panes = Children.toArray(children);
  return (
    <div
      className={`creation-layout editor-split ${mode === "inline" ? "split-inline" : "split-pages"} ${detail && selection ? "split-detail" : "split-list"}`}
    >
      <div
        className="editor-list-pane"
        onClick={(e) => {
          if (
            (e.target as HTMLElement).closest(
              ".creation-person,.creation-scene-link",
            )
          ) {
            setDetail(true);
            if (
              mode !== "inline" &&
              window.matchMedia("(max-width:720px)").matches
            )
              requestAnimationFrame(() =>
                document
                  .querySelector(".editor-detail-pane")
                  ?.scrollIntoView({ block: "start" }),
              );
          }
        }}
        onSubmit={() => setDetail(true)}
      >
        {panes[0]}
      </div>
      <div className="editor-detail-pane">
        <button
          className="button subtle editor-list-back"
          onClick={() => setDetail(false)}
        >
          ← {label}の一覧へ戻る
        </button>
        {panes.slice(1)}
      </div>
    </div>
  );
}
