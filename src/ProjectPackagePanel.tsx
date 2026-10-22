import { useState } from "react";
import { Download, Upload } from "lucide-react";
import type { Data } from "./model";
import { isWorldLibrary } from "./model";
import { exportProjectPackage, packageProjectIds } from "./projectPackages";
import { saveTextFile } from "./native";
export default function ProjectPackagePanel({ data, currentId, onImport, notice }: { data: Data; currentId: string; onImport: () => void; notice: (message: string) => void }) {
  const [selected, setSelected] = useState<string[]>(currentId ? [currentId] : []);
  const included = packageProjectIds(data, selected);
  return <section className="panel settings-panel"><h2>世界観・ストーリー単位の受け渡し</h2><p>既存データを残したまま追加できます。名前が同じ作品も、別のコピーとして取り込みます。</p>
    <button className="button primary full" onClick={onImport}><Upload size={17} />世界観・ストーリーをJSONから追加</button>
    <fieldset className="package-projects"><legend>書き出す世界観・ストーリー</legend>{data.projects.map((p) => <label key={p.id}><input type="checkbox" checked={selected.includes(p.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((id) => id !== p.id))} /><span>{p.name || "名前未設定"}<small>{isWorldLibrary(p) ? "世界観" : p.type}</small></span></label>)}</fieldset>
    <p className="muted">選択した世界観・シリーズ内の作品と、必要な参照先も含めます。表示設定・同期の認証情報は含みません。</p>
    <div className="package-included" aria-label="書き出しに含む保存先">{data.projects.filter((p) => included.has(p.id)).map((p) => <span className="chip" key={p.id}>{p.name}</span>)}</div>
    <button className="button subtle full" disabled={!included.size} onClick={async () => {
      try { const pack = exportProjectPackage(data, selected); const saved = await saveTextFile(JSON.stringify(pack, null, 2), "application/json", `綴庭-作品データ-${new Date().toISOString().slice(0, 10)}.json`); notice(saved ? "選んだ世界観・ストーリーを書き出しました。" : "書き出しをキャンセルしました。"); }
      catch (error) { notice(error instanceof Error ? error.message : "書き出せませんでした。"); }
    }}><Download size={17} />選んだ世界観・ストーリーをJSONで書き出す</button>
  </section>;
}
