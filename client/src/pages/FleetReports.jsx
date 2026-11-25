import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Gauge, RefreshCw, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getUser } from "@/lib/utils";

const FLEET_COLUMNS = [
  "S.No",
  "Vehicle Number",
  "Engine Number",
  "Chassis Number",
  "Vehicle Type",
  "Vehicle Model",
  "Vehicle Make",
  "Vehicle Color",
  "Owner Detail",
  "CNIC Number",
  "Mobile Number",
  "Complete Address",
  "Installation Date",
  "Status",
  "Service Tenure",
  "Lat, Long",
  "Last Date & Time",
];

const OVERSPEED_COLUMNS = [
  "Date",
  "Vehicle Number",
  "Engine Number",
  "Chassis Number",
  "Vehicle Type",
  "Vehicle Model",
  "Vehicle Make",
  "Owner Detail",
  "CNIC Number",
  "Mobile Number",
  "Complete Address",
  "Installation/Renewal Date",
  "Company Name",
  "Start",
  "End",
  "Duration",
  "Top Speed",
  "Average Speed",
  "Overspeed Position",
];

function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultOverspeedRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);
  return {
    start_date: toLocalInputValue(start),
    end_date: toLocalInputValue(end),
  };
}

function ReportTable({
  columns,
  rows,
  emptyText,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = total === 0 ? 0 : (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, total);
  const pageRows = rows.slice(startIdx, endIdx);

  useEffect(() => {
    if (page !== safePage) onPageChange(safePage);
  }, [page, safePage, onPageChange]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {total === 0
            ? "No rows"
            : `Showing ${startIdx + 1}-${endIdx} of ${total} rows`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-sm text-gray-600">Rows per page</Label>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              onPageSizeChange(parseInt(value, 10));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="text-sm text-gray-700 px-1">
            Page {safePage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Both horizontal and vertical scroll */}
      <div className="overflow-x-auto overflow-y-auto border rounded-md max-h-[60vh]">
        <table className="min-w-max w-full text-sm border-collapse">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {columns.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left font-medium whitespace-nowrap border-b bg-gray-50"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, idx) => (
              <tr key={`${safePage}-${startIdx + idx}`} className="border-t hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 whitespace-nowrap align-top">
                    {row[col] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
            {!pageRows.length && (
              <tr>
                <td className="px-3 py-6 text-gray-500" colSpan={columns.length}>
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FleetReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [range, setRange] = useState(defaultOverspeedRange);
  const [fleetPage, setFleetPage] = useState(1);
  const [fleetPageSize, setFleetPageSize] = useState(50);
  const [overspeedPage, setOverspeedPage] = useState(1);
  const [overspeedPageSize, setOverspeedPageSize] = useState(50);
  const user = getUser();
  const canManageSync = user && (String(user.role) === "1" || String(user.role) === "2");
  const canPurge = user && String(user.role) === "1";

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/fleet-reports/status"],
    refetchInterval: 60_000,
  });

  const syncObjectsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/fleet-reports/sync-objects");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Object sync failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Fleet objects synced",
        description: `Upserted ${data.upserted}, matched ${data.matched}, removed ${data.removed || 0}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fleet-reports/status"] });
    },
    onError: (error) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
  });

  const syncOverspeedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/fleet-reports/sync-overspeed");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Overspeed sync failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Overspeed poll done",
        description: `Inserted ${data.inserted}, skipped ${data.skipped}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fleet-reports/status"] });
    },
    onError: (error) => {
      toast({ title: "Poll failed", description: error.message, variant: "destructive" });
    },
  });

  const purgeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/fleet-reports/purge-events");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Purge failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Purge completed", description: `Deleted ${data.deleted} old event rows` });
      queryClient.invalidateQueries({ queryKey: ["/api/fleet-reports/status"] });
    },
    onError: (error) => {
      toast({ title: "Purge failed", description: error.message, variant: "destructive" });
    },
  });

  const overspeedQuery = useQuery({
    queryKey: ["/api/fleet-reports/overspeed", range],
    enabled: false,
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: range.start_date,
        end_date: range.end_date,
      });
      const res = await fetch(`/api/fleet-reports/overspeed?${params}`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to load overspeed report");
      }
      return res.json();
    },
  });

  const fleetPreviewQuery = useQuery({
    queryKey: ["/api/fleet-reports/fleet-status"],
    enabled: false,
    queryFn: async () => {
      const res = await fetch("/api/fleet-reports/fleet-status", { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to load fleet status");
      }
      return res.json();
    },
  });

  const fleetRows = useMemo(() => fleetPreviewQuery.data?.rows || [], [fleetPreviewQuery.data]);
  const overspeedRows = useMemo(() => overspeedQuery.data?.rows || [], [overspeedQuery.data]);

  const exportFleet = () => {
    window.location.href = "/api/fleet-reports/fleet-status/export";
  };

  const exportOverspeed = () => {
    const params = new URLSearchParams({
      start_date: range.start_date,
      end_date: range.end_date,
    });
    window.location.href = `/api/fleet-reports/overspeed/export?${params}`;
  };

  const loadFleetPreview = async () => {
    setFleetPage(1);
    await fleetPreviewQuery.refetch();
  };

  const loadOverspeedPreview = async () => {
    setOverspeedPage(1);
    await overspeedQuery.refetch();
  };

  return (
    <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-start mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fleet Reports</h1>
          <p className="text-gray-600 mt-2">
            DIG vehicle details + ESSPL tracker objects/events. Old Tracking Events page is unchanged.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetchStatus()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh status
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tracker objects</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {statusLoading ? "…" : status?.objectCount ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Event cache (≤3 days)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {statusLoading ? "…" : status?.eventCount ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scheduler</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {status?.scheduler?.running ? "Running" : "Stopped"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Retention</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {status?.retentionDays ?? 3} days
          </CardContent>
        </Card>
      </div>

      {canManageSync && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Manual sync</CardTitle>
            <CardDescription>
              Background jobs also run automatically (objects every 15 min, overspeed every 2 min, purge at night).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => syncObjectsMutation.mutate()} disabled={syncObjectsMutation.isPending}>
              <Truck className="h-4 w-4 mr-2" />
              {syncObjectsMutation.isPending ? "Syncing…" : "Sync fleet objects"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => syncOverspeedMutation.mutate()}
              disabled={syncOverspeedMutation.isPending}
            >
              <Gauge className="h-4 w-4 mr-2" />
              {syncOverspeedMutation.isPending ? "Polling…" : "Poll overspeed now"}
            </Button>
            {canPurge && (
              <Button
                variant="outline"
                onClick={() => purgeMutation.mutate()}
                disabled={purgeMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {purgeMutation.isPending ? "Purging…" : "Purge events older than 3 days"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="fleet">
        <TabsList>
          <TabsTrigger value="fleet">Total Fleet Status</TabsTrigger>
          <TabsTrigger value="overspeed">Overspeed Report</TabsTrigger>
        </TabsList>

        <TabsContent value="fleet" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Total Fleet Status</CardTitle>
                <CardDescription>
                  From USER_GET_OBJECTS + DIG vehicle/owner/payment details. Scroll right to see all columns.
                </CardDescription>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  onClick={loadFleetPreview}
                  disabled={fleetPreviewQuery.isFetching}
                >
                  {fleetPreviewQuery.isFetching ? "Loading…" : "Preview"}
                </Button>
                <Button onClick={exportFleet}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ReportTable
                columns={FLEET_COLUMNS}
                rows={fleetRows}
                emptyText="Click Preview or run Sync fleet objects first."
                page={fleetPage}
                pageSize={fleetPageSize}
                onPageChange={setFleetPage}
                onPageSizeChange={setFleetPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overspeed" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Overspeed Report</CardTitle>
              <CardDescription>
                Only speeds above the API config threshold are stored. Ranges older than 3 days are
                fetched on demand, then nightly purge removes them again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <Label>Start</Label>
                  <Input
                    type="datetime-local"
                    value={range.start_date}
                    onChange={(e) => setRange((p) => ({ ...p, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End</Label>
                  <Input
                    type="datetime-local"
                    value={range.end_date}
                    onChange={(e) => setRange((p) => ({ ...p, end_date: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={loadOverspeedPreview}
                    disabled={overspeedQuery.isFetching}
                  >
                    {overspeedQuery.isFetching ? "Loading…" : "Preview"}
                  </Button>
                  <Button onClick={exportOverspeed}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {overspeedQuery.error && (
                <p className="text-sm text-red-600">{overspeedQuery.error.message}</p>
              )}

              <ReportTable
                columns={OVERSPEED_COLUMNS}
                rows={overspeedRows}
                emptyText="Choose a date range and click Preview."
                page={overspeedPage}
                pageSize={overspeedPageSize}
                onPageChange={setOverspeedPage}
                onPageSizeChange={setOverspeedPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
