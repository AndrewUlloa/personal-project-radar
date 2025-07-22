"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, ExternalLink, Globe } from "lucide-react";
import { LeadItem } from "@/lib/types";
import { useLeadRadar } from "@/lib/contexts/LeadRadarContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "../ui/DataTable";
import LeadDetailsDrawer from "./LeadDetailsDrawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LeadTable() {
  const { leads, updateLeadStatus, removeLead } = useLeadRadar();
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  const handleViewProfile = (leadId: string) => {
    setSelectedLeadId(leadId);
    setDetailsOpen(true);
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getARPUBandColor = (band: string) => {
    switch (band) {
      case 'High': return 'bg-green-100 text-green-800';
      case 'Mid': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatSizeRange = (size: number) => {
    if (size <= 10) return '1-10';
    if (size <= 50) return '11-50';
    if (size <= 200) return '51-200';
    if (size <= 1000) return '201-1K';
    return '1K+';
  };

  const columns: ColumnDef<LeadItem>[] = React.useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
          className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          aria-label="Select all rows"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(!!e.target.checked)}
          className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          aria-label={`Select row for ${row.original.companyName}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "companyName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-7 px-2 text-gray-700 font-medium text-xs"
        >
          Company
          <ArrowUpDown className="ml-1 h-2.5 w-2.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const lead = row.original;
        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">
                {lead.companyName.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 truncate text-sm">{lead.companyName}</div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Globe className="h-2.5 w-2.5" />
                <a 
                  href={`https://${lead.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:underline truncate max-w-24"
                >
                  {lead.website}
                </a>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "geoMarket",
      header: "Market",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs font-medium py-0 h-5">
          {row.getValue("geoMarket")}
        </Badge>
      ),
    },
    {
      accessorKey: "leadScore",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-7 px-2 text-gray-700 font-medium text-xs"
        >
          Health Score
          <ArrowUpDown className="ml-1 h-2.5 w-2.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const score = row.getValue("leadScore") as number;
        return (
          <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getHealthScoreColor(score)}`}>
            {score}
          </div>
        );
      },
    },
    {
      accessorKey: "arpuBand",
      header: "ARPU Band",
      cell: ({ row }) => {
        const band = row.getValue("arpuBand") as string;
        return (
          <Badge className={`${getARPUBandColor(band)} py-0 h-5 text-xs`}>
            {band}
          </Badge>
        );
      },
    },
    {
      accessorKey: "keySignals",
      header: "Key Signals",
      cell: ({ row }) => {
        const signals = row.getValue("keySignals") as string[];
        return (
          <div className="flex flex-wrap gap-1 max-w-40">
            {signals.slice(0, 2).map((signal, index) => (
              <Badge key={index} variant="outline" className="text-xs py-0 h-4">
                {signal}
              </Badge>
            ))}
            {signals.length > 2 && (
              <Badge variant="outline" className="text-xs py-0 h-4">
                +{signals.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "sizeFTE",
      header: "Size (FTE)",
      cell: ({ row }) => (
        <div className="text-xs text-gray-900 font-medium">
          {formatSizeRange(row.getValue("sizeFTE") as number)}
        </div>
      ),
    },
    {
      accessorKey: "lastActivity",
      header: "Last Activity",
      cell: ({ row }) => {
        const activity = row.getValue("lastActivity") as LeadItem['lastActivity'];
        return (
          <div className="text-xs">
            <div className="text-gray-900 truncate max-w-28 font-medium">{activity.description}</div>
            <div className="text-gray-500 text-xs">{activity.timeAgo}</div>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const lead = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-6 w-6 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleViewProfile(lead.id)}>
                View Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(lead.website)}
              >
                Copy Website
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => removeLead(lead.id)}
              >
                Remove from Radar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ], [updateLeadStatus, removeLead]);

  return (
    <>
      <DataTable columns={columns} data={leads} />
      <LeadDetailsDrawer
        leadId={selectedLeadId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  );
} 