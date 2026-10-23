import { useEffect, useRef, useState } from "react";
import type { Scene } from "./studio/model";
/** Rebuild a small, inert set of document elements; never render imported HTML directly. */
export function safeDocument(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html"),
    out = document.createElement("div");
  const copy = (node: Node, parent: HTMLElement) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.append(document.createTextNode(node.textContent || ""));
      return;
    }
    if (
      !(node instanceof Element) ||
      ["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG", "MATH"].includes(
        node.tagName,
      )
    )
      return;
    const allowed = [
      "P",
      "DIV",
      "BR",
      "STRONG",
      "B",
      "EM",
      "I",
      "U",
      "H1",
      "H2",
      "H3",
      "UL",
      "OL",
      "LI",
      "BLOCKQUOTE",
      "SPAN",
    ];
    const tag = allowed.includes(node.tagName)
        ? node.tagName.toLowerCase()
        : "span",
      el = document.createElement(tag);
    const align = (node as HTMLElement).style?.textAlign;
    if (["left", "center", "right", "justify"].includes(align))
      el.style.textAlign = align;
    parent.append(el);
    node.childNodes.forEach((n) => copy(n, el));
  };
  doc.body.childNodes.forEach((n) => copy(n, out));
  return out.innerHTML;
}
export default function RichManuscript({
  scene,
  onChange,
  onClose,
}: {
  scene: Scene;
  onChange: (html: string, text: string) => void;
  onClose: () => void;
}) {
  const editor = useRef<HTMLDivElement>(null),
    composing = useRef(false),
    last = useRef(""),
    range = useRef<Range | null>(null),
    [font, setFont] = useState("serif");
  useEffect(() => {
    const el = editor.current;
    if (!el || composing.current) return;
    const html = scene.manuscriptHtml ? safeDocument(scene.manuscriptHtml) : "";
    const text = scene.manuscript || "";
    const signature = JSON.stringify([html, text]);
    if (signature === last.current) return;
    if (document.activeElement === el) return;
    if (html) el.innerHTML = html;
    else el.textContent = text;
    last.current = JSON.stringify([safeDocument(el.innerHTML), el.innerText]);
  }, [scene.id, scene.manuscript, scene.manuscriptHtml]);
  const save = () => {
    const el = editor.current;
    if (!el || composing.current) return;
    const html = safeDocument(el.innerHTML),
      text = el.innerText;
    const signature = JSON.stringify([html, text]);
    if (signature === last.current) return;
    last.current = signature;
    onChange(html, text);
  };
  const remember = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && editor.current?.contains(selection.anchorNode))
      range.current = selection.getRangeAt(0).cloneRange();
  };
  const command = (name: string, value?: string) => {
    editor.current?.focus();
    if (
      range.current &&
      editor.current?.contains(range.current.startContainer)
    ) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range.current);
    }
    document.execCommand(name, false, value);
    remember();
    save();
  };
  return (
    <section className="word-editor" aria-label="本文の執筆">
      <div className="word-toolbar">
        <button className="button subtle" onClick={onClose}>
          シーンの設定へ
        </button>
        <strong>{scene.name}</strong>
        <span>{Array.from(scene.manuscript || "").length}文字</span>
      </div>
      <div className="word-format" role="toolbar" aria-label="本文の書式">
        <select
          aria-label="段落の書式"
          defaultValue="p"
          onChange={(e) => command("formatBlock", e.target.value)}
        >
          <option value="p">本文</option>
          <option value="h1">大見出し</option>
          <option value="h2">見出し</option>
          <option value="h3">小見出し</option>
        </select>
        {[
          ["bold", "太字"],
          ["italic", "斜体"],
          ["underline", "下線"],
          ["insertUnorderedList", "箇条書き"],
          ["insertOrderedList", "番号付きリスト"],
          ["justifyLeft", "左揃え"],
          ["justifyCenter", "中央揃え"],
          ["undo", "入力を取り消す"],
          ["redo", "入力をやり直す"],
        ].map(([cmd, label]) => (
          <button
            key={cmd}
            aria-label={label}
            title={label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => command(cmd)}
          >
            {label}
          </button>
        ))}
        <select
          aria-label="執筆の書体"
          value={font}
          onChange={(e) => setFont(e.target.value)}
        >
          <option value="serif">明朝</option>
          <option value="sans">ゴシック</option>
        </select>
      </div>
      <div className="word-paper-area">
        <div
          key={scene.id}
          ref={editor}
          className={`word-paper word-${font}`}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="執筆本文"
          aria-multiline="true"
          spellCheck={false}
          onInput={() => {
            remember();
            save();
          }}
          onSelect={remember}
          onKeyUp={remember}
          onMouseUp={remember}
          onTouchEnd={remember}
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={() => {
            composing.current = false;
            save();
          }}
          onBlur={() => {
            save();
          }}
          onPaste={(e) => {
            e.preventDefault();
            document.execCommand(
              "insertText",
              false,
              e.clipboardData.getData("text/plain"),
            );
            save();
          }}
        />
      </div>
    </section>
  );
}
