import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function UserVisibility() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [match, setMatch] = useState("all");
  const [page, setPage] = useState(1);
  const [confirmHide, setConfirmHide] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/vehicles/user-visibility", { search, visibility, match, page, limit: 50 }],
  });

  const summary = data?.summary;
  const vehicles = data?.vehicles || [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/vehicles/user-visibility"] });
    queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
  };

  const hideUnmatched = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/vehicles/hide-unmatched");
      return res.json();
    },
    onSuccess: (result) => {
      setConfirmHide(false);
      toast({
        title: "User list updated",
        description: result.message || `Hidden ${result.hiddenCount} vehicles from the user role`,
      });
      refresh();
    },
    onError: (err) => {
      toast({ title: "Could not hide vehicles", description: err.message, variant: "destructive" });
    },
  });

  const setVisibilityForOne = useMutation({
    mutationFn: async ({ id, hidden }) => {
      const res = await apiRequest("PATCH", `/api/vehicles/${id}/user-visibility`, { hidden });
      return res.json();
    },
    onSuccess: (result) => {
      toast({ title: "Updated", description: result.message });
      refresh();
    },
    onError: (err) => {
      toast({ title: "Could not update vehicle", description: err.message, variant: "destructive" });
    },
  });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Vehicle Visibility</h1>
        <p className="text-gray-600">
          Hide vehicles from the user role dashboard and vehicle list. Enable/Disable and QR blacklist stay unchanged.
          Admin and manager still see every registered vehicle.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Stat label="Registered" value={summary?.total} />
        <Stat label="Shown to user" value={summary?.visibleToUser} />
        <Stat label="Hidden from user" value={summary?.hiddenFromUser} />
        <Stat label="Matched on tracker" value={summary?.matched} />
        <Stat label="Not on tracker" value={summary?.unmatched} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-gray-900 mb-1">Hide vehicles that are not on the tracker</h2>
        <p className="text-sm text-gray-600 mb-4">
          One click hides every registered vehicle whose number is not in the tracker objects table. A match is the registration number against the tracker plate, ignoring spaces and dashes. Matched vehicles stay visible.
          This will hide {summary?.willHide ?? 0} vehicles from the user role. Nothing is deleted, and vehicle status is not changed.
        </p>
        {!confirmHide ? (
          <Button
            onClick={() => setConfirmHide(true)}
            disabled={!summary || summary.willHide === 0 || hideUnmatched.isPending}
          >
            <EyeOff className="h-4 w-4" />
            Hide unmatched from user
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-800">
              Hide {summary?.willHide ?? 0} unmatched vehicles from the user role?
            </span>
            <Button onClick={() => hideUnmatched.mutate()} disabled={hideUnmatched.isPending}>
              {hideUnmatched.isPending ? "Hiding..." : "Confirm"}
            </Button>
            <Button variant="outline" onClick={() => setConfirmHide(false)} disabled={hideUnmatched.isPending}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex flex-1 gap-2">
            <Input
              placeholder="Search registration number"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearch(searchInput.trim());
                  setPage(1);
                }
              }}
            />
            <Button
              variant="outline"
              onClick={() => {
                setSearch(searchInput.trim());
                setPage(1);
              }}
            >
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={visibility}
            onChange={(e) => {
              setVisibility(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All visibility</option>
            <option value="visible">Shown to user</option>
            <option value="hidden">Hidden from user</option>
          </select>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={match}
            onChange={(e) => {
              setMatch(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All tracker matches</option>
            <option value="matched">Matched on tracker</option>
            <option value="unmatched">Not on tracker</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-gray-500">Loading vehicles...</div>
        ) : error ? (
          <div className="p-8 text-red-600">Could not load vehicles. Run the database column update, then refresh.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Registration</th>
                  <th className="px-4 py-3 font-medium">Region</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Tracker API plate</th>
                  <th className="px-4 py-3 font-medium">Match</th>
                  <th className="px-4 py-3 font-medium">User role</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No vehicles found.</td>
                  </tr>
                ) : vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">{vehicle.vehicle_register_number}</td>
                    <td className="px-4 py-3">{vehicle.registration_region}</td>
                    <td className="px-4 py-3 capitalize">{vehicle.status}</td>
                    <td className="px-4 py-3">{vehicle.api_plate || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={vehicle.matched ? "text-green-700" : "text-gray-500"}>
                        {vehicle.matched ? "Matched" : "Not matched"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {vehicle.hidden_from_user ? "Hidden" : "Shown"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={setVisibilityForOne.isPending}
                        onClick={() => setVisibilityForOne.mutate({
                          id: vehicle.id,
                          hidden: !vehicle.hidden_from_user,
                        })}
                      >
                        {vehicle.hidden_from_user ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        {vehicle.hidden_from_user ? "Show to user" : "Hide from user"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
          <span>
            Page {data?.page || 1} of {data?.totalPages || 1} ({data?.total || 0} vehicles)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data || page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 mt-1">{value ?? "—"}</div>
    </div>
  );
}
