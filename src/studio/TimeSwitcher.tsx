import { useState } from "react";
import type { Data, Entry } from "../model";
import { studioOf } from "./model";
import type { TimeSelection } from "./time";
import { NumberField } from "./ui";
export function TimeSwitcher({
  data,
  projectId,
  value,
  onChange,
  onManage,
}: {
  data: Data;
  projectId: string;
  value: TimeSelection;
  onChange: (value: TimeSelection) => void;
  onManage: () => void;
}) {
  const [custom, setCustom] = useState(false);
  const eras = studioOf(data).eras.filter((era) => era.projectId === projectId);
  const active = Boolean(value.eraId) || value.year !== undefined;
  return (
    <section
      className={`time-switcher panel ${active ? "active" : ""}`}
      aria-label="設定の時点切り替え"
    >
      <label>
        設定の時点
        <select
          aria-label="設定の時点"
          value={
            value.eraId || (value.year !== undefined || custom ? "__year" : "")
          }
          onChange={(event) => {
            const id = event.target.value;
            if (id === "__year") {
              setCustom(true);
              onChange({ eraId: "", year: value.year });
            } else {
              setCustom(false);
              const era = eras.find((item) => item.id === id);
              onChange({ eraId: id, year: era?.from ?? era?.to });
            }
          }}
        >
          <option value="">現在の設定</option>
          <option value="__year">年を指定して見る</option>
          {eras.map((era) => (
            <option key={era.id} value={era.id}>
              {era.name}
            </option>
          ))}
        </select>
      </label>
      {(custom || value.year !== undefined) && (
        <NumberField
          label="閲覧する年"
          value={value.year}
          onChange={(year) => {
            setCustom(true);
            onChange({ eraId: "", year });
          }}
        />
      )}
      <div className="time-switch-actions">
        {active && (
          <span className="studio-step">過去・未来の設定を閲覧中</span>
        )}
        <button className="text-button" onClick={onManage}>
          時代を管理
        </button>
        {active && (
          <button
            className="button subtle"
            onClick={() => {
              setCustom(false);
              onChange({ eraId: "" });
            }}
          >
            現在に戻る
          </button>
        )}
      </div>
    </section>
  );
}
export function EraEntryPreview({
  entry,
  data,
  onOpen,
  onBack,
  onEdit,
}: {
  entry: Entry;
  data: Data;
  onOpen: (id: string) => void;
  onBack: () => void;
  onEdit: () => void;
}) {
  return (
    <article className="entry-page">
      <div className="studio-actions">
        <button className="button subtle" onClick={onBack}>
          一覧へ戻る
        </button>
        <button className="button primary" onClick={onEdit}>
          現在の設定を編集
        </button>
      </div>
      <div className="page-title">
        <div>
          <span className="eyebrow">AT THIS TIME · READ ONLY</span>
          <h1>{entry.name || "名前未設定"}</h1>
          <p>この時点の設定を閲覧しています。現在の設定は変更されません。</p>
        </div>
      </div>
      <section className="panel studio-form">
        <p>{entry.subtitle}</p>
        {entry.image && (
          <img
            className="studio-history-image"
            src={entry.image}
            alt="この時点の設定画像"
          />
        )}
        <h2>設定・メモ</h2>
        <pre className="studio-prose">{entry.body || "未記入"}</pre>
        {Object.entries(entry.fields).map(([key, value]) => (
          <p className="studio-prose" key={key}>
            <strong>{key}：</strong>
            {value || "未記入"}
          </p>
        ))}
        {entry.custom.map((field, index) => (
          <p className="studio-prose" key={index}>
            <strong>{field.name}：</strong>
            {field.value}
          </p>
        ))}
        <h3>作中での通説</h3>
        <pre className="studio-prose">{entry.lore || "未記入"}</pre>
        <h3>実際の真相</h3>
        <pre className="studio-prose">{entry.truth || "未記入"}</pre>
        <div className="studio-actions">
          {entry.links.map((id) => {
            const linked = data.entries.find((e) => e.id === id);
            return (
              linked && (
                <button
                  className="button subtle"
                  key={id}
                  onClick={() => onOpen(id)}
                >
                  {linked.name}
                </button>
              )
            );
          })}
        </div>
      </section>
    </article>
  );
}
