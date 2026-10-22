import { useState } from "react";
import { Plus } from "lucide-react";
import type { Entry } from "./model";
import Modal from "./Modal";

export function settingGenre(entry: Entry): string {
  return entry.kind === "world" ? `world:${entry.category.trim() || "未分類"}` : `kind:${entry.kind}`;
}
export function matchesSettingGenre(entry: Entry, genre: string): boolean {
  return !genre || settingGenre(entry) === genre;
}
export default function SettingGenrePicker({ entries, categories, value, onChange, label = "ジャンルから設定を選ぶ", kinds = true, onAdd, addLabel = "ジャンルを追加" }: {
  entries: Entry[]; categories: string[]; value: string; onChange: (value: string) => void; label?: string; kinds?: boolean; onAdd?: (name: string) => void; addLabel?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const genres = [...new Set([...categories, "病気", "村・集落", ...entries.filter((e) => e.kind === "world").map((e) => e.category.trim() || "未分類"), ...(value.startsWith("world:") ? [value.slice(6)] : [])])].filter(Boolean);
  const counts = new Map<string, number>();
  for (const entry of entries) { const key = settingGenre(entry); counts.set(key, (counts.get(key) || 0) + 1); }
  const count = (key: string) => counts.get(key) || 0;
  return <div className="setting-genre-picker">
    <label>{label}<select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}><option value="">すべて（{entries.length}件）</option>
      {kinds && <optgroup label="設定の種類">{([["character", "人物"], ["event", "歴史・出来事"], ["clue", "秘密・謎"]] as const).filter(([id]) => entries.some((entry) => entry.kind === id)).map(([id, title]) => <option key={id} value={`kind:${id}`}>{title}（{count(`kind:${id}`)}件）</option>)}</optgroup>}
      <optgroup label="世界観のジャンル">{genres.map((genre) => <option key={genre} value={`world:${genre}`}>{genre}（{count(`world:${genre}`)}件）</option>)}</optgroup>
    </select></label>
    {value && <button className="text-button" onClick={() => onChange("")}>絞り込みを解除</button>}
    {onAdd && <button className="button subtle" onClick={() => { setName(""); setAdding(true); }}><Plus size={16} />{addLabel}</button>}
    {adding && <Modal label="ジャンルを追加" onClose={() => setAdding(false)}><form onSubmit={(e) => { e.preventDefault(); const next = name.trim(); if (!next) return; onAdd?.(next); setAdding(false); }}><h2>ジャンルを追加</h2><label>ジャンル名<input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="例：生物、技術、食文化" /></label><p className="muted">自由な名前で分類できます。同じ名前がある場合は、そのジャンルを選択します。</p><div className="page-actions"><button type="button" className="button subtle" onClick={() => setAdding(false)}>キャンセル</button><button type="submit" className="button primary">追加して選ぶ</button></div></form></Modal>}
  </div>;
}
