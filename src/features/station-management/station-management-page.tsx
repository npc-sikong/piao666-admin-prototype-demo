"use client";

import { useState } from "react";
import {
  InlineNotice,
  PageHeader,
  Panel,
  Tabs,
} from "@/components/admin-workspace/admin-workspace";
import { useAdminSession } from "@/session/admin-session";
import { LedgerReportTab } from "./ledger-report-tab";
import { StationMastersTab } from "./station-masters-tab";
import { StationsTab } from "./stations-tab";
import styles from "./station-management.module.css";

type WorkspaceTab = "masters" | "stations" | "ledger";

export function StationManagementPage() {
  const session = useAdminSession();
  const [tab, setTab] = useState<WorkspaceTab>("masters");
  const permissions = session.identity?.permissions ?? [];

  return (
    <>
      <PageHeader
        description="站点只记录管理归属；站长额度、会员积分和平台预算分别由服务端账本维护。"
        pageId="A09—A12"
        title="站点与站长"
      />

      <InlineNotice title="业务边界" tone="info">
        站长使用用户端账号登录，不拥有运营后台权限；任何额度变化只在正式命令返回账本回执后展示，密码从不回显。
      </InlineNotice>

      <Panel flush title="站点与站长工作区">
        <Tabs<WorkspaceTab>
          items={[
            { id: "masters", label: "站长管理" },
            { id: "stations", label: "站点管理" },
            { id: "ledger", label: "额度流水与报表" },
          ]}
          label="站点与站长视图"
          onChange={setTab}
          value={tab}
        />
        <div className={styles.tabContent}>
          {tab === "masters" ? <StationMastersTab permissions={permissions} /> : null}
          {tab === "stations" ? <StationsTab permissions={permissions} /> : null}
          {tab === "ledger" ? <LedgerReportTab permissions={permissions} /> : null}
        </div>
      </Panel>
    </>
  );
}
