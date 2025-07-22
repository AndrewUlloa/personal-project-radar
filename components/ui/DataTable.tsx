"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Download } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

    const exportToCSV = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const rowsToExport = selectedRows.length > 0 ? selectedRows : table.getFilteredRowModel().rows;
    
    if (rowsToExport.length === 0) {
      return;
    }

    // Get visible columns (excluding select and actions columns)
    const visibleColumns = table.getVisibleLeafColumns().filter(col => 
      col.id !== 'select' && col.id !== 'actions'
    );
    
    // Create Clay-optimized CSV headers
    const headers = visibleColumns.map(column => {
      // Use clean, Clay-friendly column names matching new order
      const columnMap: Record<string, string> = {
        'companyName': 'Company Name',
        'geoMarket': 'Market',
        'leadScore': 'Health Score',
        'arpuBand': 'ARPU Band',
        'keySignals': 'Key Signals',
        'sizeFTE': 'Size (FTE)',
        'lastActivity': 'Last Activity'
      };
      
      return columnMap[column.id] || column.id;
    });

    // Create CSV rows optimized for Clay import
    const csvRows = rowsToExport.map(row => {
      return visibleColumns.map(column => {
        const original = row.original as any;
        let cellValue: any;
        
        // Handle nested properties and complex data types
        switch (column.id) {
          case 'companyName':
            cellValue = original.companyName;
            break;
          case 'geoMarket':
            cellValue = original.geoMarket;
            break;
          case 'leadScore':
            cellValue = original.leadScore;
            break;
          case 'arpuBand':
            cellValue = original.arpuBand;
            break;
          case 'keySignals':
            // Join array values for CSV
            cellValue = Array.isArray(original.keySignals) 
              ? original.keySignals.join('; ') 
              : original.keySignals;
            break;
          case 'sizeFTE':
            cellValue = original.sizeFTE;
            break;
          case 'lastActivity':
            cellValue = original.lastActivity?.description || '';
            break;
          default:
            cellValue = row.getValue(column.id);
        }
        
        // Format for Clay compatibility
        if (typeof cellValue === 'number') {
          return cellValue.toString();
        }
        
        if (Array.isArray(cellValue)) {
          return `"${cellValue.join('; ')}"`;
        }
        
        // Clean string formatting for Clay
        const stringValue = String(cellValue || '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
    });

    // Add Clay metadata header comment
    const clayMetadata = `# Nivoda Lead Export - ${new Date().toLocaleDateString()}\n# Exported ${rowsToExport.length} leads for Clay enrichment\n`;
    const csvContent = clayMetadata + [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');

    // Create and download file with Clay-friendly naming
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = selectedRows.length > 0 
      ? `nivoda-leads-selected-${timestamp}.csv`
      : `nivoda-leads-all-${timestamp}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Filter leads..."
            value={(table.getColumn("companyName")?.getFilterValue() as string) ?? ""}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              table.getColumn("companyName")?.setFilterValue(event.target.value)
            }
            className="max-w-sm h-8"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="h-8"
            disabled={table.getFilteredRowModel().rows.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
            {table.getFilteredSelectedRowModel().rows.length > 0 && (
              <span className="ml-1 text-xs">
                ({table.getFilteredSelectedRowModel().rows.length})
              </span>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200/60 bg-white/60 backdrop-blur-sm">
        <Table className="table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="h-9">
                {headerGroup.headers.map((header) => {
                  const isSelectColumn = header.column.id === 'select';
                  return (
                    <TableHead 
                      key={header.id} 
                      className={`text-gray-700 ${isSelectColumn ? 'w-12' : 'w-[14.28%]'}`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-gray-50/60 h-9"
                >
                  {row.getVisibleCells().map((cell) => {
                    const isSelectColumn = cell.column.id === 'select';
                    return (
                      <TableCell 
                        key={cell.id} 
                        className={isSelectColumn ? 'w-12' : 'w-[14.28%]'}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow className="h-9">
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="text-gray-500">No leads in radar</div>
                    <div className="text-sm text-gray-400">
                      Discover leads from search to get started
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-gray-600">
          {table.getFilteredSelectedRowModel().rows.length > 0 ? (
            <>
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </>
          ) : (
            <>
              Showing {table.getFilteredRowModel().rows.length} lead(s).
            </>
          )}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
} 