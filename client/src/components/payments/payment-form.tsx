import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { calculateLateFee, calculatePreclosureFee } from "@/lib/calculations";

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
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Payment form schema
const paymentFormSchema = z.object({
  loanId: z.string().refine((val) => !isNaN(parseInt(val)), {
    message: "Please select a loan",
  }),
  installmentId: z.string().optional(),
  amount: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: "Amount must be a positive number" }
  ),
  paymentDate: z.string().refine((val) => !!val, {
    message: "Please select a payment date",
  }),
  paymentType: z.enum(["regular", "preclosure"]),
  paymentMethod: z.enum(["cash", "bank_transfer", "upi", "cheque"]),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface LoanOption {
  id: number;
  loanNumber: string;
  clientName: string;
}

interface InstallmentOption {
  id: number;
  installmentNumber: number;
  dueDate: string;
  totalDue: string;
  remainingAmount: string;
  status: string;
}

interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialLoanId?: number;
  initialInstallmentId?: number;
}

export function PaymentForm({
  isOpen,
  onClose,
  onSuccess,
  initialLoanId,
  initialInstallmentId,
}: PaymentFormProps) {
  const { toast } = useToast();
  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    initialLoanId ? initialLoanId.toString() : ""
  );

  const [calculatedFees, setCalculatedFees] = useState<{
    lateFee: number;
    preclosureFee: number;
    remainingAmount: number;
    isLate: boolean;
  }>({
    lateFee: 0,
    preclosureFee: 0,
    remainingAmount: 0,
    isLate: false,
  });

  // Fetch all loans with client names
  const { data: loansWithClients = [] } = useQuery<LoanOption[]>({
    queryKey: ["/api/loans"],
    queryFn: async () => {
      const loansResponse = await fetch("/api/loans");
      if (!loansResponse.ok) {
        throw new Error("Failed to fetch loans");
      }
      const loans = await loansResponse.json();

      // Fetch client names for each loan
      const loansWithClientNames = await Promise.all(
        loans.map(async (loan: any) => {
          const clientResponse = await fetch(`/api/clients/${loan.clientId}`);
          const client = await clientResponse.json();
          return {
            id: loan.id,
            loanNumber: loan.loanNumber,
            clientName: client.name,
          };
        })
      );

      return loansWithClientNames;
    },
  });

  // Fetch installments for selected loan
  const { data: installments = [] } = useQuery<InstallmentOption[]>({
    queryKey: [`/api/loans/${selectedLoanId}/installments`],
    queryFn: async () => {
      const response = await fetch(`/api/loans/${selectedLoanId}/installments`);
      if (!response.ok) {
        throw new Error("Failed to fetch installments");
      }
      return response.json();
    },
    enabled: !!selectedLoanId,
  });

  // Fetch loan details for the selected loan
  const { data: selectedLoan } = useQuery({
    queryKey: [`/api/loans/${selectedLoanId}`],
    queryFn: async () => {
      const response = await fetch(`/api/loans/${selectedLoanId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch loan details");
      }
      return response.json();
    },
    enabled: !!selectedLoanId,
  });

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      loanId: initialLoanId ? initialLoanId.toString() : "",
      installmentId: initialInstallmentId ? initialInstallmentId.toString() : "",
      amount: "",
      paymentDate: new Date().toISOString().substring(0, 10),
      paymentType: "regular",
      paymentMethod: "cash",
      notes: "",
    },
  });

  // Set initial loan and installment when props change
  useEffect(() => {
    if (initialLoanId) {
      form.setValue("loanId", initialLoanId.toString());
      setSelectedLoanId(initialLoanId.toString());
    }
    if (initialInstallmentId) {
      form.setValue("installmentId", initialInstallmentId.toString());
    }
  }, [initialLoanId, initialInstallmentId, form]);

  // Update amount field with the remaining amount of the selected installment
  useEffect(() => {
    const installmentId = form.watch("installmentId");
    const paymentType = form.watch("paymentType");
    
    if (installmentId && installments.length > 0) {
      const selectedInstallment = installments.find(
        (inst) => inst.id.toString() === installmentId
      );
      
      if (selectedInstallment) {
        form.setValue("amount", selectedInstallment.remainingAmount);
      }
    } else if (paymentType === "preclosure" && selectedLoan) {
      // For preclosure, calculate total remaining principal
      const pendingInstallments = installments.filter(
        (inst) => inst.status !== "paid"
      );
      
      const totalRemaining = pendingInstallments.reduce(
        (sum, inst) => sum + parseFloat(inst.remainingAmount),
        0
      );
      
      form.setValue("amount", totalRemaining.toString());
    }
  }, [form.watch("installmentId"), form.watch("paymentType"), installments, selectedLoan, form]);

  // Calculate fees based on form values
  useEffect(() => {
    const calculateFees = async () => {
      const installmentId = form.watch("installmentId");
      const paymentType = form.watch("paymentType");
      const paymentDate = form.watch("paymentDate");
      const amount = form.watch("amount");

      if (!selectedLoan || !paymentDate || !amount) return;

      let lateFee = 0;
      let preclosureFee = 0;
      let remainingAmount = 0;
      let isLate = false;

      // Calculate late fee if an installment is selected
      if (installmentId && paymentType === "regular") {
        const selectedInstallment = installments.find(
          (inst) => inst.id.toString() === installmentId
        );

        if (selectedInstallment) {
          const dueDate = new Date(selectedInstallment.dueDate);
          const paymentDateObj = new Date(paymentDate);
          
          if (paymentDateObj > dueDate) {
            lateFee = calculateLateFee(
              parseFloat(selectedInstallment.totalDue),
              parseFloat(selectedLoan.lateFeePercentage),
              dueDate,
              paymentDateObj
            );
            isLate = true;
          }
          
          remainingAmount = parseFloat(selectedInstallment.remainingAmount);
        }
      }

      // Calculate preclosure fee
      if (paymentType === "preclosure") {
        const pendingInstallments = installments.filter(
          (inst) => inst.status !== "paid"
        );
        
        const totalRemainingPrincipal = pendingInstallments.reduce(
          (sum, inst) => sum + parseFloat(inst.remainingAmount),
          0
        );
        
        preclosureFee = calculatePreclosureFee(
          totalRemainingPrincipal,
          parseFloat(selectedLoan.preclosureFeePercentage)
        );
        
        remainingAmount = totalRemainingPrincipal;
      }

      setCalculatedFees({
        lateFee,
        preclosureFee,
        remainingAmount,
        isLate,
      });
    };

    calculateFees();
  }, [
    form.watch("installmentId"),
    form.watch("paymentType"),
    form.watch("paymentDate"),
    form.watch("amount"),
    selectedLoan,
    installments,
  ]);

  // Handle loan selection change
  const handleLoanChange = (value: string) => {
    setSelectedLoanId(value);
    form.setValue("loanId", value);
    form.setValue("installmentId", "");
  };

  // Handle form submission
  async function onSubmit(data: PaymentFormValues) {
    try {
      // Convert the form data to the format expected by the API
      const paymentData = {
        loanId: parseInt(data.loanId),
        installmentId: data.installmentId ? parseInt(data.installmentId) : undefined,
        amount: data.amount,
        paymentDate: new Date(data.paymentDate).toISOString(),
        paymentType: data.paymentType,
        paymentMethod: data.paymentMethod,
        notes: data.notes || undefined,
      };

      await apiRequest("POST", "/api/payments", paymentData);

      toast({
        title: "Payment recorded",
        description: "The payment has been successfully recorded.",
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [`/api/loans/${data.loanId}/installments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/loans/${data.loanId}/payments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/loans/${data.loanId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });

      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    }
  }

  const totalPayable = 
    parseFloat(form.watch("amount") || "0") + 
    calculatedFees.lateFee + 
    calculatedFees.preclosureFee;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="loanId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loan</FormLabel>
                  <Select
                    onValueChange={(value) => handleLoanChange(value)}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select loan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loansWithClients.map((loan) => (
                        <SelectItem key={loan.id} value={loan.id.toString()}>
                          {loan.loanNumber} ({loan.clientName})
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
              name="paymentType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Payment Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="regular" id="regular" />
                        <Label htmlFor="regular">Regular Payment</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="preclosure" id="preclosure" />
                        <Label htmlFor="preclosure">Preclosure</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("paymentType") === "regular" && (
              <FormField
                control={form.control}
                name="installmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Installment</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select installment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {installments
                          .filter((inst) => inst.status !== "paid")
                          .map((installment) => (
                            <SelectItem
                              key={installment.id}
                              value={installment.id.toString()}
                            >
                              Installment #{installment.installmentNumber} -{" "}
                              {formatCurrency(installment.totalDue)} (
                              {new Date(installment.dueDate).toLocaleDateString()})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter amount"
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
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fee Breakdown */}
            {selectedLoanId && (
              <div className="border rounded-md p-4 bg-neutral-50">
                <h3 className="font-medium text-sm mb-2">Payment Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base Amount:</span>
                    <span>
                      {formatCurrency(form.watch("amount") || "0")}
                    </span>
                  </div>

                  {calculatedFees.isLate && (
                    <div className="flex justify-between text-destructive">
                      <span className="flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Late Fee:
                      </span>
                      <span>{formatCurrency(calculatedFees.lateFee)}</span>
                    </div>
                  )}

                  {form.watch("paymentType") === "preclosure" && (
                    <div className="flex justify-between">
                      <span>Preclosure Fee:</span>
                      <span>
                        {formatCurrency(calculatedFees.preclosureFee)}
                      </span>
                    </div>
                  )}

                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Total Payable:</span>
                    <span>{formatCurrency(totalPayable)}</span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? "Processing..."
                  : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
