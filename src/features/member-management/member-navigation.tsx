"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./member-management.module.css";

interface MemberNavItem {
  href: string;
  label: string;
  pageId: string;
  exact?: boolean;
}

const items: readonly MemberNavItem[] = [
  { href: "/members", label: "会员列表(修改)", pageId: "A18", exact: true },
  { href: "/members/vip", label: "VIP 配置", pageId: "A19" },
  { href: "/members/referrals", label: "推广配置", pageId: "A20" },
  { href: "/members/reports", label: "会员报表", pageId: "A21" },
];

export function MemberNavigation() {
  const pathname = usePathname();
  const detailActive = /^\/members\/[^/]+$/.test(pathname)
    && !items.some((item) => !item.exact && item.href === pathname);
  return (
    <nav aria-label="会员管理页面" className={styles.moduleNav}>
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href || detailActive
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            data-active={active || undefined}
            href={item.href}
            key={item.href}
          >
            <span>{item.pageId}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
