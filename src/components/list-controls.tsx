import { useEffect, useState } from 'react';
import { ActionButton } from '@/components/admin-workspace/admin-workspace';
import { reportFile } from '@/demo/export-file';
import styles from '@/features/operational-reports/operational-reports.module.css';

export function ListPagination({ count, page, size, onPage, onSize }: { count: number; page: number; size: number; onPage: (page: number) => void; onSize: (size: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / size));
  const selected = pages <= 12 ? Array.from({ length: pages }, (_, i) => i + 1) : [...new Set([1, 2, 3, page - 1, page, page + 1, pages - 1, pages])].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
  return <div className={styles.pagination}>
    <label className={styles.pageSize}>每页展示<select value={size} onChange={e => onSize(Number(e.target.value))}>{[10, 20, 40, 60, 80, 100].map(n => <option key={n} value={n}>{n} 条</option>)}</select></label>
    <span>共 {count} 条 · {count ? (page - 1) * size + 1 : 0}–{Math.min(page * size, count)} 条</span>
    <nav className={styles.pageNumbers} aria-label="列表分页"><button disabled={page === 1} onClick={() => onPage(page - 1)}>上一页</button>{selected.map((n, i) => <span key={n}>{i > 0 && n - selected[i - 1] > 1 ? <span>… </span> : null}<button aria-current={n === page ? 'page' : undefined} data-active={n === page} onClick={() => onPage(n)}>{n}</button></span>)}<button disabled={page === pages} onClick={() => onPage(page + 1)}>下一页</button><button disabled={page === pages} onClick={() => onPage(pages)}>最后一页</button></nav>
    <label className={styles.jump}>选择第几页<select disabled={!count} value={page} onChange={e => onPage(Number(e.target.value))}>{Array.from({ length: pages }, (_, i) => <option key={i + 1} value={i + 1}>第 {i + 1} 页</option>)}</select></label>
  </div>;
}
export function ListExport({ rows, name }: { rows: string[][]; name: string }) {
  const [file, setFile] = useState<{ url: string; format: string; count: number } | null>(null);
  useEffect(() => () => { if (file) URL.revokeObjectURL(file.url); }, [file]);
  useEffect(() => { setFile(null); }, [JSON.stringify(rows)]);
  return <div className={styles.actions}>{(['CSV', 'XLSX'] as const).map(format => <ActionButton key={format} disabled={rows.length <= 1} onClick={() => setFile({ url: URL.createObjectURL(reportFile(rows, format)), format, count: rows.length - 1 })}>导出 {format}</ActionButton>)}
    {file ? <span className={styles.caption} role="status">已生成全部 {file.count} 条记录，<a className={styles.link} href={file.url} download={`${name}.${file.format.toLowerCase()}`}>下载 {file.format}</a></span> : null}
  </div>;
}
