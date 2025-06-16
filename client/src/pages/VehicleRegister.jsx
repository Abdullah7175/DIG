import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Truck, User, Users, FileUp, Check, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const vehicleSchema = z.object({
  vehicle_register_number: z.string().min(1, "Vehicle register number is required"),
  registration_region: z.string().min(1, "Registration region is required"),
  vehicle_owner_name_on_book: z.string().min(1, "Vehicle owner name on book is required"),
  book_number: z.string().min(1, "Book number is required"),
  engine_number: z.string().min(1, "Engine number is required"),
  chassis_number: z.string().min(1, "Chassis number is required"),
  make_company: z.string().min(1, "Make company is required"),
  model_number: z.string().min(1, "Model number is required"),
  seating_capacity: z.number().min(1, "Seating capacity is required"),
  vehicle_category: z.string().min(1, "Vehicle category is required"),
  vehicle_body_color: z.string().min(1, "Vehicle body color is required"),
  wheels: z.number().min(3, "Number of wheels is required"),
  passenger_doors_emergency_exit: z.string().optional(),
  fuel_type: z.string().min(1, "Fuel type is required"),
  terminal_name: z.string().optional(),
  route_number: z.string().optional(),
  route_name: z.string().optional(),
  route_area_via: z.string().optional(),
});

const ownerSchema = z.object({
  name: z.string().min(1, "Owner name is required"),
  cnic: z.string().min(13, "Valid CNIC is required"),
  contact: z.string().min(10, "Valid contact number is required"),
});

const driverSchema = z.object({
  name: z.string().min(1, "Driver name is required"),
  cnic: z.string().min(13, "Valid CNIC is required"),
  contact: z.string().min(10, "Valid contact number is required"),
  driving_license_number: z.string().min(1, "Driving license number is required"),
  driving_license_category: z.string().min(1, "Driving license category is required"),
  driving_license_expiry_date: z.string().min(1, "Driving license expiry date is required"),
});

const conductorSchema = z.object({
  name: z.string().min(1, "Conductor name is required"),
  cnic: z.string().min(13, "Valid CNIC is required"),
  contact: z.string().min(10, "Valid contact number is required"),
});

const formSchema = z.object({
  vehicle: vehicleSchema,
  owner: ownerSchema,
  driver: driverSchema,
  conductor: conductorSchema.optional(),
  documents: z.object({
    owner_cnic_copy: z.boolean().default(false),
    vehicle_registration_book: z.boolean().default(false),
    vehicle_picture: z.boolean().default(false),
    vehicle_fitness_certificate: z.boolean().default(false),
    conductor_cnic: z.boolean().default(false),
    route_permit: z.boolean().default(false),
    route_noc: z.boolean().default(false),
    driver_cnic_copy: z.boolean().default(false),
    owner_driving_license_copy: z.boolean().default(false),
    driver_picture: z.boolean().default(false),
    conductor_picture: z.boolean().default(false),
  }),
});

export default function VehicleRegister() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicle: {
        vehicle_register_number: "",
        registration_region: "",
        vehicle_owner_name_on_book: "",
        book_number: "",
        engine_number: "",
        chassis_number: "",
        make_company: "",
        model_number: "",
        seating_capacity: 1,
        vehicle_category: "",
        vehicle_body_color: "",
        wheels: 4,
        passenger_doors_emergency_exit: "",
        fuel_type: "",
        terminal_name: "",
        route_number: "",
        route_name: "",
        route_area_via: "",
      },
      owner: {
        name: "",
        cnic: "",
        contact: "",
      },
      driver: {
        name: "",
        cnic: "",
        contact: "",
        driving_license_number: "",
        driving_license_category: "",
        driving_license_expiry_date: "",
      },
      conductor: {
        name: "",
        cnic: "",
        contact: "",
      },
      documents: {
        owner_cnic_copy: false,
        vehicle_registration_book: false,
        vehicle_picture: false,
        vehicle_fitness_certificate: false,
        conductor_cnic: false,
        route_permit: false,
        route_noc: false,
        driver_cnic_copy: false,
        owner_driving_license_copy: false,
        driver_picture: false,
        conductor_picture: false,
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
    registerMutation.mutate(data);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <Truck className="text-white text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">COMMERCIAL VEHICLE INFORMATION-MANAGEMENT SYSTEM</h1>
            <p className="text-lg font-medium text-gray-700">CVI-MS Form</p>
            <p className="text-base text-gray-600">DIG Traffic Karachi</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Vehicle Details Section */}
          <div className="bg-black text-white p-4 rounded-t-lg">
            <h2 className="text-lg font-semibold text-center">VEHICLE DETAILS</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="vehicle_register_number">Vehicle Register Number *</Label>
                <Input
                  id="vehicle_register_number"
                  placeholder="ABC-1234"
                  {...form.register("vehicle.vehicle_register_number")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.vehicle_register_number && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.vehicle_register_number.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="registration_region">Registration Region *</Label>
                <Input
                  id="registration_region"
                  placeholder="Karachi"
                  {...form.register("vehicle.registration_region")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.registration_region && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.registration_region.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="vehicle_owner_name_on_book">Vehicle Owner Name (on book) *</Label>
                <Input
                  id="vehicle_owner_name_on_book"
                  placeholder="John Doe"
                  {...form.register("vehicle.vehicle_owner_name_on_book")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.vehicle_owner_name_on_book && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.vehicle_owner_name_on_book.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="book_number">Book Number *</Label>
                <Input
                  id="book_number"
                  placeholder="123456"
                  {...form.register("vehicle.book_number")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.book_number && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.book_number.message}
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

              <div>
                <Label htmlFor="chassis_number">Chassis Number *</Label>
                <Input
                  id="chassis_number"
                  placeholder="XYZ987654321"
                  {...form.register("vehicle.chassis_number")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.chassis_number && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.chassis_number.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="make_company">Make Company *</Label>
                <Input
                  id="make_company"
                  placeholder="Toyota"
                  {...form.register("vehicle.make_company")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.make_company && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.make_company.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="model_number">Model Number *</Label>
                <Input
                  id="model_number"
                  placeholder="Hiace 2024"
                  {...form.register("vehicle.model_number")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.model_number && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.model_number.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="seating_capacity">Seating Capacity *</Label>
                <Input
                  id="seating_capacity"
                  type="number"
                  placeholder="15"
                  {...form.register("vehicle.seating_capacity", { valueAsNumber: true })}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.seating_capacity && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.seating_capacity.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="vehicle_category">Vehicle Category *</Label>
                <Select
                  value={form.watch("vehicle.vehicle_category")}
                  onValueChange={(value) => form.setValue("vehicle.vehicle_category", value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="trailer">Trailer</SelectItem>
                    <SelectItem value="rickshaw">Rickshaw</SelectItem>
                    <SelectItem value="taxi">Taxi</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors?.vehicle?.vehicle_category && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.vehicle_category.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="vehicle_body_color">Vehicle Body Color *</Label>
                <Input
                  id="vehicle_body_color"
                  placeholder="White"
                  {...form.register("vehicle.vehicle_body_color")}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.vehicle_body_color && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.vehicle_body_color.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="wheels">Wheels *</Label>
                <Input
                  id="wheels"
                  type="number"
                  placeholder="4"
                  {...form.register("vehicle.wheels", { valueAsNumber: true })}
                  className="mt-2"
                />
                {form.formState.errors?.vehicle?.wheels && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.wheels.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="passenger_doors_emergency_exit">Passenger Doors / Emergency Exit</Label>
                <Input
                  id="passenger_doors_emergency_exit"
                  placeholder="2 doors, 1 emergency exit"
                  {...form.register("vehicle.passenger_doors_emergency_exit")}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="fuel_type">Fuel Type *</Label>
                <Select
                  value={form.watch("vehicle.fuel_type")}
                  onValueChange={(value) => form.setValue("vehicle.fuel_type", value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="cng">CNG</SelectItem>
                    <SelectItem value="electric">Electric</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors?.vehicle?.fuel_type && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.vehicle.fuel_type.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="terminal_name">Terminal Name</Label>
                <Input
                  id="terminal_name"
                  placeholder="Karachi Terminal"
                  {...form.register("vehicle.terminal_name")}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="route_number">Route Number</Label>
                <Input
                  id="route_number"
                  placeholder="W-11"
                  {...form.register("vehicle.route_number")}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="route_name">Route Name</Label>
                <Input
                  id="route_name"
                  placeholder="Saddar to Airport"
                  {...form.register("vehicle.route_name")}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="route_area_via">Route Area Via</Label>
                <Input
                  id="route_area_via"
                  placeholder="Shahrah-e-Faisal"
                  {...form.register("vehicle.route_area_via")}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          {/* Owner Details Section */}
          <div className="bg-black text-white p-4">
            <h2 className="text-lg font-semibold text-center">OWNER DETAILS</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <Label htmlFor="owner_cnic">CNIC# *</Label>
                <Input
                  id="owner_cnic"
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
                <Label htmlFor="owner_contact">Contact# *</Label>
                <Input
                  id="owner_contact"
                  placeholder="+92 300 1234567"
                  {...form.register("owner.contact")}
                  className="mt-2"
                />
                {form.formState.errors?.owner?.contact && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.owner.contact.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Driver Details Section */}
          <div className="bg-black text-white p-4">
            <h2 className="text-lg font-semibold text-center">DRIVER DETAILS</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="driver_name">Driver Name *</Label>
                <Input
                  id="driver_name"
                  placeholder="Ahmed Khan"
                  {...form.register("driver.name")}
                  className="mt-2"
                />
                {form.formState.errors?.driver?.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.driver.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="driver_cnic">CNIC# *</Label>
                <Input
                  id="driver_cnic"
                  placeholder="12345-6789012-3"
                  {...form.register("driver.cnic")}
                  className="mt-2"
                />
                {form.formState.errors?.driver?.cnic && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.driver.cnic.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="driver_contact">Contact# *</Label>
                <Input
                  id="driver_contact"
                  placeholder="+92 300 1234567"
                  {...form.register("driver.contact")}
                  className="mt-2"
                />
                {form.formState.errors?.driver?.contact && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.driver.contact.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="driving_license_number">Driving License Number *</Label>
                <Input
                  id="driving_license_number"
                  placeholder="KHI123456789"
                  {...form.register("driver.driving_license_number")}
                  className="mt-2"
                />
                {form.formState.errors?.driver?.driving_license_number && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.driver.driving_license_number.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="driving_license_category">Driving License Category *</Label>
                <Select
                  value={form.watch("driver.driving_license_category")}
                  onValueChange={(value) => form.setValue("driver.driving_license_category", value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LTV">LTV (Light Transport Vehicle)</SelectItem>
                    <SelectItem value="HTV">HTV (Heavy Transport Vehicle)</SelectItem>
                    <SelectItem value="PSV">PSV (Public Service Vehicle)</SelectItem>
                    <SelectItem value="MOTOR_CAR">Motor Car</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors?.driver?.driving_license_category && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.driver.driving_license_category.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="driving_license_expiry_date">Driving License Expiry Date *</Label>
                <Input
                  id="driving_license_expiry_date"
                  type="date"
                  {...form.register("driver.driving_license_expiry_date")}
                  className="mt-2"
                />
                {form.formState.errors?.driver?.driving_license_expiry_date && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.driver.driving_license_expiry_date.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Conductor Details Section */}
          <div className="bg-black text-white p-4">
            <h2 className="text-lg font-semibold text-center">CONDUCTOR / HELPER DETAILS</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="conductor_name">Helper Name</Label>
                <Input
                  id="conductor_name"
                  placeholder="Ali Hassan"
                  {...form.register("conductor.name")}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="conductor_cnic">CNIC#</Label>
                <Input
                  id="conductor_cnic"
                  placeholder="12345-6789012-3"
                  {...form.register("conductor.cnic")}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="conductor_contact">Contact#</Label>
                <Input
                  id="conductor_contact"
                  placeholder="+92 300 1234567"
                  {...form.register("conductor.contact")}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          {/* Document Checklist */}
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Required Documents Checklist</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { key: 'owner_cnic_copy', label: 'Owner CNIC Copy' },
                { key: 'vehicle_registration_book', label: 'Vehicle Registration Book Copy' },
                { key: 'vehicle_picture', label: 'Vehicle Picture' },
                { key: 'vehicle_fitness_certificate', label: 'Vehicle Fitness Certificate' },
                { key: 'conductor_cnic', label: 'Conductor CNIC' },
                { key: 'route_permit', label: 'Route Permit' },
                { key: 'route_noc', label: 'Route NOC' },
                { key: 'driver_cnic_copy', label: 'Driver CNIC Copy' },
                { key: 'owner_driving_license_copy', label: 'Owner Driving License Copy' },
                { key: 'driver_picture', label: 'Driver Picture' },
                { key: 'conductor_picture', label: 'Conductor Picture' },
              ].map((doc) => (
                <div key={doc.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={doc.key}
                    checked={form.watch(`documents.${doc.key}`)}
                    onCheckedChange={(checked) => 
                      form.setValue(`documents.${doc.key}`, checked)
                    }
                  />
                  <Label htmlFor={doc.key} className="text-sm">
                    {doc.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Confirmation */}
          <div className="p-6 border-t border-gray-200">
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">CONFIRMATION تصدیق</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                "I hereby confirm that the above information is correct and true. I understand that I am fully responsible for the accuracy of the information 
                provided in this declaration, and I accept any consequences that may arise if any of the information is found to be incorrect or false."
              </p>
              <p className="text-sm text-gray-700 mt-2 leading-relaxed" dir="rtl">
                میں اس بات کی تصدیق کرتا ہوں کہ اوپر دی گئی معلومات درست اور صحیح ہیں۔ میں سمجھتا ہوں کہ اس اعلان میں فراہم کردہ معلومات کی درستگی کے لیے میں مکمل طور پر ذمہ دار ہوں اور اگر کوئی بھی معلومات غلط یا جھوٹی پائی جائیں تو میں اس کے نتائج کو قبول کرتا ہوں۔
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <p>Applicant Signature & Stamp</p>
                <div className="border-b border-gray-300 w-48 mt-8"></div>
              </div>
              
              <div className="text-sm text-gray-600 text-right">
                <p>Dated</p>
                <div className="border-b border-gray-300 w-32 mt-8"></div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-8">
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
          </div>
        </form>
      </div>
    </main>
  );
}