import { Children, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
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
  const [detail, setDetail] = useState(initialDetail),
    previous = useRef(selection),
    listScroll = useRef(0),
    detailPane = useRef<HTMLDivElement>(null);
  const mobile = () =>
    mode !== "inline" && window.matchMedia("(max-width:720px)").matches;
  const back = () => {
    setDetail(false);
    if (mobile())
      requestAnimationFrame(() =>
        window.scrollTo({ top: listScroll.current, behavior: "instant" }),
      );
  };
  useEffect(() => {
    if (!selection) setDetail(false);
    else if (previous.current !== selection) setDetail(true);
    previous.current = selection;
  }, [selection]);
  useEffect(() => {
    if (detail && selection && mobile())
      requestAnimationFrame(() =>
        detailPane.current?.scrollIntoView({ block: "start" }),
      );
  }, [detail, selection, mode]);
  useEffect(() => {
    const handle = (event: Event) => {
      if (
        !detail ||
        !selection ||
        !mobile() ||
        document.querySelector('[role="dialog"],dialog[open]')
      )
        return;
      event.stopImmediatePropagation();
      back();
    };
    window.addEventListener("native-back", handle, true);
    return () => window.removeEventListener("native-back", handle, true);
  }, [detail, selection, mode]);
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
            listScroll.current = scrollY;
            setDetail(true);
          }
        }}
        onSubmit={() => {
          listScroll.current = scrollY;
          setDetail(true);
        }}
      >
        {panes[0]}
      </div>
      <div className="editor-detail-pane" ref={detailPane}>
        <button className="button subtle editor-list-back" onClick={back}>
          ← {label}の一覧へ戻る
        </button>
        {panes.slice(1)}
      </div>
    </div>
  );
}
