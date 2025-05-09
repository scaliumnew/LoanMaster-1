import { addDays, addWeeks, addMonths, differenceInDays } from "date-fns";

interface InstallmentSchedule {
  installmentNumber: number;
  dueDate: Date;
  principal: number;
  interest: number;
  totalDue: number;
  status: string;
  remainingAmount: number;
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

// Generate installment schedule preview
export function generateInstallmentSchedule(
  amount: number,
  startDate: Date,
  interestRate: number,
  interestType: string,
  termLength: number,
  termUnit: string,
  repaymentFrequency: string
): InstallmentSchedule[] {
  const installments: InstallmentSchedule[] = [];
  const totalInstallments = calculateTotalInstallments(
    termLength,
    termUnit,
    repaymentFrequency
  );
  
  let remainingPrincipal = amount;
  const principalPerInstallment = amount / totalInstallments;
  
  for (let i = 1; i <= totalInstallments; i++) {
    const dueDate = calculateNextPaymentDate(
      startDate,
      repaymentFrequency,
      i
    );
    
    let interest: number;
    
    // Calculate interest based on type
    if (interestType === 'flat') {
      // Flat interest calculation
      interest = (amount * interestRate / 100) / totalInstallments;
    } else {
      // Reducing interest calculation
      interest = (remainingPrincipal * interestRate / 100) / 12;
      
      // Adjust for daily or weekly frequency
      if (repaymentFrequency === 'daily') {
        interest = interest / 30;
      } else if (repaymentFrequency === 'weekly') {
        interest = interest / 4;
      }
    }
    
    const totalDue = principalPerInstallment + interest;
    
    installments.push({
      installmentNumber: i,
      dueDate,
      principal: parseFloat(principalPerInstallment.toFixed(2)),
      interest: parseFloat(interest.toFixed(2)),
      totalDue: parseFloat(totalDue.toFixed(2)),
      status: 'pending',
      remainingAmount: parseFloat(totalDue.toFixed(2))
    });
    
    // Update remaining principal for reducing balance calculation
    if (interestType === 'reducing') {
      remainingPrincipal -= principalPerInstallment;
    }
  }
  
  return installments;
}

// Calculate late fee
export function calculateLateFee(
  amount: number,
  feePercentage: number,
  dueDate: Date,
  paymentDate: Date
): number {
  const daysLate = differenceInDays(paymentDate, dueDate);
  if (daysLate <= 0) return 0;
  
  const feePerDay = amount * (feePercentage / 100);
  return parseFloat((feePerDay * daysLate).toFixed(2));
}

// Calculate preclosure fee
export function calculatePreclosureFee(
  remainingPrincipal: number,
  feePercentage: number
): number {
  return parseFloat((remainingPrincipal * (feePercentage / 100)).toFixed(2));
}
