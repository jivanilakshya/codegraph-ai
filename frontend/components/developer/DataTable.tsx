"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

export type DataColumn<Row> = {
  key: string;
  label: string;
  className?: string;
  value: (row: Row) => string | number | null | undefined;
  render: (row: Row) => ReactNode;
};

type DataTableProps<Row> = {
  columns: DataColumn<Row>[];
  emptyMessage: string;
  getRowKey: (row: Row) => string | number;
  rows: Row[];
};

export function DataTable<Row>({ columns, emptyMessage, getRowKey, rows }: DataTableProps<Row>) {
  const [sortKey, setSortKey] = useState(columns[0]?.key ?? "");
  const [sortDirection, setSortDirection] = useState<"ascending" | "descending">("ascending");
  const [page, setPage] = useState(0);
  const pageSize = 8;
  const activeColumn = columns.find((column) => column.key === sortKey) ?? columns[0];
  const sortedRows = useMemo(() => {
    if (!activeColumn) return rows;
    return [...rows].sort((first, second) => {
      const firstValue = activeColumn.value(first) ?? "";
      const secondValue = activeColumn.value(second) ?? "";
      const comparison = typeof firstValue === "number" && typeof secondValue === "number"
        ? firstValue - secondValue
        : String(firstValue).localeCompare(String(secondValue));
      return sortDirection === "ascending" ? comparison : -comparison;
    });
  }, [activeColumn, rows, sortDirection]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = sortedRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const handleSort = (columnKey: string) => {
    setPage(0);
    if (sortKey === columnKey) {
      setSortDirection((value) => value === "ascending" ? "descending" : "ascending");
      return;
    }
    setSortKey(columnKey);
    setSortDirection("ascending");
  };

  if (!rows.length) return <div className="grid min-h-36 place-items-center p-6 text-center text-sm text-slate-500">{emptyMessage}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-y border-slate-800 bg-slate-900/40 text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr>{columns.map((column) => <th key={column.key} scope="col" className={`whitespace-nowrap px-4 py-3 font-semibold ${column.className ?? ""}`}><button type="button" onClick={() => handleSort(column.key)} className="inline-flex items-center gap-1 hover:text-cyan-300"><span>{column.label}</span>{sortKey === column.key && (sortDirection === "ascending" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}</button></th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">{pageRows.map((row) => <tr key={getRowKey(row)} className="transition-colors hover:bg-slate-900/45">{columns.map((column) => <td key={column.key} className={`whitespace-nowrap px-4 py-3.5 text-slate-300 ${column.className ?? ""}`}>{column.render(row)}</td>)}</tr>)}</tbody>
      </table>
      {totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-xs text-slate-500"><span>Page {currentPage + 1} of {totalPages}</span><div className="flex gap-2"><button type="button" disabled={!currentPage} onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded border border-slate-700 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40 hover:border-cyan-500/60">Previous</button><button type="button" disabled={currentPage >= totalPages - 1} onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))} className="rounded border border-slate-700 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40 hover:border-cyan-500/60">Next</button></div></div>}
    </div>
  );
}
