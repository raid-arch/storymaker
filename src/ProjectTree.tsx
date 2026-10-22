import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, FolderTree, FolderPlus, Globe2, Plus, Pencil, ArrowRightLeft } from "lucide-react";
import type { Data, Project } from "./model";
import { isWorldLibrary } from "./model";
import { shelfDescendants, shelfParent } from "./collections";

export default function ProjectTree({ data, onOpen, onEdit, onCreate, onMove }: {
  data: Data;
  onOpen: (id: string) => void;
  onEdit: (project: Project) => void;
  onCreate: (kind: "world" | "story" | "series", parentId: string) => void;
  onMove: (id: string, parentId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [moving, setMoving] = useState("");
  const [destination, setDestination] = useState("");
  const movingProject = data.projects.find((p) => p.id === moving);
  function branch(parentId: string, path = new Set<string>()) {
    return <ul className="shelf-branches">{data.projects.filter((p) => shelfParent(data, p) === parentId && !path.has(p.id)).map((p) => {
      const world = isWorldLibrary(p), series = !world && p.type === "シリーズ";
      const children = data.projects.some((child) => shelfParent(data, child) === p.id);
      const Icon = world ? Globe2 : series ? FolderTree : BookOpen;
      const folded = collapsed.has(p.id);
      return <li key={p.id}>
        <div className="shelf-node">
          {world || series ? <button className="icon-button" aria-label={`${p.name}を${folded ? "展開" : "折りたたむ"}`} aria-expanded={!folded} onClick={() => setCollapsed((old) => { const next = new Set(old); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); return next; })}>{folded ? <ChevronRight size={17} /> : <ChevronDown size={17} />}</button> : <span className="shelf-spacer" />}
          <button className="shelf-open" onClick={() => onOpen(p.id)} aria-label={`${p.name}の制作画面をひらく`}><Icon size={20} /><span><strong>{p.name || "名前未設定"}</strong><small>{world ? "世界観" : series ? "シリーズ" : "作品"}</small></span></button>
          <div className="shelf-tools">
            {(world || series) && <button className="icon-button" aria-label={`${p.name}に作品を追加`} onClick={() => onCreate("story", p.id)}><Plus size={17} /></button>}
            {(world || series) && <button className="icon-button" title="シリーズを追加" onClick={() => onCreate("series", p.id)} aria-label={`${p.name}にシリーズを追加`}><FolderPlus size={17} /></button>}
            <button className="icon-button" aria-label={`${p.name}の名前・説明を編集`} onClick={() => onEdit(p)}><Pencil size={16} /></button>
            {!world && <button className="icon-button" aria-label={`${p.name}の所属を変更`} onClick={() => { setMoving(p.id); setDestination(shelfParent(data, p)); }}><ArrowRightLeft size={17} /></button>}
          </div>
        </div>
        {!folded && children && branch(p.id, new Set([...path, p.id]))}
        {!folded && (world || series) && !children && <p className="shelf-empty">＋から作品やシリーズを追加できます</p>}
      </li>;
    })}</ul>;
  }
  return <section className="panel project-tree" aria-labelledby="project-tree-title">
    <div className="section-heading"><h2 id="project-tree-title"><FolderTree size={21} /> 世界観と物語のツリー</h2></div>
    <p className="muted">世界観の下に作品・シリーズを、シリーズの下に作品を配置できます。所属を移しても、既存の設定や参照は残ります。</p>
    <div className="shelf-root-actions"><button className="button subtle" onClick={() => onCreate("world", "")}><Plus size={16} />世界観を追加</button><button className="button subtle" onClick={() => onCreate("series", "")}><Plus size={16} />シリーズを追加</button><button className="button subtle" onClick={() => onCreate("story", "")}><Plus size={16} />作品を追加</button></div>
    {branch("")}
    {!data.projects.length && <p className="shelf-empty">まず世界観を作り、その下に物語を並べましょう。</p>}
    {movingProject && <form className="shelf-move" onSubmit={(e) => { e.preventDefault(); onMove(moving, destination); setMoving(""); }}>
      <label>「{movingProject.name}」の移動先<select autoFocus value={destination} onChange={(e) => setDestination(e.target.value)}><option value="">所属なし（一番上）</option>{data.projects.filter((p) => (isWorldLibrary(p) || p.type === "シリーズ") && !shelfDescendants(data, moving).has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}（{isWorldLibrary(p) ? "世界観" : "シリーズ"}）</option>)}</select></label>
      <p className="muted">シリーズ内の作品も一緒に移動します。移動先の世界観を参照に追加し、以前の参照も保持します。</p>
      <div className="page-actions"><button className="button subtle" type="button" onClick={() => setMoving("")}>キャンセル</button><button className="button primary" type="submit">ここへ移動</button></div>
    </form>}
  </section>;
}
