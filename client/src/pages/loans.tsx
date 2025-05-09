import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AppShell } from "@/components/layout/app-shell";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Landmark, Search, ArrowUpRight, Calendar, Tag, User } from "lucide-react";
import { LoanForm } from "@/components/loans/loan-form";
import { formatCurrency, formatDate, getInitials, getLoanStatusColor } from "@/lib/utils";
import { MobileBottomNav } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Loan {
  id: number;
  loanNumber: string;
  clientId: number;
  amount: string;
  startDate: string;
  endDate: string;
  interestRate: string;
  interestType: string;
  termLength: number;
  termUnit: string;
  repaymentFrequency: string;
  lateFeePercentage: string;
  preclosureFeePercentage: string;
  status: string;
  createdAt: string;
  clientName?: string;
}

export default function LoansPage() {
  const [isAddLoanModalOpen, setIsAddLoanModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch loans
  const { data: loansData = [], isLoading } = useQuery<Loan[]>({
    queryKey: ["/api/loans"],
    queryFn: async () => {
      const loansResponse = await fetch("/api/loans");
      if (!loansResponse.ok) {
        throw new Error("Failed to fetch loans");
      }
      
      const loans = await loansResponse.json();
      
      // Fetch client names for each loan
      const loansWithClientNames = await Promise.all(
        loans.map(async (loan: Loan) => {
          const clientResponse = await fetch(`/api/clients/${loan.clientId}`);
          
          if (clientResponse.ok) {
            const client = await clientResponse.json();
            return {
              ...loan,
              clientName: client.name,
            };
          }
          
          return {
            ...loan,
            clientName: "Unknown Client",
          };
        })
      );
      
      return loansWithClientNames;
    },
  });
  
  // Define columns for the data table
  const columns = [
    {
      accessorKey: "clientName",
      header: "Client",
      cell: ({ row }: any) => {
        const clientName = row.getValue("clientName") || "Unknown Client";
        return (
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700 mr-2">
              {getInitials(clientName)}
            </div>
            <span className="font-medium text-neutral-800">{clientName}</span>
          </div>
        );
      },
    },
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
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: any) => {
        const amount = row.getValue("amount");
        return <span className="font-medium">{formatCurrency(amount)}</span>;
      },
    },
    {
      accessorKey: "startDate",
      header: "Date",
      cell: ({ row }: any) => {
        const date = row.getValue("startDate");
        return date ? (
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-neutral-400" />
            <span>{formatDate(date)}</span>
          </div>
        ) : null;
      },
    },
    {
      accessorKey: "interestType",
      header: "Type",
      cell: ({ row }: any) => {
        const type = row.getValue("interestType");
        return type ? (
          <Badge variant="secondary">
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Badge>
        ) : null;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.getValue("status");
        return status ? (
          <Badge variant={getLoanStatusColor(status)}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        ) : null;
      },
    },
    {
      id: "actions",
      cell: ({ row }: any) => {
        const loan = row.original;
        return (
          <div className="flex items-center justify-end">
            <Link href={`/loans/${loan.id}`}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ArrowUpRight className="h-4 w-4" />
                <span className="sr-only">View details</span>
              </Button>
            </Link>
          </div>
        );
      },
    },
  ];

  // Filter loans based on search term and status
  const filteredLoans = loansData.filter((loan) => {
    const matchesSearch =
      (loan.loanNumber && loan.loanNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (loan.clientName && loan.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || loan.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleLoanFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
  };

  return (
    <AppShell title="Loans">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Loan Management</h1>
          <Button 
            onClick={() => setIsAddLoanModalOpen(true)} 
            className="flex items-center"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Loan
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>All Loans</CardTitle>
            <CardDescription>View and manage your loans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
                <Input
                  placeholder="Search loans by ID or client name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="defaulted">Defaulted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredLoans.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Landmark className="h-12 w-12 text-neutral-300 mb-2" />
                <h3 className="text-lg font-medium">No loans found</h3>
                {searchTerm || statusFilter !== "all" ? (
                  <p className="text-neutral-500 mt-1">
                    No loans match your search criteria
                  </p>
                ) : (
                  <p className="text-neutral-500 mt-1">
                    Add your first loan to get started
                  </p>
                )}
                <Button
                  onClick={() => setIsAddLoanModalOpen(true)}
                  variant="outline"
                  className="mt-4"
                >
                  Create Loan
                </Button>
              </div>
            ) : (
              <DataTable 
                columns={columns} 
                data={filteredLoans} 
                searchKey="loanNumber"
                searchPlaceholder="Search by loan ID..."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Loan Modal */}
      <LoanForm
        isOpen={isAddLoanModalOpen}
        onClose={() => setIsAddLoanModalOpen(false)}
        onSuccess={handleLoanFormSuccess}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        onNewLoan={() => setIsAddLoanModalOpen(true)}
        onNewPayment={() => {}}
      />
    </AppShell>
  );
}
