import React from 'react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No records found for current criteria.',
  loading = false,
  className = '',
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="w-full border border-[#E5E5E0] rounded-[6px] bg-white p-12 text-center">
        <div className="inline-block animate-spin h-6 w-6 text-[#0F766E] border-2 border-current border-t-transparent rounded-full mb-2"></div>
        <p className="text-xs text-[#73757C]">Loading records...</p>
      </div>
    );
  }

  return (
    <div className={`w-full overflow-x-auto border border-[#E5E5E0] rounded-[6px] bg-white shadow-xs ${className}`}>
      <table className="w-full text-left border-collapse text-xs">
        <thead className="bg-[#F8F8F6] text-[#4A4B4F] border-b border-[#E5E5E0] sticky top-0 z-10 font-semibold tracking-wide">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`py-2.5 px-3 whitespace-nowrap ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                } ${col.width || ''} ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EBEBE6] text-[#17181A]">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 px-4 text-center text-xs text-[#73757C]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors duration-100 ${
                  onRowClick ? 'cursor-pointer hover:bg-[#F9F9F7] active:bg-[#F2F2EE]' : ''
                }`}
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className={`py-2.5 px-3 tabular-nums ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.className || ''}`}
                  >
                    {col.cell ? col.cell(row, rowIdx) : (col.accessorKey ? String(row[col.accessorKey] ?? '') : null)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
