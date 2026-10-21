import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { Data } from "../model";
import type { StudioTab } from "./model";
export type Mutation = (fn: (data: Data)=>Data, group?: string, record?: boolean)=>void;
export type Confirm = (request: {title:string;message:string;action:()=>void;label?:string})=>void;
export interface StudioProps { data:Data; projectId:string; change:Mutation; onOpen:(id:string)=>void; notice:(text:string)=>void; confirm:Confirm; focusId?:string; onNavigate:(tab:StudioTab,id?:string)=>void }
export function EntrySelect({data,value,onChange,label="関連する設定",kind,required=false}: {data:Data;value:string;onChange:(id:string)=>void;label?:string;kind?:string;required?:boolean}) {
  return <label>{label}<select aria-label={label} value={value} required={required} onChange={event=>onChange(event.target.value)}><option value="">{required?"選択してください":"未指定"}</option>{data.entries.filter(entry=>!kind||entry.kind===kind).map(entry=><option key={entry.id} value={entry.id}>{entry.name||"名前未設定"} · {data.projects.find(p=>p.id===entry.projectId)?.name||"作品"}</option>)}</select></label>;
}
export function LinkPicker({data,value,onChange}: {data:Data;value:string[];onChange:(ids:string[])=>void}) {
  const [query,setQuery]=useState("");const [open,setOpen]=useState(false);
  return <div className="studio-links"><span className="muted small">関連する設定</span><div className="studio-chips">{value.map(id=><button type="button" key={id} aria-label={`${data.entries.find(e=>e.id===id)?.name||"削除済み"}を関連から外す`} onClick={()=>onChange(value.filter(item=>item!==id))}>{data.entries.find(e=>e.id===id)?.name||"削除済み"}<X size={13}/></button>)}</div><button type="button" className="text-button" onClick={()=>setOpen(!open)}><Plus size={15}/>設定へのリンクを追加</button>{open&&<div className="link-picker"><input aria-label="関連設定の候補を検索" placeholder="名前で検索" value={query} onChange={event=>setQuery(event.target.value)}/><div>{data.entries.filter(entry=>!value.includes(entry.id)&&entry.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(entry=><button type="button" key={entry.id} onClick={()=>{onChange([...value,entry.id]);setQuery("");setOpen(false);}}><span>{entry.name||"名前未設定"}</span><small>{data.projects.find(p=>p.id===entry.projectId)?.name}</small></button>)}</div></div>}</div>;
}
export function NumberField({label,value,onChange,min}: {label:string;value:number|undefined;onChange:(value:number|undefined)=>void;min?:number}) {
  return <label>{label}<input aria-label={label} type="number" step="any" min={min} value={value??""} placeholder="未確定" onChange={event=>onChange(event.target.value===""?undefined:Number(event.target.value))}/></label>;
}
export function Empty({children}: {children:React.ReactNode}) {return <div className="studio-empty panel">{children}</div>;}
export function SaveCancel({onCancel,label="保存"}: {onCancel:()=>void;label?:string}) {return <div className="modal-footer"><button type="button" className="button subtle" onClick={onCancel}>キャンセル</button><button className="button primary" type="submit">{label}</button></div>;}
export function exportText(text:string,name:string,type="text/markdown;charset=utf-8") {const url=URL.createObjectURL(new Blob([text],{type}));const link=document.createElement("a");link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
