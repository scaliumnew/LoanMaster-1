import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AppShell } from "@/components/layout/app-shell";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Wallet, Search, ArrowUpRight, Calendar, Landmark } from "lucide-react";
import { PaymentForm } from "@/components/payments/payment-form";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MobileBottomNav } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Payment {
  id: number;
  loanId: number;
  installmentId: number | null;
  amount: string;
  paymentDate: string;
  paymentType: string;
  paymentMethod: string;
  lateFee: string;
  preclosureFee: string;
  notes: string | null;
  createdAt: string;
  loanNumber?: string;
  clientName?: string;
}

export default function PaymentsPage() {
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all payments across all loans
  const { data: paymentsData = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    queryFn: async () => {
      // First get all loans to access payments
      const loansResponse = await fetch("/api/loans");
      if (!loansResponse.ok) {
        throw new Error("Failed to fetch loans");
      }
      
      const loans = await loansResponse.json();
      
      // Get all payments for each loan
      const allPaymentsPromises = loans.map(async (loan: any) => {
        const paymentsResponse = await fetch(`/api/loans/${loan.id}/payments`);
        if (!paymentsResponse.ok) {
          return [];
        }
        
        const payments = await paymentsResponse.json();
        
        // Fetch client name
        const clientResponse = await fetch(`/api/clients/${loan.clientId}`);
        const client = clientResponse.ok ? await clientResponse.json() : { name: "Unknown Client" };
        
        // Add loan number and client name to each payment
        return payments.map((payment: Payment) => ({
          ...payment,
          loanNumber: loan.loanNumber,
          clientName: client.name,
        }));
      });
      
      const allPaymentsArrays = await Promise.all(allPaymentsPromises);
      
      // Flatten the array of arrays into a single array and sort by date descending
      return allPaymentsArrays
        .flat()
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    },
  });
  
  // Define columns for the data table
  const columns = [
    {
      accessorKey: "loanNumber",
      header: "Loan ID",
      cell: ({ row }: any) => {
        const loanNumber = row.getValue("loanNumber");
        return (
          <div className="flex items-center">
            <Landmark className="h-4 w-4 mr-2 text-neutral-400" />
            <span className="text-neutral-600">{loanNumber}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "clientName",
      header: "Client",
      cell: ({ row }: any) => {
        return <span className="font-medium">{row.getValue("clientName")}</span>;
      },
    },
    {
      accessorKey: "paymentDate",
      header: "Date",
      cell: ({ row }: any) => {
        const date = row.getValue("paymentDate");
        return (
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-neutral-400" />
            <span>{formatDate(date)}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: any) => {
        const amount = row.getValue("amount");
        return <span className="font-medium">{formatCurrency(amount)}</span>;
      },
    },
    {
      accessorKey: "paymentType",
      header: "Type",
      cell: ({ row }: any) => {
        const type = row.getValue("paymentType");
        return (
          <Badge variant="secondary">
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }: any) => {
        const method = row.getValue("paymentMethod");
        const formattedMethod = method
          .split("_")
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        
        return (
          <div className="flex items-center">
            <Wallet className="h-4 w-4 mr-2 text-neutral-400" />
            <span>{formattedMethod}</span>
          </div>
        );
      },
    },
    {
      id: "totalAmount",
      header: "Total Amount",
      cell: ({ row }: any) => {
        const amount = parseFloat(row.getValue("amount") || 0);
        const lateFee = parseFloat(row.original.lateFee || 0);
        const preclosureFee = parseFloat(row.original.preclosureFee || 0);
        
        const totalAmount = amount + lateFee + preclosureFee;
        
        return <span className="font-bold">{formatCurrency(totalAmount)}</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }: any) => {
        const payment = row.original;
        return (
          <div className="flex items-center justify-end">
            <Link href={`/loans/${payment.loanId}`}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ArrowUpRight className="h-4 w-4" />
                <span className="sr-only">View loan</span>
              </Button>
            </Link>
          </div>
        );
      },
    },
  ];

  // Filter payments based on search term and type
  const filteredPayments = paymentsData.filter((payment) => {
    const matchesSearch =
      (payment.loanNumber && payment.loanNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.clientName && payment.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === "all" || payment.paymentType === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const handlePaymentFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
  };

  return (
    <AppShell title="Payments">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Payment Records</h1>
          <Button 
            onClick={() => setIsAddPaymentModalOpen(true)} 
            className="flex items-center"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>All Payments</CardTitle>
            <CardDescription>View all payment records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
                <Input
                  placeholder="Search by loan ID or client name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select
                value={typeFilter}
                onValueChange={setTypeFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="preclosure">Preclosure</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredPayments.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Wallet className="h-12 w-12 text-neutral-300 mb-2" />
                <h3 className="text-lg font-medium">No payments found</h3>
                {searchTerm || typeFilter !== "all" ? (
                  <p className="text-neutral-500 mt-1">
                    No payments match your search criteria
                  </p>
                ) : (
                  <p className="text-neutral-500 mt-1">
                    Record your first payment to get started
                  </p>
                )}
                <Button
                  onClick={() => setIsAddPaymentModalOpen(true)}
                  variant="outline"
                  className="mt-4"
                >
                  Record Payment
                </Button>
              </div>
            ) : (
              <DataTable 
                columns={columns} 
                data={filteredPayments} 
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Payment Modal */}
      <PaymentForm
        isOpen={isAddPaymentModalOpen}
        onClose={() => setIsAddPaymentModalOpen(false)}
        onSuccess={handlePaymentFormSuccess}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        onNewLoan={() => {}}
        onNewPayment={() => setIsAddPaymentModalOpen(true)}
      />
    </AppShell>
  );
}
