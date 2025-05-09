import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { insertLoanSchema } from "@shared/schema";
import { generateInstallmentSchedule } from "@/lib/calculations";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Extend the schema with additional validation
const loanFormSchema = z.object({
  clientId: z.string().refine((val) => !isNaN(parseInt(val)), {
    message: "Please select a client",
  }),
  amount: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: "Amount must be a positive number" }
  ),
  startDate: z.string().refine((val) => !!val, {
    message: "Please select a start date",
  }),
  termLength: z.string().refine(
    (val) => {
      const num = parseInt(val);
      return !isNaN(num) && num > 0;
    },
    { message: "Term length must be a positive number" }
  ),
  termUnit: z.enum(["days", "weeks", "months"]),
  interestRate: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    },
    { message: "Interest rate must be between 0 and 100" }
  ),
  interestType: z.enum(["flat", "reducing"]),
  repaymentFrequency: z.enum(["daily", "weekly", "monthly"]),
  lateFeePercentage: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    { message: "Late fee percentage must be positive" }
  ),
  preclosureFeePercentage: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    { message: "Preclosure fee percentage must be positive" }
  ),
});

type LoanFormValues = z.infer<typeof loanFormSchema>;

interface Client {
  id: number;
  name: string;
}

interface LoanFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LoanForm({ isOpen, onClose, onSuccess }: LoanFormProps) {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch("/api/clients");
      if (!response.ok) {
        throw new Error("Failed to fetch clients");
      }
      return response.json();
    },
  });
  
  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      clientId: "",
      amount: "",
      startDate: new Date().toISOString().substring(0, 10),
      termLength: "",
      termUnit: "months",
      interestRate: "",
      interestType: "flat",
      repaymentFrequency: "monthly",
      lateFeePercentage: "2",
      preclosureFeePercentage: "5",
    },
  });
  
  const { isSubmitting } = form.formState;
  
  const watchedValues = form.watch();
  
  const generatePreview = () => {
    try {
      const {
        amount,
        startDate,
        termLength,
        termUnit,
        interestRate,
        interestType,
        repaymentFrequency,
      } = watchedValues;
      
      if (
        !amount ||
        !startDate ||
        !termLength ||
        !termUnit ||
        !interestRate ||
        !interestType ||
        !repaymentFrequency
      ) {
        toast({
          title: "Incomplete data",
          description: "Please fill all required fields to generate preview",
          variant: "destructive",
        });
        return;
      }
      
      const installments = generateInstallmentSchedule(
        parseFloat(amount),
        new Date(startDate),
        parseFloat(interestRate),
        interestType,
        parseInt(termLength),
        termUnit,
        repaymentFrequency
      );
      
      setPreviewData(installments);
      setShowPreview(true);
    } catch (error) {
      console.error("Error generating preview:", error);
      toast({
        title: "Error",
        description: "Failed to generate payment schedule preview",
        variant: "destructive",
      });
    }
  };

  async function onSubmit(data: LoanFormValues) {
    try {
      // Convert the form data to the format expected by the API
      const loanData = {
        clientId: parseInt(data.clientId),
        amount: data.amount,
        startDate: new Date(data.startDate).toISOString(),
        endDate: calculateEndDate(
          new Date(data.startDate),
          parseInt(data.termLength),
          data.termUnit
        ).toISOString(),
        interestRate: data.interestRate,
        interestType: data.interestType,
        termLength: parseInt(data.termLength),
        termUnit: data.termUnit,
        repaymentFrequency: data.repaymentFrequency,
        lateFeePercentage: data.lateFeePercentage,
        preclosureFeePercentage: data.preclosureFeePercentage,
        status: 'active',
      };
      
      console.log("Submitting loan data:", loanData);
      
      const response = await apiRequest("POST", "/api/loans", loanData);
      const result = await response.json();
      console.log("Loan creation result:", result);
      
      toast({
        title: "Loan created",
        description: "The loan has been successfully created.",
      });
      
      form.reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error submitting form:", error);
      
      let errorMessage = "Failed to create loan. Please try again.";
      if (error && error.response) {
        try {
          const errorData = await error.response.json();
          errorMessage = errorData.message || errorData.details || errorMessage;
          console.log("Server error details:", errorData);
        } catch (e) {
          // If we can't parse the error response, use the default message
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }
  
  function calculateEndDate(
    startDate: Date,
    termLength: number,
    termUnit: string
  ): Date {
    const date = new Date(startDate);
    
    switch (termUnit) {
      case "days":
        date.setDate(date.getDate() + termLength);
        break;
      case "weeks":
        date.setDate(date.getDate() + termLength * 7);
        break;
      case "months":
        date.setMonth(date.getMonth() + termLength);
        break;
    }
    
    return date;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Loan</DialogTitle>
        </DialogHeader>
        
        {showPreview ? (
          <div className="space-y-4">
            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-2">Payment Schedule Preview</h3>
              <Table>
                <TableCaption>
                  This is a preview of the installment schedule.
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>No.</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((item) => (
                    <TableRow key={item.installmentNumber}>
                      <TableCell>{item.installmentNumber}</TableCell>
                      <TableCell>{formatDate(item.dueDate)}</TableCell>
                      <TableCell>{formatCurrency(item.principal)}</TableCell>
                      <TableCell>{formatCurrency(item.interest)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.totalDue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="mt-4 flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPreview(false)}
                >
                  Back to Form
                </Button>
                <Button onClick={form.handleSubmit(onSubmit)}>
                  Create Loan
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem
                              key={client.id}
                              value={client.id.toString()}
                            >
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Amount (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="termLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Term Length</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter term"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="termUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="months">Months</SelectItem>
                            <SelectItem value="weeks">Weeks</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="interestRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter rate"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="interestType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Interest Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="flat" id="flat" />
                            <Label htmlFor="flat">Flat</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="reducing" id="reducing" />
                            <Label htmlFor="reducing">Reducing</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="repaymentFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repayment Frequency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lateFeePercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Late Fee (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter late fee %"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="preclosureFeePercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preclosure Fee (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter preclosure fee %"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={generatePreview}
                  disabled={isSubmitting}
                >
                  Preview Schedule
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
