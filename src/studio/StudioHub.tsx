import { useEffect, useRef } from "react";
import { studioTabs } from "./model";
import type { StudioTab } from "./model";
import type { StudioProps } from "./ui";
import HistoryPanel from "./HistoryPanel";
import ImpactPanel from "./ImpactPanel";
import ChecksPanel from "./ChecksPanel";
import KnowledgePanel from "./KnowledgePanel";
import ErasPanel from "./ErasPanel";
import RecordsPanel from "./RecordsPanel";
import PlotPanel from "./PlotPanel";
import PublicPanel from "./PublicPanel";
import TemplatesPanel from "./TemplatesPanel";
import MapsPanel from "./MapsPanel";
export default function StudioHub(props: StudioProps & { tab: StudioTab }) {
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navigation.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    const parent = nav.getBoundingClientRect(),
      button = active.getBoundingClientRect();
    nav.scrollLeft +=
      button.left - parent.left - (nav.clientWidth - button.width) / 2;
  }, [props.tab]);
  const available: StudioTab[] = [
    "history",
    "impact",
    "checks",
    "knowledge",
    "eras",
    "terms",
    "references",
    "plot",
    "maps",
    "templates",
    "public",
  ];
  return (
    <div className="studio-hub">
      <div className="page-title">
        <div>
          <span className="eyebrow">CREATIVE STUDIO</span>
          <h1>創作スタジオ</h1>
          <p>作品の規模やジャンルに合わせて、設定と物語を組み立てる。</p>
        </div>
        {props.focusId &&
          props.data.entries.some((e) => e.id === props.focusId) && (
            <button
              className="button subtle"
              onClick={() => props.onOpen(props.focusId!)}
            >
              設定へ戻る
            </button>
          )}
      </div>
      <nav
        ref={navigation}
        className="studio-tabs"
        aria-label="創作スタジオの機能"
      >
        {studioTabs
          .filter((tab) => available.includes(tab.id))
          .map((tab) => (
            <button
              key={tab.id}
              aria-current={props.tab === tab.id ? "page" : undefined}
              onClick={() => props.onNavigate(tab.id, props.focusId)}
            >
              {tab.name}
            </button>
          ))}
      </nav>
      {props.tab === "public" ? (
        <PublicPanel {...props} />
      ) : props.tab === "templates" ? (
        <TemplatesPanel {...props} />
      ) : props.tab === "impact" ? (
        <ImpactPanel {...props} />
      ) : props.tab === "checks" ? (
        <ChecksPanel {...props} />
      ) : props.tab === "knowledge" ? (
        <KnowledgePanel {...props} />
      ) : props.tab === "eras" ? (
        <ErasPanel {...props} />
      ) : props.tab === "maps" ? (
        <MapsPanel {...props} />
      ) : props.tab === "plot" ? (
        <PlotPanel {...props} />
      ) : props.tab === "terms" || props.tab === "references" ? (
        <RecordsPanel {...props} mode={props.tab} />
      ) : (
        <HistoryPanel {...props} />
      )}
    </div>
  );
}
