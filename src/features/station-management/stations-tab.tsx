"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ActionButton,
  Dialog,
  InlineNotice,
  StatusBadge,
} from "@/components/admin-workspace/admin-workspace";
import { PageState } from "@/components/page-state/page-state";
import {
  apiErrorMessage,
  changeStationStatus,
  createStation,
  getStation,
  isForbiddenError,
  isNotReadyError,
  listStations,
  newIntentKey,
  updateStation,
  isUnknownSubmission,
  type StationFilters,
  type StationWrite,
} from "./station-management-api";
import type { Station, ToggleStatus } from "./station-management-models";
import styles from "./station-management.module.css";

interface Props {
  permissions: readonly string[];
}

interface StationEditor {
  mode: "create" | "edit";
  target: Station | null;
  etag: string | null;
  name: string;
  regionLabel: string;
  remark: string;
  idempotencyKey: string;
  uncertain: boolean;
}

interface StatusEditor {
  target: Station;
  nextStatus: ToggleStatus;
  etag: string;
  reason: string;
  idempotencyKey: string;
  uncertain: boolean;
}

const emptyFilters: StationFilters = {};

export function StationsTab({ permissions }: Props) {
  const canView = permissions.includes("station:view");
  const canCreate = permissions.includes("station:create");
  const canUpdate = permissions.includes("station:update");
  const [draftFilters, setDraftFilters] = useState<StationFilters>(emptyFilters);
  const [filters, setFilters] = useState<StationFilters>(emptyFilters);
  const [items, setItems] = useState<readonly Station[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "forbidden" | "not-ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<StationEditor | null>(null);
  const [statusEditor, setStatusEditor] = useState<StatusEditor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async (current: StationFilters, append = false) => {
    if (!canView) {
      setStatus("forbidden");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const page = await listStations(current);
      setItems((previous) => append ? [...previous, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setStatus("ready");
    } catch (cause) {
      setError(apiErrorMessage(cause));
      setStatus(isForbiddenError(cause) ? "forbidden" : isNotReadyError(cause) ? "not-ready" : "error");
    }
  }, [canView]);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  async function openEdit(target: Station) {
    setFeedback(null);
    try {
      const current = await getStation(target.id);
      setEditor({
        mode: "edit",
        target: current.value,
        etag: current.etag,
        name: current.value.name,
        regionLabel: current.value.regionLabel,
        remark: current.value.remark,
        idempotencyKey: newIntentKey("updateStation"),
        uncertain: false,
      });
    } catch (cause) {
      setFeedback(apiErrorMessage(cause));
    }
  }

  async function openStatus(target: Station) {
    setFeedback(null);
    try {
      const current = await getStation(target.id);
      setStatusEditor({
        target: current.value,
        nextStatus: current.value.status === "ENABLED" ? "DISABLED" : "ENABLED",
        etag: current.etag,
        reason: "",
        idempotencyKey: newIntentKey("changeStationStatus"),
        uncertain: false,
      });
    } catch (cause) {
      setFeedback(apiErrorMessage(cause));
    }
  }

  async function submitEditor() {
    if (editor === null) return;
    setSubmitting(true);
    setFeedback(null);
    const body: StationWrite = {
      name: editor.name.trim(),
      regionLabel: editor.regionLabel.trim(),
      remark: editor.remark.trim(),
    };
    try {
      if (editor.mode === "create") {
        await createStation(body, editor.idempotencyKey);
        setFeedback("站点已由服务端创建；站点只作为归属与统计标识。");
      } else if (editor.target !== null && editor.etag !== null) {
        await updateStation(
          editor.target.id,
          body,
          editor.etag,
          editor.idempotencyKey,
        );
        setFeedback("站点资料已按服务端最新版本保存。");
      }
      setEditor(null);
      await load(filters);
    } catch (cause) {
      if (isUnknownSubmission(cause)) {
        setEditor((value) => value === null ? null : ({ ...value, uncertain: true }));
      }
      setFeedback(apiErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitStatus() {
    if (statusEditor === null) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await changeStationStatus(
        statusEditor.target.id,
        statusEditor.nextStatus,
        statusEditor.reason.trim(),
        statusEditor.etag,
        statusEditor.idempotencyKey,
      );
      setFeedback(statusEditor.nextStatus === "ENABLED"
        ? "站点已启用。"
        : "站点已停用，不再接收新的站长和注册归属；既有账户与历史账务保持不变。");
      setStatusEditor(null);
      await load(filters);
    } catch (cause) {
      if (isUnknownSubmission(cause)) {
        setStatusEditor((value) => value === null ? null : ({ ...value, uncertain: true }));
      }
      setFeedback(apiErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  if (!canView) {
    return <PageState description="当前员工没有站点查看权限。" kind="forbidden" />;
  }

  return (
    <>
      <div className={styles.sectionLead}>
        <div>
          <strong>A09 · 站点列表</strong>
          <span>字段和人数均来自站点接口；这里没有站点钱包或积分编辑入口。</span>
        </div>
        {canCreate ? (
          <ActionButton onClick={() => setEditor({
            mode: "create",
            target: null,
            etag: null,
            name: "",
            regionLabel: "",
            remark: "",
            idempotencyKey: newIntentKey("createStation"),
            uncertain: false,
          })} variant="primary">新增站点</ActionButton>
        ) : null}
      </div>

      <form className={styles.filterBar} onSubmit={(event) => {
        event.preventDefault();
        setFilters(stationFilterValues(draftFilters));
      }}>
        <label className={styles.field} data-grow="true">
          <span>站点名称 / 编号</span>
          <input
            onChange={(event) => setDraftFilters((value) => ({ ...value, keyword: event.target.value }))}
            placeholder="输入关键字"
            value={draftFilters.keyword ?? ""}
          />
        </label>
        <label className={styles.field}>
          <span>状态</span>
          <select
            onChange={(event) => setDraftFilters((value) => stationFilterValues(
              value,
              event.target.value === "" ? null : event.target.value as ToggleStatus,
            ))}
            value={draftFilters.status ?? ""}
          >
            <option value="">全部状态</option>
            <option value="ENABLED">启用</option>
            <option value="DISABLED">停用</option>
          </select>
        </label>
        <ActionButton type="submit" variant="primary">查询</ActionButton>
        <ActionButton onClick={() => {
          setDraftFilters(emptyFilters);
          setFilters(emptyFilters);
        }}>重置</ActionButton>
      </form>

      {feedback === null ? null : <p className={styles.feedback} role="status">{feedback}</p>}
      {status === "loading" ? <PageState kind="loading" title="正在读取站点" /> : null}
      {status === "forbidden" ? <PageState kind="forbidden" /> : null}
      {status === "not-ready" ? <PageState kind="not-ready" /> : null}
      {status === "error" ? (
        <PageState
          action={<ActionButton onClick={() => void load(filters)}>重试</ActionButton>}
          description={error ?? undefined}
          kind="error"
        />
      ) : null}

      {status === "ready" ? (
        items.length === 0 ? <PageState kind="empty" title="当前范围没有站点" /> : (
          <>
            <div className={styles.stationList}>
              {items.map((station) => (
                <article className={styles.stationRow} key={station.id}>
                  <span className={styles.stationMark} aria-hidden="true">{station.name.slice(0, 1)}</span>
                  <div className={styles.stationIdentity}>
                    <div><strong>{station.name}</strong><StatusBadge label={station.status === "ENABLED" ? "启用" : "停用"} status={station.status} /></div>
                    <span>{station.code} · {station.regionLabel || "未填写地区标识"}</span>
                    {station.remark === "" ? null : <small>{station.remark}</small>}
                  </div>
                  <div className={styles.stationFacts}>
                    <span><strong>{station.stationMasterCount}</strong><small>站长</small></span>
                    <span><strong>{station.memberCount}</strong><small>会员</small></span>
                  </div>
                  {canUpdate ? (
                    <div className={styles.rowActions}>
                      <button onClick={() => void openEdit(station)} type="button">编辑</button>
                      <button onClick={() => void openStatus(station)} type="button">
                        {station.status === "ENABLED" ? "停用" : "启用"}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            {hasMore && nextCursor !== null ? (
              <div className={styles.loadMore}>
                <ActionButton onClick={() => void load({ ...filters, cursor: nextCursor }, true)}>加载更多</ActionButton>
              </div>
            ) : null}
          </>
        )
      ) : null}

      <Dialog
        description="站点只记录站长归属和统计维度，不创建余额账户。"
        footer={<>
          <ActionButton disabled={submitting} onClick={() => setEditor(null)}>取消</ActionButton>
          <ActionButton disabled={submitting} form="station-editor" type="submit" variant="primary">
            {submitting ? "提交中" : editor?.uncertain ? "按原幂等键查询性重试" : "保存站点"}
          </ActionButton>
        </>}
        onClose={() => setEditor(null)}
        open={editor !== null}
        title={editor?.mode === "edit" ? "编辑站点" : "新增站点"}
      >
        {editor === null ? null : (
          <form className={styles.formGrid} id="station-editor" onSubmit={(event) => {
            event.preventDefault();
            void submitEditor();
          }}>
            {feedback === null ? null : <p className={`${styles.feedback} ${styles.span2}`} role="alert">{feedback}</p>}
            <label className={styles.field}>
              <span>站点名称</span>
              <input disabled={editor.uncertain} maxLength={80} onChange={(event) => setEditor((value) => value === null ? null : ({ ...value, name: event.target.value, idempotencyKey: newIntentKey(value.mode === "create" ? "createStation" : "updateStation") }))} required value={editor.name} />
            </label>
            <label className={styles.field}>
              <span>地区标识</span>
              <input disabled={editor.uncertain} maxLength={100} onChange={(event) => setEditor((value) => value === null ? null : ({ ...value, regionLabel: event.target.value, idempotencyKey: newIntentKey(value.mode === "create" ? "createStation" : "updateStation") }))} value={editor.regionLabel} />
            </label>
            <label className={`${styles.field} ${styles.span2}`}>
              <span>备注</span>
              <textarea disabled={editor.uncertain} maxLength={500} onChange={(event) => setEditor((value) => value === null ? null : ({ ...value, remark: event.target.value, idempotencyKey: newIntentKey(value.mode === "create" ? "createStation" : "updateStation") }))} value={editor.remark} />
            </label>
          </form>
        )}
      </Dialog>

      <Dialog
        description={statusEditor?.nextStatus === "DISABLED"
          ? "停用不会删除既有站长、会员或历史账务。"
          : "启用后站点可以重新接收新的站长和注册归属。"}
        footer={<>
          <ActionButton disabled={submitting} onClick={() => setStatusEditor(null)}>取消</ActionButton>
          <ActionButton disabled={submitting} form="station-status" type="submit" variant={statusEditor?.nextStatus === "DISABLED" ? "danger" : "primary"}>
            {submitting ? "提交中" : statusEditor?.uncertain ? "按原幂等键查询性重试" : "确认变更"}
          </ActionButton>
        </>}
        onClose={() => setStatusEditor(null)}
        open={statusEditor !== null}
        title={statusEditor?.nextStatus === "DISABLED" ? "停用站点" : "启用站点"}
      >
        {statusEditor === null ? null : (
          <form className={styles.formStack} id="station-status" onSubmit={(event) => { event.preventDefault(); void submitStatus(); }}>
            {feedback === null ? null : <p className={styles.feedback} role="alert">{feedback}</p>}
            <InlineNotice tone="warning">
              当前对象：{statusEditor.target.name}（{statusEditor.target.code}）。服务端会按最新版本复核状态。
            </InlineNotice>
            <label className={styles.field}>
              <span>变更原因</span>
              <textarea disabled={statusEditor.uncertain} minLength={2} maxLength={500} onChange={(event) => setStatusEditor((value) => value === null ? null : ({ ...value, reason: event.target.value, idempotencyKey: newIntentKey("changeStationStatus") }))} required value={statusEditor.reason} />
            </label>
          </form>
        )}
      </Dialog>
    </>
  );
}

function stationFilterValues(
  value: StationFilters,
  status: ToggleStatus | null = value.status ?? null,
): StationFilters {
  return {
    ...(value.keyword === undefined ? {} : { keyword: value.keyword }),
    ...(status === null ? {} : { status }),
  };
}
