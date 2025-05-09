import { addDays, addWeeks, addMonths, differenceInDays } from "date-fns";
import { InsertInstallment, Loan } from "@shared/schema";

// Generate a loan number in the format L-YYYY-XXXX
export function generateLoanNumber(id: number): string {
  const year = new Date().getFullYear();
  const paddedId = id.toString().padStart(4, '0');
  return `L-${year}-${paddedId}`;
}

// Calculate next payment date based on frequency and start date
export function calculateNextPaymentDate(
  startDate: Date,
  frequency: string,
  installmentNumber: number
): Date {
  const date = new Date(startDate);
  
  switch (frequency) {
    case 'daily':
      return addDays(date, installmentNumber);
    case 'weekly':
      return addWeeks(date, installmentNumber);
    case 'monthly':
      return addMonths(date, installmentNumber);
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
}

// Calculate total number of installments based on term and frequency
export function calculateTotalInstallments(
  termLength: number,
  termUnit: string,
  repaymentFrequency: string
): number {
  let totalDays: number;
  
  switch (termUnit) {
    case 'days':
      totalDays = termLength;
      break;
    case 'weeks':
      totalDays = termLength * 7;
      break;
    case 'months':
      // Approximate 30 days per month
      totalDays = termLength * 30;
      break;
    default:
      throw new Error(`Unsupported term unit: ${termUnit}`);
  }
  
  switch (repaymentFrequency) {
    case 'daily':
      return totalDays;
    case 'weekly':
      return Math.ceil(totalDays / 7);
    case 'monthly':
      return Math.ceil(totalDays / 30);
    default:
      throw new Error(`Unsupported repayment frequency: ${repaymentFrequency}`);
  }
}

// Calculate installments for a loan
export function calculateInstallments(loan: Loan): InsertInstallment[] {
  const installments: InsertInstallment[] = [];
  const totalInstallments = calculateTotalInstallments(
    loan.termLength,
    loan.termUnit,
    loan.repaymentFrequency
  );
  
  let remainingPrincipal = Number(loan.amount);
  const principalPerInstallment = Number(loan.amount) / totalInstallments;
  
  for (let i = 1; i <= totalInstallments; i++) {
    const dueDate = calculateNextPaymentDate(
      new Date(loan.startDate),
      loan.repaymentFrequency,
      i
    );
    
    let interest: number;
    
    // Calculate interest based on type
    if (loan.interestType === 'flat') {
      // Flat interest calculation
      interest = (Number(loan.amount) * Number(loan.interestRate) / 100) / totalInstallments;
    } else {
      // Reducing interest calculation
      interest = (remainingPrincipal * Number(loan.interestRate) / 100) / 12;
      
      // Adjust for daily or weekly frequency
      if (loan.repaymentFrequency === 'daily') {
        interest = interest / 30;
      } else if (loan.repaymentFrequency === 'weekly') {
        interest = interest / 4;
      }
    }
    
    const totalDue = principalPerInstallment + interest;
    
    installments.push({
      loanId: loan.id,
      installmentNumber: i,
      dueDate,
      principal: principalPerInstallment.toFixed(2) as any,
      interest: interest.toFixed(2) as any,
      totalDue: totalDue.toFixed(2) as any,
      status: 'pending',
      remainingAmount: totalDue.toFixed(2) as any
    });
    
    // Update remaining principal for reducing balance calculation
    if (loan.interestType === 'reducing') {
      remainingPrincipal -= principalPerInstallment;
    }
  }
  
  return installments;
}

// Calculate payment breakdown for regular and late payments
export function calculatePaymentBreakdown(
  amount: string,
  installment: {
    totalDue: string;
    dueDate: Date;
  },
  paymentDate: Date,
  lateFeePercentage: string
) {
  const paymentAmount = Number(amount);
  const totalDue = Number(installment.totalDue);
  
  // Check if payment is late
  const isLate = paymentDate > installment.dueDate;
  
  let lateFee = 0;
  if (isLate) {
    lateFee = calculateLateFeeAmount(
      installment.totalDue,
      lateFeePercentage,
      installment.dueDate,
      paymentDate
    );
  }
  
  const totalWithLateFee = totalDue + lateFee;
  
  // Determine payment status
  let status = 'pending';
  if (paymentAmount >= totalWithLateFee) {
    status = 'paid';
  } else if (paymentAmount > 0) {
    status = 'partial';
  }
  
  const remainingAmount = Math.max(0, totalWithLateFee - paymentAmount);
  
  return {
    lateFee: lateFee.toFixed(2),
    totalWithLateFee: totalWithLateFee.toFixed(2),
    remainingAmount: remainingAmount.toFixed(2),
    status
  };
}

// Calculate late fee amount
export function calculateLateFeeAmount(
  amount: string,
  feePercentage: string,
  dueDate: Date,
  paymentDate: Date
): number {
  const daysLate = differenceInDays(paymentDate, dueDate);
  if (daysLate <= 0) return 0;
  
  const feePerDay = Number(amount) * (Number(feePercentage) / 100);
  return feePerDay * daysLate;
}

// Calculate late fee
export function calculateLateFee(
  amount: string,
  feePercentage: string,
  dueDate: Date,
  paymentDate: Date
): string {
  const lateFeeAmount = calculateLateFeeAmount(amount, feePercentage, dueDate, paymentDate);
  return lateFeeAmount.toFixed(2);
}

// Calculate preclosure fee
export function calculatePreclosureFee(
  remainingPrincipal: string,
  feePercentage: string
): string {
  const fee = Number(remainingPrincipal) * (Number(feePercentage) / 100);
  return fee.toFixed(2);
}
