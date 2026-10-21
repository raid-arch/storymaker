import { useState } from "react";
import { checkConsistency } from "./checks";
import { editStudio, putItem, sid, studioOf } from "./model";
import type { CheckRules, TimeConstraint } from "./model";
import { Empty, EntrySelect, NumberField } from "./ui";
import type { StudioProps } from "./ui";

export default function ChecksPanel({
  data,
  projectId,
  change,
  onOpen,
  confirm,
  notice,
}: StudioProps) {
  const s = studioOf(data);
  const original = s.rules.find((rule) => rule.projectId === projectId);
  const [rules, setRules] = useState<CheckRules>(
    original || { id: sid(), projectId },
  );
  const [beforeId, setBefore] = useState("");
  const [afterId, setAfter] = useState("");
  const [gap, setGap] = useState<number | undefined>(0);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("all");
  const findings = checkConsistency(data, projectId);
  const visible = findings.filter(
    (item) => filter === "all" || item.severity === filter,
  );
  return (
    <section className="studio-section">
      <h2>家系・時系列の矛盾チェック</h2>
      <p className="muted">
        登録された数値・血縁・前後条件を検証します。関連リンクだけでは事件への参加を断定しません。転生・長寿・死後出生などの意図した設定は、要確認として扱います。
      </p>
      <details className="panel studio-form">
        <summary>この作品の検証基準を設定する</summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            change((d) =>
              editStudio(d, (s) => ({ ...s, rules: putItem(s.rules, rules) })),
            );
            notice("検証基準を保存しました。");
          }}
        >
          <div className="form-row">
            <NumberField
              label="親になる年齢の下限（任意）"
              value={rules.minParentAge}
              min={0}
              onChange={(value) => setRules({ ...rules, minParentAge: value })}
            />
            <NumberField
              label="寿命の上限（任意）"
              value={rules.maxLifeSpan}
              min={0}
              onChange={(value) => setRules({ ...rules, maxLifeSpan: value })}
            />
          </div>
          <button className="button primary">検証基準を保存</button>
        </form>
      </details>
      <div className="studio-actions">
        <label>
          結果の表示
          <select
            aria-label="検証結果の表示"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">すべて（{findings.length}）</option>
            <option value="error">数値・構造の矛盾候補</option>
            <option value="review">設定意図の確認</option>
            <option value="unknown">情報不足</option>
          </select>
        </label>
      </div>
      {!visible.length ? (
        <Empty>
          登録された検証可能な条件に、該当する指摘はありません。文章全体の意味や未登録の事実は検証対象に含まれません。
        </Empty>
      ) : (
        <div className="studio-list">
          {visible.map((item) => (
            <article
              className={`panel studio-finding ${item.severity}`}
              key={item.id}
            >
              <span className="studio-step">
                {
                  { error: "矛盾候補", review: "要確認", unknown: "情報不足" }[
                    item.severity
                  ]
                }
              </span>
              <p>{item.message}</p>
              <div className="studio-actions">
                {[...new Set(item.entryIds)].map(
                  (id) =>
                    data.entries.some((entry) => entry.id === id) && (
                      <button
                        className="text-button"
                        key={id}
                        onClick={() => onOpen(id)}
                      >
                        {data.entries.find((entry) => entry.id === id)?.name}
                        を開く
                      </button>
                    ),
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <section className="panel studio-form">
        <h3>事件の前後条件</h3>
        <p className="muted small">
          「事件Aの後に事件Bが起きる」などの条件を登録して検証します。年代が未確定なら情報不足として表示します。
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (
              !beforeId ||
              !afterId ||
              beforeId === afterId ||
              gap === undefined ||
              gap < 0
            ) {
              notice("異なる2つの事件と、0以上の年数を指定してください。");
              return;
            }
            const item: TimeConstraint = {
              id: sid(),
              projectId,
              beforeId,
              afterId,
              gap,
              note,
            };
            change((d) =>
              editStudio(d, (s) => ({
                ...s,
                constraints: [...s.constraints, item],
              })),
            );
            setBefore("");
            setAfter("");
            setNote("");
          }}
        >
          <div className="form-row">
            <EntrySelect
              data={data}
              kind="event"
              label="先に起きる事件"
              value={beforeId}
              onChange={setBefore}
              required
            />
            <EntrySelect
              data={data}
              kind="event"
              label="後に起きる事件"
              value={afterId}
              onChange={setAfter}
              required
            />
          </div>
          <NumberField
            label="最低何年後か"
            value={gap}
            min={0}
            onChange={setGap}
          />
          <label>
            条件のメモ
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <button className="button primary">前後条件を追加</button>
        </form>
        <div className="studio-list">
          {s.constraints
            .filter((item) => item.projectId === projectId)
            .map((item) => (
              <div className="studio-inline-record" key={item.id}>
                <span>
                  {data.entries.find((entry) => entry.id === item.beforeId)
                    ?.name || "削除済み"}{" "}
                  →{" "}
                  {data.entries.find((entry) => entry.id === item.afterId)
                    ?.name || "削除済み"}
                  （{item.gap}年以上）
                </span>
                <button
                  className="button danger-outline"
                  onClick={() =>
                    confirm({
                      title: "この前後条件を削除しますか？",
                      message: "事件の設定は残ります。",
                      action: () =>
                        change((d) =>
                          editStudio(d, (s) => ({
                            ...s,
                            constraints: s.constraints.filter(
                              (row) => row.id !== item.id,
                            ),
                          })),
                        ),
                    })
                  }
                >
                  条件を削除
                </button>
              </div>
            ))}
        </div>
      </section>
    </section>
  );
}
