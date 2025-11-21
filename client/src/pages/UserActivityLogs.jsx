import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle, XCircle, Search, Filter, RefreshCw, Unlock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function UserActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    user_id: "",
    action_type: "all",
    ip_address: "",
    success: "all",
    start_date: "",
    end_date: "",
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
    fetchBlockedUsers();
  }, [page, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });

      if (filters.user_id) params.append("user_id", filters.user_id);
      if (filters.action_type && filters.action_type !== "all") params.append("action_type", filters.action_type);
      if (filters.ip_address) params.append("ip_address", filters.ip_address);
      if (filters.success && filters.success !== "all") params.append("success", filters.success);
      if (filters.start_date) params.append("start_date", filters.start_date);
      if (filters.end_date) params.append("end_date", filters.end_date);

      const response = await apiRequest("GET", `/api/activity-logs?${params.toString()}`);
      const data = await response.json();
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch activity logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      const response = await apiRequest("GET", "/api/users/blocked");
      const data = await response.json();
      setBlockedUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch blocked users:", error);
    }
  };

  const handleUnblock = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await apiRequest("POST", `/api/users/${selectedUser.id}/unblock`);
      if (response.ok) {
        toast({
          title: "Success",
          description: `User ${selectedUser.email} has been unblocked.`,
        });
        setUnblockDialogOpen(false);
        setSelectedUser(null);
        fetchBlockedUsers();
        fetchLogs();
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.message || "Failed to unblock user",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unblock user",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (success) => {
    if (success) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Success
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }
  };

  const getActionTypeColor = (actionType) => {
    if (actionType.includes("login")) return "text-blue-600";
    if (actionType.includes("logout")) return "text-gray-600";
    if (actionType.includes("create")) return "text-green-600";
    if (actionType.includes("update")) return "text-yellow-600";
    if (actionType.includes("delete")) return "text-red-600";
    return "text-gray-600";
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${month} ${day}, ${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return dateString;
    }
  };

  const handleResetFilters = () => {
    setFilters({
      user_id: "",
      action_type: "all",
      ip_address: "",
      success: "all",
      start_date: "",
      end_date: "",
    });
    setPage(1);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Activity Logs</h1>
          <p className="text-gray-500 mt-1">Monitor all user actions and system events</p>
        </div>
        <Button onClick={fetchLogs} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Blocked Users Alert */}
      {blockedUsers.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Blocked Users ({blockedUsers.length})</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              {blockedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between bg-red-50 p-2 rounded">
                  <div>
                    <span className="font-semibold">{user.email}</span>
                    {user.blocked_reason && (
                      <span className="text-sm text-gray-600 ml-2">- {user.blocked_reason}</span>
                    )}
                    {user.blocked_at && (
                      <span className="text-xs text-gray-500 ml-2">
                        (Blocked: {formatDate(user.blocked_at)})
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedUser(user);
                      setUnblockDialogOpen(true);
                    }}
                  >
                    <Unlock className="h-4 w-4 mr-1" />
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter activity logs by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">User ID</label>
              <Input
                placeholder="User ID"
                value={filters.user_id}
                onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Action Type</label>
              <Select
                value={filters.action_type}
                onValueChange={(value) => setFilters({ ...filters, action_type: value, page: 1 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="create_vehicle">Create Vehicle</SelectItem>
                  <SelectItem value="update_vehicle">Update Vehicle</SelectItem>
                  <SelectItem value="delete_vehicle">Delete Vehicle</SelectItem>
                  <SelectItem value="create_owner">Create Owner</SelectItem>
                  <SelectItem value="create_driver">Create Driver</SelectItem>
                  <SelectItem value="create_conductor">Create Conductor</SelectItem>
                  <SelectItem value="create_user">Create User</SelectItem>
                  <SelectItem value="update_user">Update User</SelectItem>
                  <SelectItem value="delete_user">Delete User</SelectItem>
                  <SelectItem value="verify_qr">QR Verification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">IP Address</label>
              <Input
                placeholder="IP Address"
                value={filters.ip_address}
                onChange={(e) => setFilters({ ...filters, ip_address: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select
                value={filters.success}
                onValueChange={(value) => setFilters({ ...filters, success: value, page: 1 })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Success</SelectItem>
                  <SelectItem value="false">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Start Date</label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value, page: 1 })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">End Date</label>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value, page: 1 })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={fetchLogs} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button onClick={handleResetFilters} variant="outline">
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            Total: {total} logs found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No activity logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        {log.user_id ? (
                          <span className="font-medium">User #{log.user_id}</span>
                        ) : (
                          <span className="text-gray-400">Anonymous</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${getActionTypeColor(log.action_type)}`}>
                          {log.action_type}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-md truncate" title={log.action_description}>
                        {log.action_description}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.ip_address}</TableCell>
                      <TableCell>{getStatusBadge(log.success)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={`text-sm ${log.response_status >= 400 ? "text-red-600" : "text-green-600"}`}>
                            {log.response_status}
                          </span>
                          {log.error_message && (
                            <span className="text-xs text-red-500 truncate max-w-xs" title={log.error_message}>
                              {log.error_message}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unblock User Dialog */}
      <Dialog open={unblockDialogOpen} onOpenChange={setUnblockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unblock User</DialogTitle>
            <DialogDescription>
              Are you sure you want to unblock {selectedUser?.email}? This will allow them to log in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnblockDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUnblock} variant="default">
              <Unlock className="h-4 w-4 mr-2" />
              Unblock User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

