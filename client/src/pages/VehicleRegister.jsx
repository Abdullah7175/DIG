import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Truck, User, FileUp, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const vehicleSchema = z.object({
  registration_number: z.string().min(1, "Registration number is required"),
  vehicle_type: z.string().min(1, "Vehicle type is required"),
  make_model: z.string().min(1, "Make & model is required"),
  year: z.number().min(1990, "Year must be 1990 or later").max(new Date().getFullYear(), "Year cannot be in the future"),
  engine_number: z.string().min(1, "Engine number is required"),
});

const ownerSchema = z.object({
  name: z.string().min(1, "Owner name is required"),
  cnic: z.string().min(13, "Valid CNIC is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
});

const formSchema = z.object({
  vehicle: vehicleSchema,
  owner: ownerSchema,
});

export default function VehicleRegister() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicle: {
        registration_number: "",
        vehicle_type: "",
        make_model: "",
        year: new Date().getFullYear(),
        engine_number: "",
      },
      owner: {
        name: "",
        cnic: "",
        phone: "",
        email: "",
        address: "",
      },
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data) => apiRequest("POST", "/api/vehicles/register", data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vehicle registered successfully! Pending approval.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to register vehicle",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data) => {
    // Convert year to number
    const processedData = {
      ...data,
      vehicle: {
        ...data.vehicle,
        year: parseInt(data.vehicle.year),
      },
    };
    registerMutation.mutate(processedData);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Vehicle Registration</h2>
        <p className="text-gray-600">Register a new heavy vehicle in the system</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vehicle Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Truck className="mr-2 text-primary" />
                Vehicle Information
              </h3>
              
              <div>
                <Label htmlFor="registration_number">Vehicle Registration Number *</Label>
                <Input
                  id="registration_number"
                  placeholder="ABC-1234"
                  {...form.register("vehicle.registration_number")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.registration_number && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.registration_number.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="vehicle_type">Vehicle Type *</Label>
                <Select
                  value={form.watch("vehicle.vehicle_type")}
                  onValueChange={(value) => form.setValue("vehicle.vehicle_type", value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="truck">Heavy Truck</SelectItem>
                    <SelectItem value="trailer">Trailer</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="construction">Construction Vehicle</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors?.vehicle?.vehicle_type && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.vehicle_type.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="make_model">Make & Model *</Label>
                <Input
                  id="make_model"
                  placeholder="Mercedes Actros 2542"
                  {...form.register("vehicle.make_model")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.make_model && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.make_model.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="year">Year of Manufacture *</Label>
                <Input
                  id="year"
                  type="number"
                  placeholder="2023"
                  min="1990"
                  max={new Date().getFullYear()}
                  {...form.register("vehicle.year", { valueAsNumber: true })}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.year && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.year.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="engine_number">Engine Number *</Label>
                <Input
                  id="engine_number"
                  placeholder="ABC123456789"
                  {...form.register("vehicle.engine_number")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.engine_number && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.engine_number.message}
                  </p>
                )}
              </div>
            </div>

            {/* Owner Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="mr-2 text-primary" />
                Owner Information
              </h3>
              
              <div>
                <Label htmlFor="owner_name">Owner Name *</Label>
                <Input
                  id="owner_name"
                  placeholder="John Doe"
                  {...form.register("owner.name")}
                  className="mt-2"
                />
                {form.formState.errors?.owner?.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.owner.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="cnic">CNIC Number *</Label>
                <Input
                  id="cnic"
                  placeholder="12345-6789012-3"
                  {...form.register("owner.cnic")}
                  className="mt-2"
                />
                {form.formState.errors?.owner?.cnic && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.owner.cnic.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Contact Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+92 300 1234567"
                  {...form.register("owner.phone")}
                  className="mt-2"
                />
                {form.formState.errors?.owner?.phone && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.owner.phone.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="owner@example.com"
                  {...form.register("owner.email")}
                  className="mt-2"
                />
                {form.formState.errors?.owner?.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.owner.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  placeholder="Complete address"
                  {...form.register("owner.address")}
                  className="mt-2"
                  rows={3}
                />
                {form.formState.errors?.owner?.address && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.owner.address.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Document Upload */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileUp className="mr-2 text-primary" />
              Required Documents
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <FileUp className="text-3xl text-gray-400 mb-3 mx-auto" />
                <p className="text-sm font-medium text-gray-900">Vehicle Registration Book</p>
                <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Max 5MB)</p>
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                <button type="button" className="mt-3 text-primary hover:text-primary/80 text-sm font-medium">
                  Browse Files
                </button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <FileUp className="text-3xl text-gray-400 mb-3 mx-auto" />
                <p className="text-sm font-medium text-gray-900">Owner CNIC Copy</p>
                <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Max 2MB)</p>
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                <button type="button" className="mt-3 text-primary hover:text-primary/80 text-sm font-medium">
                  Browse Files
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline">
              Save as Draft
            </Button>
            <Button 
              type="submit" 
              disabled={registerMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {registerMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Submit for Approval
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
