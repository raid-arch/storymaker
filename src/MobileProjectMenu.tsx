import {
  ArrowRight,
  BookOpen,
  Clock3,
  Globe2,
  Pencil,
  Users,
} from "lucide-react";
import type { Project } from "./model";
import { isWorldLibrary } from "./model";
export default function MobileProjectMenu({
  project,
  onEdit,
  onPeople,
  onSettings,
  onTime,
  onContext,
  onProject,
}: {
  project: Project;
  onEdit: () => void;
  onPeople: () => void;
  onSettings: () => void;
  onTime: () => void;
  onContext: () => void;
  onProject: () => void;
}) {
  const world = isWorldLibrary(project);
  const actions = world
    ? [
        {
          title: "世界の共通設定を作る",
          description: "人物・国・街・病気・世界の法則",
          icon: Globe2,
          action: onEdit,
        },
        {
          title: "世界の時間・歴史を編集",
          description: "暦や大きな出来事を整理する",
          icon: Clock3,
          action: onTime,
        },
        {
          title: "共通の人物を編集",
          description: "この世界の人物プロフィールと関係",
          icon: Users,
          action: onPeople,
        },
        {
          title: "この世界の物語を見る",
          description: "子プロジェクトと関連設定を確認",
          icon: BookOpen,
          action: onContext,
        },
      ]
    : [
        {
          title: "物語の構成・本文を作る",
          description: "章・シーンから物語を組み立てる",
          icon: BookOpen,
          action: onEdit,
        },
        {
          title: "この物語の人物を編集",
          description: "登場人物・役割・場面ごとの状態",
          icon: Users,
          action: onPeople,
        },
        {
          title: "使う舞台・資料を確認",
          description: "親の共通設定と、物語だけの設定",
          icon: Globe2,
          action: onSettings,
        },
        {
          title: "親の世界観と関連資料",
          description: "どの世界の設定に準拠しているか確認",
          icon: Clock3,
          action: onContext,
        },
      ];
  return (
    <section
      className="mobile-project-menu"
      aria-label="プロジェクトの作業選択"
    >
      <span className="eyebrow">{world ? "WORLD EDITOR" : "STORY EDITOR"}</span>
      <h1>{project.name}</h1>
      <p>今日は、どこから制作しますか？</p>
      <div>
        {actions.map((item) => (
          <button key={item.title} onClick={item.action}>
            <item.icon size={24} />
            <span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </span>
            <ArrowRight size={18} />
          </button>
        ))}
      </div>
      <button className="button subtle full" onClick={onProject}>
        <Pencil size={16} />
        名前・説明・親の設定
      </button>
    </section>
  );
}
