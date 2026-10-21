import { useState } from "react";
import { impactOf } from "./analysis";
import { EntrySelect, Empty } from "./ui";
import type { StudioProps } from "./ui";
export default function ImpactPanel({data,focusId,projectId,onOpen,onNavigate}:StudioProps) {
  const [id,setId]=useState(focusId||data.entries.find(entry=>entry.projectId===projectId)?.id||"");const [depth,setDepth]=useState(2);
  const results=impactOf(data,id,depth);
  return <section className="studio-section"><h2>変更の影響範囲</h2><p className="muted">リンク、人物関係、認識、地図、プロットなどから影響候補を探します。文章の意味や設定変更の妥当性は自動判断しません。</p><div className="panel studio-form"><EntrySelect data={data} label="変更する設定" value={id} onChange={setId}/><label>たどる範囲<select value={depth} onChange={event=>setDepth(Number(event.target.value))}><option value={1}>直接の関連だけ</option><option value={2}>2段階まで</option><option value={3}>3段階まで</option><option value={4}>4段階まで</option></select></label></div><p className="muted small">{results.length} 件の影響候補</p>{!results.length?<Empty>対象の設定を選んでください。関連する参照がない場合も、文章内の記述は手動で確認してください。</Empty>:<div className="studio-list">{results.map(result=><button className="panel studio-result" key={result.key} onClick={()=>result.entryId?onOpen(result.entryId):result.tab&&onNavigate(result.tab,result.id)}><span className="studio-step">{result.distance===1?"直接":`${result.distance}段階`}</span><span><strong>{result.title}</strong><small>{result.reason} · {data.projects.find(p=>p.id===result.projectId)?.name||"作品"}</small></span></button>)}</div>}</section>;
}
