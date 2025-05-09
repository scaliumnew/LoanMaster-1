import { pgTable, text, serial, integer, boolean, timestamp, decimal, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Client schema
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertClientSchema = createInsertSchema(clients).omit({ 
  id: true,
  createdAt: true 
});

// Loan schema
export const loans = pgTable("loans", {
  id: serial("id").primaryKey(),
  loanNumber: text("loan_number").notNull().unique(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).notNull(),
  interestType: text("interest_type").notNull(), // 'flat' or 'reducing'
  termLength: integer("term_length").notNull(),
  termUnit: text("term_unit").notNull(), // 'days', 'weeks', 'months'
  repaymentFrequency: text("repayment_frequency").notNull(), // 'daily', 'weekly', 'monthly'
  lateFeePercentage: decimal("late_fee_percentage", { precision: 5, scale: 2 }).notNull(),
  preclosureFeePercentage: decimal("preclosure_fee_percentage", { precision: 5, scale: 2 }).notNull(),
  status: text("status").notNull().default('active'), // 'active', 'completed', 'defaulted'
  createdAt: timestamp("created_at").defaultNow()
});

export const insertLoanSchema = createInsertSchema(loans).omit({ 
  id: true, 
  loanNumber: true,
  createdAt: true 
});

// Installment schema
export const installments = pgTable("installments", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull().references(() => loans.id),
  installmentNumber: integer("installment_number").notNull(),
  dueDate: timestamp("due_date").notNull(),
  principal: decimal("principal", { precision: 12, scale: 2 }).notNull(),
  interest: decimal("interest", { precision: 12, scale: 2 }).notNull(),
  totalDue: decimal("total_due", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'paid', 'partial', 'overdue'
  remainingAmount: decimal("remaining_amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => {
  return {
    loanInstallmentIdx: unique().on(table.loanId, table.installmentNumber)
  }
});

export const insertInstallmentSchema = createInsertSchema(installments).omit({ 
  id: true, 
  createdAt: true 
});

// Payment schema
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull().references(() => loans.id),
  installmentId: integer("installment_id").references(() => installments.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  paymentType: text("payment_type").notNull(), // 'regular', 'preclosure'
  paymentMethod: text("payment_method").notNull(), // 'cash', 'bank_transfer', 'upi', 'cheque'
  lateFee: decimal("late_fee", { precision: 12, scale: 2 }).default("0"),
  preclosureFee: decimal("preclosure_fee", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ 
  id: true, 
  createdAt: true 
});

// Type definitions
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Loan = typeof loans.$inferSelect;
export type InsertLoan = z.infer<typeof insertLoanSchema>;

export type Installment = typeof installments.$inferSelect;
export type InsertInstallment = z.infer<typeof insertInstallmentSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
