import { useId, useState } from "react";
import { Check, Maximize2 } from "lucide-react";
import Modal from "./Modal";

export default function WritingField({
  label,
  value,
  onChange,
  placeholder,
  saveState,
  primary = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  saveState: string;
  primary?: boolean;
}) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const count = Array.from(value).length;
  return (
    <div className="writing-field">
      <div className="writing-field-heading">
        <label htmlFor={id}>{label}</label>
        <button
          type="button"
          className="text-button"
          aria-label={`${label}を広げて書く`}
          onClick={() => setExpanded(true)}
        >
          <Maximize2 size={15} />
          <span>広げて書く</span>
        </button>
      </div>
      <textarea
        id={id}
        className={primary ? "long-editor" : ""}
        rows={primary ? 10 : 4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <span className="writing-count">{count.toLocaleString()} 文字</span>
      {expanded && (
        <Modal
          variant="writing"
          label={`${label}の執筆`}
          onClose={() => setExpanded(false)}
        >
          <div className="writing-toolbar">
            <div>
              <span className="eyebrow">WRITING ROOM</span>
              <h2>{label}</h2>
            </div>
            <button
              className="button primary"
              onClick={() => setExpanded(false)}
            >
              <Check size={17} />
              完了
            </button>
          </div>
          <textarea
            autoFocus
            aria-label={`${label}を執筆`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder || "思いつくままに、ここから。"}
          />
          <div className="writing-footer">
            <span role="status">{saveState}</span>
            <span>{count.toLocaleString()} 文字</span>
          </div>
        </Modal>
      )}
    </div>
  );
}
