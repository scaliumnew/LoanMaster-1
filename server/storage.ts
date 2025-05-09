import { 
  clients, clients as clientsTable, 
  loans, loans as loansTable, 
  installments, installments as installmentsTable, 
  payments, payments as paymentsTable,
  type Client, type InsertClient,
  type Loan, type InsertLoan,
  type Installment, type InsertInstallment,
  type Payment, type InsertPayment
} from "@shared/schema";
import { generateLoanNumber } from "./utils";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import { db } from "./db";

// Storage interface
export interface IStorage {
  // Client methods
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  
  // Loan methods
  getLoans(): Promise<Loan[]>;
  getLoan(id: number): Promise<Loan | undefined>;
  getLoansByClientId(clientId: number): Promise<Loan[]>;
  createLoan(loan: InsertLoan): Promise<Loan>;
  updateLoan(id: number, loan: Partial<InsertLoan>): Promise<Loan | undefined>;
  
  // Installment methods
  getInstallments(loanId: number): Promise<Installment[]>;
  getInstallment(id: number): Promise<Installment | undefined>;
  createInstallment(installment: InsertInstallment): Promise<Installment>;
  updateInstallment(id: number, installment: Partial<InsertInstallment>): Promise<Installment | undefined>;
  
  // Payment methods
  getPayments(loanId: number): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  
  // Reports
  getTotalActiveLoans(): Promise<number>;
  getTotalDisbursedAmount(): Promise<number>;
  getOverduePaymentsCount(): Promise<number>;
  getRecentLoans(limit: number): Promise<(Loan & { clientName: string })[]>;
  getLoansEndingSoon(daysThreshold: number): Promise<(Loan & { clientName: string })[]>;
  getOverdueInstallments(): Promise<(Installment & { loan: Loan; clientName: string })[]>;
  getUpcomingInstallments(daysThreshold: number): Promise<(Installment & { loan: Loan; clientName: string })[]>;
}

export class DatabaseStorage implements IStorage {
  // Client methods
  async getClients(): Promise<Client[]> {
    return await db.select().from(clientsTable).orderBy(desc(clientsTable.id));
  }

  async getClient(id: number): Promise<Client | undefined> {
    const result = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const result = await db.insert(clientsTable).values(client).returning();
    return result[0];
  }

  async updateClient(id: number, clientUpdate: Partial<InsertClient>): Promise<Client | undefined> {
    const result = await db.update(clientsTable)
      .set(clientUpdate)
      .where(eq(clientsTable.id, id))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }

  // Loan methods
  async getLoans(): Promise<Loan[]> {
    return await db.select().from(loansTable).orderBy(desc(loansTable.id));
  }

  async getLoan(id: number): Promise<Loan | undefined> {
    const result = await db.select().from(loansTable).where(eq(loansTable.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getLoansByClientId(clientId: number): Promise<Loan[]> {
    return await db.select()
      .from(loansTable)
      .where(eq(loansTable.clientId, clientId))
      .orderBy(desc(loansTable.id));
  }

  async createLoan(loan: InsertLoan): Promise<Loan> {
    // Prepare loan data with generated loan number
    const loanData = {
      ...loan,
      loanNumber: generateLoanNumber(Date.now()) // Using timestamp as a base
    };
    
    // Insert and return the loan
    const result = await db.insert(loansTable).values(loanData).returning();
    return result[0];
  }

  async updateLoan(id: number, loanUpdate: Partial<InsertLoan>): Promise<Loan | undefined> {
    const result = await db.update(loansTable)
      .set(loanUpdate)
      .where(eq(loansTable.id, id))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }

  // Installment methods
  async getInstallments(loanId: number): Promise<Installment[]> {
    return await db.select()
      .from(installmentsTable)
      .where(eq(installmentsTable.loanId, loanId))
      .orderBy(asc(installmentsTable.installmentNumber));
  }

  async getInstallment(id: number): Promise<Installment | undefined> {
    const result = await db.select().from(installmentsTable).where(eq(installmentsTable.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async createInstallment(installment: InsertInstallment): Promise<Installment> {
    const result = await db.insert(installmentsTable).values(installment).returning();
    return result[0];
  }

  async updateInstallment(id: number, installmentUpdate: Partial<InsertInstallment>): Promise<Installment | undefined> {
    const result = await db.update(installmentsTable)
      .set(installmentUpdate)
      .where(eq(installmentsTable.id, id))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }

  // Payment methods
  async getPayments(loanId: number): Promise<Payment[]> {
    return await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.loanId, loanId))
      .orderBy(desc(paymentsTable.paymentDate));
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const result = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const result = await db.insert(paymentsTable).values(payment).returning();
    
    // Update installment status if installmentId is provided
    if (payment.installmentId) {
      const installment = await this.getInstallment(payment.installmentId);
      if (installment) {
        const remainingAmount = Number(installment.remainingAmount) - Number(payment.amount);
        let status = 'pending';
        
        if (remainingAmount <= 0) {
          status = 'paid';
        } else if (remainingAmount < Number(installment.totalDue)) {
          status = 'partial';
        }
        
        await this.updateInstallment(installment.id, {
          remainingAmount: remainingAmount.toString() as any,
          status
        });
      }
    }
    
    return result[0];
  }

  // Reports
  async getTotalActiveLoans(): Promise<number> {
    const result = await db.select()
      .from(loansTable)
      .where(eq(loansTable.status, 'active'));
    return result.length;
  }

  async getTotalDisbursedAmount(): Promise<number> {
    const loans = await db.select()
      .from(loansTable);
    return loans.reduce((total, loan) => total + Number(loan.amount), 0);
  }

  async getOverduePaymentsCount(): Promise<number> {
    const today = new Date();
    const result = await db.select()
      .from(installmentsTable)
      .where(
        and(
          eq(installmentsTable.status, 'overdue')
        )
      );
    return result.length;
  }

  async getRecentLoans(limit: number): Promise<(Loan & { clientName: string })[]> {
    const loans = await db.select()
      .from(loansTable)
      .orderBy(desc(loansTable.createdAt))
      .limit(limit);
    
    return Promise.all(loans.map(async loan => {
      const client = await this.getClient(loan.clientId);
      return {
        ...loan,
        clientName: client ? client.name : 'Unknown Client'
      };
    }));
  }

  async getLoansEndingSoon(daysThreshold: number): Promise<(Loan & { clientName: string })[]> {
    const today = new Date();
    const threshold = new Date();
    threshold.setDate(today.getDate() + daysThreshold);
    
    const loans = await db.select()
      .from(loansTable)
      .where(
        and(
          eq(loansTable.status, 'active'),
          gte(loansTable.endDate, today),
          lte(loansTable.endDate, threshold)
        )
      )
      .orderBy(asc(loansTable.endDate));
    
    return Promise.all(loans.map(async loan => {
      const client = await this.getClient(loan.clientId);
      return {
        ...loan,
        clientName: client ? client.name : 'Unknown Client'
      };
    }));
  }

  async getOverdueInstallments(): Promise<(Installment & { loan: Loan; clientName: string })[]> {
    const today = new Date();
    
    const overdueInstallments = await db.select()
      .from(installmentsTable)
      .where(
        and(
          lte(installmentsTable.dueDate, today),
          eq(installmentsTable.status, 'pending')
        )
      )
      .orderBy(asc(installmentsTable.dueDate));
    
    return Promise.all(overdueInstallments.map(async installment => {
      const loan = await this.getLoan(installment.loanId) as Loan;
      const client = await this.getClient(loan.clientId);
      return {
        ...installment,
        loan,
        clientName: client ? client.name : 'Unknown Client'
      };
    }));
  }

  async getUpcomingInstallments(daysThreshold: number): Promise<(Installment & { loan: Loan; clientName: string })[]> {
    const today = new Date();
    const threshold = new Date();
    threshold.setDate(today.getDate() + daysThreshold);
    
    const upcomingInstallments = await db.select()
      .from(installmentsTable)
      .where(
        and(
          eq(installmentsTable.status, 'pending'),
          gte(installmentsTable.dueDate, today),
          lte(installmentsTable.dueDate, threshold)
        )
      )
      .orderBy(asc(installmentsTable.dueDate));
    
    return Promise.all(upcomingInstallments.map(async installment => {
      const loan = await this.getLoan(installment.loanId) as Loan;
      const client = await this.getClient(loan.clientId);
      return {
        ...installment,
        loan,
        clientName: client ? client.name : 'Unknown Client'
      };
    }));
  }
}

export const storage = new DatabaseStorage();