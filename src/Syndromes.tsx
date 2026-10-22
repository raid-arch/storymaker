import { useState } from "react";
import { ArrowUpRight, Plus, X } from "lucide-react";
import {
  sharedProjectIds,
  isSyndrome,
  newEntry,
  syndromeCategory,
  syndromeDiseases,
} from "./model";
import type { Data, Entry } from "./model";

export function DiseaseList({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const rows = value.split("\n");
  return (
    <div className="disease-list">
      {rows.map((disease, index) => (
        <div className="disease-row" key={index}>
          <label>
            <span>病気 {index + 1}</span>
            <input
              aria-label={`構成する病気${index + 1}`}
              value={disease}
              onChange={(event) =>
                onChange(
                  rows
                    .map((row, i) => (i === index ? event.target.value : row))
                    .join("\n"),
                )
              }
              placeholder="病名を自由に入力"
            />
          </label>
          <button
            type="button"
            className="icon-button"
            aria-label={`構成する病気${index + 1}を外す`}
            disabled={rows.length === 1 && !disease}
            onClick={() =>
              onChange(rows.filter((_, i) => i !== index).join("\n"))
            }
          >
            <X size={17} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button subtle"
        onClick={() => onChange(`${value}\n`)}
      >
        <Plus size={16} />
        病気を追加
      </button>
    </div>
  );
}

export function SyndromeForm({
  projectId,
  characterName,
  onSave,
  onClose,
}: {
  projectId: string;
  characterName?: string;
  onSave: (entry: Entry) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [diseases, setDiseases] = useState("");
  const [description, setDescription] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        onSave({
          ...newEntry(projectId, "world"),
          name: name.trim(),
          category: syndromeCategory,
          body: description,
          fields: { 構成する病気: diseases },
        });
      }}
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">SYNDROME</span>
          <h2>症候群を作る</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="閉じる"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <p className="muted small">
        {characterName
          ? `作成すると「${characterName}」に紐づきます。`
          : "世界観の「症候群」に保存します。"}
        複数の病気をまとめて、ほかの人物にも紐づけられます。
      </p>
      <label>
        症候群の名前
        <input
          required
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="症候群の名前を自由に入力"
        />
      </label>
      <h3 className="disease-heading">構成する病気</h3>
      <DiseaseList value={diseases} onChange={setDiseases} />
      <label>
        説明・症状
        <textarea
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="共通する症状、原因、経過などを自由に記述"
        />
      </label>
      <div className="modal-footer">
        <button type="button" className="button subtle" onClick={onClose}>
          キャンセル
        </button>
        <button className="button primary" type="submit">
          {characterName ? "作成して人物に紐づける" : "症候群を作成"}
        </button>
      </div>
    </form>
  );
}

export function CharacterSyndromes({
  entry,
  data,
  onChange,
  onOpen,
  onCreate,
}: {
  entry: Entry;
  data: Data;
  onChange: (entry: Entry) => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const linked = data.entries.filter(
    (e) => isSyndrome(e) && entry.links.includes(e.id),
  );
  const candidates = data.entries.filter(
    (e) =>
      isSyndrome(e) &&
      sharedProjectIds(data, entry.projectId).has(e.projectId) &&
      !entry.links.includes(e.id) &&
      [e.name, ...syndromeDiseases(e)]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  return (
    <section className="panel editor-section character-syndromes">
      <div className="section-heading">
        <h2>症候群</h2>
        <button type="button" className="text-button" onClick={onCreate}>
          <Plus size={16} />
          症候群を作る
        </button>
      </div>
      <p className="muted small">
        複数の病気をまとめた設定を人物に紐づけます。構成する病気は症候群のページで編集できます。
      </p>
      {linked.map((syndrome) => (
        <div className="syndrome-card" key={syndrome.id}>
          <div className="syndrome-card-heading">
            <button
              type="button"
              className="text-button"
              onClick={() => onOpen(syndrome.id)}
            >
              <strong>{syndrome.name || "名前未設定"}</strong>
              <ArrowUpRight size={17} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={`${syndrome.name}を人物から外す`}
              onClick={() =>
                onChange({
                  ...entry,
                  links: entry.links.filter((id) => id !== syndrome.id),
                })
              }
            >
              <X size={17} />
            </button>
          </div>
          {syndromeDiseases(syndrome).length ? (
            <ul>
              {syndromeDiseases(syndrome).map((disease, i) => (
                <li key={i}>{disease}</li>
              ))}
            </ul>
          ) : (
            <p className="muted small">構成する病気はまだありません。</p>
          )}
          {syndrome.body && (
            <p className="syndrome-description">{syndrome.body}</p>
          )}
        </div>
      ))}
      {!linked.length && (
        <p className="muted small syndrome-empty">
          まだ症候群は紐づいていません。
        </p>
      )}
      <button
        type="button"
        className="button subtle full"
        aria-expanded={picking}
        onClick={() => setPicking(!picking)}
      >
        <Plus size={16} />
        登録済みの症候群を紐づける
      </button>
      {picking && (
        <div className="link-picker">
          <input
            autoFocus
            aria-label="症候群を検索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="症候群名・病名で検索"
          />
          <div>
            {candidates.map((syndrome) => (
              <button
                key={syndrome.id}
                onClick={() => {
                  onChange({ ...entry, links: [...entry.links, syndrome.id] });
                  setPicking(false);
                  setQuery("");
                }}
              >
                <span>{syndrome.name || "名前未設定"}</span>
                <small>
                  {syndromeDiseases(syndrome).join("・") ||
                    "構成する病気は未記入"}
                </small>
              </button>
            ))}
            {!candidates.length && (
              <p className="muted small">
                この作品に追加できる症候群がありません。「症候群を作る」から登録できます。
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
