import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isYesterday } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currencySymbol = '₹'): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) return `${currencySymbol}0`;
  
  // Format with commas for Indian numbering system (1,23,456)
  const parts = numericAmount.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // For large numbers, use the Indian numbering system
  if (numericAmount >= 1000) {
    let x = parts[0];
    x = x.replace(/,/g, '');
    let lastThree = x.substring(x.length - 3);
    const otherNumbers = x.substring(0, x.length - 3);
    if (otherNumbers !== '') {
      lastThree = ',' + lastThree;
    }
    parts[0] = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  }
  
  return `${currencySymbol}${parts.join('.')}`;
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isToday(dateObj)) {
    return 'Today';
  } else if (isYesterday(dateObj)) {
    return 'Yesterday';
  } else {
    return format(dateObj, 'dd MMM yyyy');
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function getLoanStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'active':
      return 'success';
    case 'completed':
      return 'secondary';
    case 'defaulted':
      return 'destructive';
    case 'pending approval':
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
}

export function getInstallmentStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'success';
    case 'partial':
      return 'warning';
    case 'pending':
      return 'secondary';
    case 'overdue':
      return 'destructive';
    case 'upcoming':
      return 'primary';
    default:
      return 'default';
  }
}
