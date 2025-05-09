import React, { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AppShell } from "@/components/layout/app-shell";
import { LoanDetails } from "@/components/loans/loan-details";
import { PaymentForm } from "@/components/payments/payment-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function LoanDetailsPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/loans/:id");
  const loanId = params ? parseInt(params.id) : 0;
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<number | undefined>(undefined);

  // Fetch loan details
  const { data: loan, isLoading } = useQuery({
    queryKey: [`/api/loans/${loanId}`],
    queryFn: async () => {
      const response = await fetch(`/api/loans/${loanId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch loan details");
      }
      return response.json();
    },
    enabled: !!loanId,
  });

  const handleRecordPayment = (installmentId?: number) => {
    setSelectedInstallmentId(installmentId);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    // Refresh data
    queryClient.invalidateQueries({ queryKey: [`/api/loans/${loanId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/loans/${loanId}/installments`] });
    queryClient.invalidateQueries({ queryKey: [`/api/loans/${loanId}/payments`] });
  };

  if (isLoading) {
    return (
      <AppShell title="Loan Details">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/loans")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Loans
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          
          <Skeleton className="h-[400px]" />
        </div>
      </AppShell>
    );
  }

  if (!loan) {
    return (
      <AppShell title="Loan Not Found">
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-2xl font-bold mb-4">Loan Not Found</h2>
          <p className="text-neutral-500 mb-6">
            The loan you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/loans")}>Return to Loans</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Loan Details: ${loan.loanNumber}`}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate("/loans")} className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Loans
          </Button>
        </div>

        <LoanDetails 
          loanId={loanId} 
          onRecordPayment={handleRecordPayment} 
        />
      </div>

      {/* Payment Modal */}
      <PaymentForm
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedInstallmentId(undefined);
        }}
        onSuccess={handlePaymentSuccess}
        initialLoanId={loanId}
        initialInstallmentId={selectedInstallmentId}
      />
    </AppShell>
  );
}
