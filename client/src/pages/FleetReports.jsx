import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, RefreshCw, Gauge, Truck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

export default function FleetReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [range, setRange] = useState(defaultOverspeedRange);

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
        description: `Upserted ${data.upserted}, matched ${data.matched}`,
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

  const previewRows = useMemo(() => {
    const rows = fleetPreviewQuery.data?.rows || [];
    return rows.slice(0, 20);
  }, [fleetPreviewQuery.data]);

  const overspeedPreview = useMemo(() => {
    const rows = overspeedQuery.data?.rows || [];
    return rows.slice(0, 20);
  }, [overspeedQuery.data]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <Button
            variant="outline"
            onClick={() => purgeMutation.mutate()}
            disabled={purgeMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {purgeMutation.isPending ? "Purging…" : "Purge events older than 3 days"}
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="fleet">
        <TabsList>
          <TabsTrigger value="fleet">Total Fleet Status</TabsTrigger>
          <TabsTrigger value="overspeed">Overspeed Report</TabsTrigger>
        </TabsList>

        <TabsContent value="fleet" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Total Fleet Status</CardTitle>
                <CardDescription>
                  From USER_GET_OBJECTS + DIG vehicle/owner/payment details. Opens as CSV in Excel.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fleetPreviewQuery.refetch()}
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
              {fleetPreviewQuery.data && (
                <p className="text-sm text-gray-600 mb-3">
                  Showing {previewRows.length} of {fleetPreviewQuery.data.count} rows
                </p>
              )}
              <div className="overflow-auto border rounded-md max-h-[480px]">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {["S.No", "Vehicle Number", "Status", "Lat, Long", "Last Date & Time", "Owner Detail"].map(
                        (h) => (
                          <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => (
                      <tr key={`${row["S.No"]}-${row["Vehicle Number"]}`} className="border-t">
                        <td className="px-3 py-2">{row["S.No"]}</td>
                        <td className="px-3 py-2">{row["Vehicle Number"]}</td>
                        <td className="px-3 py-2">{row.Status}</td>
                        <td className="px-3 py-2">{row["Lat, Long"]}</td>
                        <td className="px-3 py-2">{row["Last Date & Time"]}</td>
                        <td className="px-3 py-2">{row["Owner Detail"]}</td>
                      </tr>
                    ))}
                    {!previewRows.length && (
                      <tr>
                        <td className="px-3 py-6 text-gray-500" colSpan={6}>
                          Click Preview or run Sync fleet objects first.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
                    onClick={() => overspeedQuery.refetch()}
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

              {overspeedQuery.data && (
                <p className="text-sm text-gray-600">
                  Showing {overspeedPreview.length} of {overspeedQuery.data.count} rows
                </p>
              )}

              <div className="overflow-auto border rounded-md max-h-[480px]">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {[
                        "Date",
                        "Vehicle Number",
                        "Start",
                        "End",
                        "Duration",
                        "Top Speed",
                        "Average Speed",
                        "Overspeed Position",
                      ].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overspeedPreview.map((row, idx) => (
                      <tr key={`${row["Vehicle Number"]}-${row.Start}-${idx}`} className="border-t">
                        <td className="px-3 py-2">{row.Date}</td>
                        <td className="px-3 py-2">{row["Vehicle Number"]}</td>
                        <td className="px-3 py-2">{row.Start}</td>
                        <td className="px-3 py-2">{row.End}</td>
                        <td className="px-3 py-2">{row.Duration}</td>
                        <td className="px-3 py-2">{row["Top Speed"]}</td>
                        <td className="px-3 py-2">{row["Average Speed"]}</td>
                        <td className="px-3 py-2">{row["Overspeed Position"]}</td>
                      </tr>
                    ))}
                    {!overspeedPreview.length && (
                      <tr>
                        <td className="px-3 py-6 text-gray-500" colSpan={8}>
                          Choose a date range and click Preview.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
