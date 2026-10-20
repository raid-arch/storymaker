import { useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/** Free writing first; suggestions are optional and never restrict saved text. */
export default function FreeTextInput({
  label,
  value,
  onChange,
  suggestions = [],
  placeholder = "自由に入力",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions?: readonly string[];
  placeholder?: string;
  required?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const choices = [
    ...new Set(suggestions.map((s) => s.trim()).filter(Boolean)),
  ];
  return (
    <div
      className="free-text-field"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <div className="free-text-control">
        <input
          ref={input}
          aria-label={label}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(false);
          }}
          placeholder={placeholder}
          required={required}
          list={`${id}-list`}
          onKeyDown={(e) => {
            if (e.key === "Escape" && open) {
              e.stopPropagation();
              setOpen(false);
            }
          }}
        />
        {choices.length > 0 && (
          <button
            type="button"
            className="free-text-toggle"
            aria-label={`${label}の候補を見る`}
            aria-expanded={open}
            aria-controls={`${id}-choices`}
            onClick={() => setOpen(!open)}
          >
            <ChevronDown size={16} />
            <span>候補</span>
          </button>
        )}
      </div>
      <datalist id={`${id}-list`}>
        {choices.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {open && (
        <div
          className="free-text-choices"
          id={`${id}-choices`}
          role="group"
          aria-label={`${label}の候補`}
        >
          {choices.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => {
                onChange(s);
                setOpen(false);
                input.current?.focus();
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
