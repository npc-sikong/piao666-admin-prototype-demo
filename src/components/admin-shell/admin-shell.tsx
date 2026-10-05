"use client";

import Link from "next/link";
import { redirect, usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { PageState } from "@/components/page-state/page-state";
import { ForcePasswordChangePage } from "@/features/employee-security/force-password-change-page";
import { MfaEnrollmentDialog } from "@/features/employee-security/mfa-enrollment-dialog";
import { adminApi } from "@/lib/api";
import { useAdminSession } from "@/session/admin-session";
import styles from "./admin-shell.module.css";

interface AdminShellProps {
  children: ReactNode;
}

interface NavigationItem {
  href: string;
  label: string;
  icon: IconName;
  permissions?: readonly string[];
}

interface NavigationGroup {
  label: string;
  items: readonly NavigationItem[];
}

type IconName =
  | "overview"
  | "catalog"
  | "issue"
  | "draw"
  | "omission"
  | "master"
  | "station"
  | "pool"
  | "member"
  | "order"
  | "ledger"
  | "security";

const navigation: readonly NavigationGroup[] = [
  {
    label: "版本",
    items: [{ href: "/version-changes", label: "版本修改说明(新增)", icon: "catalog" }],
  },
  {
    label: "运营",
    items: [
      { href: "/", label: "运营总览", icon: "overview" },
    ],
  },
  {
    label: "彩票数据",
    items: [
      {
        href: "/lottery/catalog",
        label: "目录与规则",
        icon: "catalog",
        permissions: ["lottery:data:view", "rule:view", "policy:view"],
      },
      {
        href: "/lottery/issues",
        label: "期次与日历",
        icon: "issue",
        permissions: ["lottery:data:view", "draw:fetch"],
      },
      {
        href: "/lottery/draws",
        label: "开奖候选与复核",
        icon: "draw",
        permissions: ["draw:review:view", "rule:view", "policy:view", "business-decision:view"],
      },
      {
        href: "/lottery/omissions",
        label: "遗漏数据健康",
        icon: "omission",
        permissions: ["lottery:data:view", "omission:rebuild"],
      },
    ],
  },
  {
    label: "业务管理",
    items: [
      { href: "/masters", label: "彩票大师", icon: "master", permissions: ["robot:view"] },
      {
        href: "/stations",
        label: "站点与站长",
        icon: "station",
        permissions: ["station:view", "station-master:view", "station-master:points:view", "report:view"],
      },
      {
        href: "/ai-pools",
        label: "AI合买(修改)",
        icon: "pool",
        permissions: ["ai-project:view", "ai-pool:view", "ai-payout:view", "report:view"],
      },
      {
        href: "/members",
        label: "会员管理(修改)",
        icon: "member",
        permissions: ["member:view", "vip:config:view", "referral:config:view", "report:view"],
      },
      {
        href: "/orders",
        label: "普通参与订单(修改)",
        icon: "order",
        permissions: ["order:view", "member:orders:view"],
      },
    ],
  },
  {
    label: "财务管理(新增)",
    items: [
      { href: "/finance/recharge-withdrawals", label: "充值提现报表(新增)", icon: "ledger", permissions: ["ledger:view", "report:view"] },
      { href: "/finance/member-changes", label: "会员帐变记录(新增)", icon: "ledger", permissions: ["ledger:view", "report:view"] },
      { href: "/finance/budget-flows", label: "预算收支报表(新增)", icon: "ledger", permissions: ["report:view"] },
      { href: "/finance/reconciliations", label: "对账异常报表(新增)", icon: "ledger", permissions: ["report:view"] },
    ],
  },
  {
    label: "运营报表(新增)",
    items: [
      { href: "/reports/business-daily", label: "经营日报(新增)", icon: "overview", permissions: ["report:view"] },
      { href: "/reports/station-business", label: "站点站长经营报表(新增)", icon: "station", permissions: ["report:view"] },
      { href: "/ai-pools/reports", label: "AI合买经营报表(修改)", icon: "pool", permissions: ["report:view"] },
      { href: "/reports/exception-backlog", label: "异常待办报表(新增)", icon: "security", permissions: ["report:view"] },
      { href: "/reports/ai-participations", label: "AI合买参与记录(新增)", icon: "pool", permissions: ["report:view"] },
      { href: "/reports/referrals", label: "会员推广记录(新增)", icon: "member", permissions: ["report:view"] },
      { href: "/reports/vip-upgrades", label: "VIP升级记录(新增)", icon: "member", permissions: ["report:view"] },
      { href: "/reports/member-bets", label: "会员投注记录(新增)", icon: "order", permissions: ["report:view"] },
    ],
  },
  {
    label: "财务与审计",
    items: [
      {
        href: "/ledger",
        label: "积分账本与对账(修改)",
        icon: "ledger",
        permissions: ["ledger:view", "report:view", "budget:view", "ledger:reverse", "ledger:reconcile"],
      },
      { href: "/employees", label: "权限与审计", icon: "security", permissions: ["employee:view", "audit:view"] },
    ],
  },
];

const shellFreeRoutes = ["/login", "/account-recovery"] as const;

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAdminSession();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);

  if (shellFreeRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return children;
  }

  if (session.status === "loading") {
    return (
      <main className={styles.gate}>
        <Brand />
        <PageState kind="loading" title="正在确认员工会话" />
      </main>
    );
  }

  if (session.status === "anonymous") {
    redirect("/login");
  }

  if (session.status === "password-change-required") {
    return <ForcePasswordChangePage />;
  }

  if (session.status === "error" || session.identity === null) {
    return (
      <main className={styles.gate}>
        <Brand />
        <PageState
          action={<button className={styles.gateAction} onClick={() => void session.refresh()} type="button">重新检查</button>}
          description={`员工会话读取失败${session.errorCode === null ? "" : `：${session.errorCode}`}。`}
          kind="error"
          title="无法进入运营后台"
        />
      </main>
    );
  }

  const identity = session.identity;
  const visibleNavigation = navigation.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSee(identity.permissions, item.permissions)),
  })).filter((group) => group.items.length > 0);
  const current = navigation.flatMap((group) => group.items)
    .find((item) => isActive(pathname, item.href));

  async function logout() {
    setLogoutError(null);
    setLoggingOut(true);
    try {
      await adminApi.request<void>("/api/admin/v1/auth/logout", { method: "POST" });
      session.clear();
      router.replace("/login");
    } catch {
      setLogoutError("退出失败，请保留当前页面后重试");
      setLoggingOut(false);
    }
  }

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <Brand compact />
        <nav className={styles.navigation} aria-label="运营后台主导航">
          {visibleNavigation.map((group) => (
            <section className={styles.navGroup} key={group.label}>
              <h2>{group.label}</h2>
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={styles.navLink}
                    data-active={active || undefined}
                    href={item.href}
                    key={item.href}
                  >
                    <NavigationIcon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </section>
          ))}
        </nav>
        <div className={styles.realmNote}>
          <span aria-hidden="true" />
          <p><strong>员工安全域</strong><small>权限与站点范围由服务端裁决</small></p>
        </div>
      </aside>
      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <div className={styles.location}>
            <span>运营后台</span>
            <b aria-hidden="true">/</b>
            <strong>{current?.label ?? "业务工作区"}</strong>
          </div>
          <div className={styles.account}>
            <div className={styles.accountCopy}>
              <strong>{identity.account}</strong>
              <small>
                {identity.scopeStationIds.length === 0 ? "全局或无站点范围" : `${identity.scopeStationIds.length} 个站点范围`}
                {identity.mfaEnrolled ? " · 动作 MFA 已绑定" : " · 尚未绑定动作 MFA"}
              </small>
            </div>
            <span className={styles.avatar} aria-hidden="true">{identity.account.slice(0, 1).toUpperCase()}</span>
            {identity.mfaEnrolled ? null : (
              <button onClick={() => setMfaDialogOpen(true)} type="button">绑定动作 MFA</button>
            )}
            <button disabled={loggingOut} onClick={() => void logout()} type="button">
              {loggingOut ? "退出中" : "退出"}
            </button>
          </div>
          {logoutError === null ? null : <p className={styles.logoutError} role="alert">{logoutError}</p>}
        </header>
        <main className={styles.content}>{children}</main>
      </div>
      <MfaEnrollmentDialog onClose={() => setMfaDialogOpen(false)} open={mfaDialogOpen} />
    </div>
  );
}

function Brand({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <Link className={styles.brand} data-compact={compact || undefined} href="/">
      <span className={styles.brandMark} aria-hidden="true">七码</span>
      <span className={styles.brandCopy}>
        <strong>数字彩积分</strong>
        <small>运营后台</small>
      </span>
    </Link>
  );
}

function canSee(
  employeePermissions: readonly string[],
  required: readonly string[] | undefined,
): boolean {
  return required === undefined || required.some((permission) => (
    employeePermissions.includes(permission)
  ));
}

function isActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationIcon({ name }: Readonly<{ name: IconName }>) {
  const paths: Readonly<Record<IconName, ReactNode>> = {
    overview: <><path d="M4 13h6V4H4zM14 20h6V11h-6zM4 20h6v-3H4zM14 7h6V4h-6z" /></>,
    catalog: <><path d="M5 4h14v16H5zM9 4v16M12 8h4M12 12h4" /></>,
    issue: <><path d="M5 6h14v14H5zM8 3v6M16 3v6M5 10h14" /></>,
    draw: <><circle cx="12" cy="12" r="8" /><path d="m9 12 2 2 4-5" /></>,
    omission: <><path d="M4 18 9 12l3 3 7-9M15 6h4v4" /></>,
    master: <><path d="m12 3 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z" /></>,
    station: <><path d="M4 20h16M6 20V8l6-4 6 4v12M10 20v-6h4v6" /></>,
    pool: <><path d="M5 7h14v12H5zM8 4h8v3M8 11h8M8 15h5" /></>,
    member: <><circle cx="12" cy="8" r="3" /><path d="M6 20c.5-4 2.5-6 6-6s5.5 2 6 6" /></>,
    order: <><path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" /></>,
    ledger: <><path d="M4 7h16M5 7l2-3h10l2 3v13H5zM9 11h6M9 15h6" /></>,
    security: <><path d="M12 3 5 6v5c0 4.5 2.5 7.7 7 10 4.5-2.3 7-5.5 7-10V6zM9 12l2 2 4-5" /></>,
  };
  return (
    <svg aria-hidden="true" className={styles.navIcon} fill="none" viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  );
}
