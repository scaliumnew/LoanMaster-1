import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, getInitials, getLoanStatusColor, getInstallmentStatusColor } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Wallet, PlusCircle } from "lucide-react";

interface LoanDetailsProps {
  loanId: number;
  onRecordPayment: (installmentId?: number) => void;
}

export function LoanDetails({ loanId, onRecordPayment }: LoanDetailsProps) {
  // Fetch loan details
  const { data: loan, isLoading: isLoadingLoan } = useQuery({
    queryKey: [`/api/loans/${loanId}`],
    queryFn: async () => {
      const res = await fetch(`/api/loans/${loanId}`);
      if (!res.ok) throw new Error('Failed to fetch loan details');
      return res.json();
    },
  });
  
  // Fetch client details
  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: [`/api/clients/${loan?.clientId}`],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${loan.clientId}`);
      if (!res.ok) throw new Error('Failed to fetch client details');
      return res.json();
    },
    enabled: !!loan,
  });
  
  // Fetch installments
  const { data: installments = [], isLoading: isLoadingInstallments } = useQuery({
    queryKey: [`/api/loans/${loanId}/installments`],
    queryFn: async () => {
      const res = await fetch(`/api/loans/${loanId}/installments`);
      if (!res.ok) throw new Error('Failed to fetch installments');
      return res.json();
    },
    enabled: !!loanId,
  });
  
  // Fetch payments
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: [`/api/loans/${loanId}/payments`],
    queryFn: async () => {
      const res = await fetch(`/api/loans/${loanId}/payments`);
      if (!res.ok) throw new Error('Failed to fetch payments');
      return res.json();
    },
    enabled: !!loanId,
  });
  
  if (isLoadingLoan || (loan && isLoadingClient)) {
    return <LoadingLoanDetails />;
  }
  
  if (!loan || !client) {
    return <div>Failed to load loan details</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-neutral-50">
          <CardContent className="p-4">
            <h4 className="text-sm text-neutral-500 mb-1">Client</h4>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700 mr-2">
                {getInitials(client.name)}
              </div>
              <span className="font-medium text-neutral-800">{client.name}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-neutral-50">
          <CardContent className="p-4">
            <h4 className="text-sm text-neutral-500 mb-1">Loan Amount</h4>
            <p className="text-lg font-bold text-neutral-800">
              {formatCurrency(loan.amount)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-neutral-50">
          <CardContent className="p-4">
            <h4 className="text-sm text-neutral-500 mb-1">Status</h4>
            <Badge variant={getLoanStatusColor(loan.status)}>
              {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
            </Badge>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <h4 className="text-sm text-neutral-500 mb-1">Start Date</h4>
          <p className="text-neutral-800">{formatDate(loan.startDate)}</p>
        </div>
        <div>
          <h4 className="text-sm text-neutral-500 mb-1">End Date</h4>
          <p className="text-neutral-800">{formatDate(loan.endDate)}</p>
        </div>
        <div>
          <h4 className="text-sm text-neutral-500 mb-1">Interest Rate</h4>
          <p className="text-neutral-800">
            {loan.interestRate}% ({loan.interestType.charAt(0).toUpperCase() + loan.interestType.slice(1)})
          </p>
        </div>
        <div>
          <h4 className="text-sm text-neutral-500 mb-1">Term</h4>
          <p className="text-neutral-800">
            {loan.termLength} {loan.termUnit}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h4 className="text-sm text-neutral-500 mb-1">Repayment Frequency</h4>
          <p className="text-neutral-800">
            {loan.repaymentFrequency.charAt(0).toUpperCase() + loan.repaymentFrequency.slice(1)}
          </p>
        </div>
        <div>
          <h4 className="text-sm text-neutral-500 mb-1">Late Fee</h4>
          <p className="text-neutral-800">{loan.lateFeePercentage}% per day</p>
        </div>
        <div>
          <h4 className="text-sm text-neutral-500 mb-1">Preclosure Fee</h4>
          <p className="text-neutral-800">{loan.preclosureFeePercentage}% of remaining principal</p>
        </div>
      </div>
      
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-neutral-800">Repayment Schedule</h3>
          <Button 
            onClick={() => onRecordPayment()} 
            className="flex items-center"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Record Payment
          </Button>
        </div>
        
        {isLoadingInstallments ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className="text-neutral-500">No.</TableHead>
                  <TableHead className="text-neutral-500">Due Date</TableHead>
                  <TableHead className="text-neutral-500">Principal</TableHead>
                  <TableHead className="text-neutral-500">Interest</TableHead>
                  <TableHead className="text-neutral-500">Total Due</TableHead>
                  <TableHead className="text-neutral-500">Status</TableHead>
                  <TableHead className="text-neutral-500">Remaining</TableHead>
                  <TableHead className="text-neutral-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((installment) => (
                  <TableRow key={installment.id} className="hover:bg-neutral-50">
                    <TableCell>{installment.installmentNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-neutral-400" />
                        {formatDate(installment.dueDate)}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(installment.principal)}</TableCell>
                    <TableCell>{formatCurrency(installment.interest)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(installment.totalDue)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getInstallmentStatusColor(installment.status)}>
                        {installment.status.charAt(0).toUpperCase() + installment.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(installment.remainingAmount)}</TableCell>
                    <TableCell>
                      {installment.status !== 'paid' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onRecordPayment(installment.id)}
                        >
                          Pay
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      
      <div className="mt-8">
        <h3 className="text-lg font-medium text-neutral-800 mb-4">Payment History</h3>
        
        {isLoadingPayments ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : payments.length > 0 ? (
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className="text-neutral-500">Date</TableHead>
                  <TableHead className="text-neutral-500">Amount</TableHead>
                  <TableHead className="text-neutral-500">Type</TableHead>
                  <TableHead className="text-neutral-500">Late Fee</TableHead>
                  <TableHead className="text-neutral-500">Preclosure Fee</TableHead>
                  <TableHead className="text-neutral-500">Total</TableHead>
                  <TableHead className="text-neutral-500">Mode</TableHead>
                  <TableHead className="text-neutral-500">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  const totalAmount = 
                    Number(payment.amount) + 
                    Number(payment.lateFee || 0) + 
                    Number(payment.preclosureFee || 0);
                    
                  return (
                    <TableRow key={payment.id} className="hover:bg-neutral-50">
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-neutral-400" />
                          {formatDate(payment.paymentDate)}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {payment.paymentType.charAt(0).toUpperCase() + payment.paymentType.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {Number(payment.lateFee) > 0 
                          ? formatCurrency(payment.lateFee) 
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {Number(payment.preclosureFee) > 0 
                          ? formatCurrency(payment.preclosureFee) 
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(totalAmount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Wallet className="mr-2 h-4 w-4 text-neutral-400" />
                          {payment.paymentMethod.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.notes || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <p className="text-neutral-500">No payment records found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function LoadingLoanDetails() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-32" />
          </div>
        ))}
      </div>
      
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
