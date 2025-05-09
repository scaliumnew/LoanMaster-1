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

export class MemStorage implements IStorage {
  private clients: Map<number, Client>;
  private loans: Map<number, Loan>;
  private installments: Map<number, Installment>;
  private payments: Map<number, Payment>;
  private clientIdCounter: number;
  private loanIdCounter: number;
  private installmentIdCounter: number;
  private paymentIdCounter: number;

  constructor() {
    this.clients = new Map();
    this.loans = new Map();
    this.installments = new Map();
    this.payments = new Map();
    this.clientIdCounter = 1;
    this.loanIdCounter = 1;
    this.installmentIdCounter = 1;
    this.paymentIdCounter = 1;
  }

  // Client methods
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(client: InsertClient): Promise<Client> {
    const id = this.clientIdCounter++;
    const newClient: Client = { 
      ...client, 
      id, 
      createdAt: new Date() 
    };
    this.clients.set(id, newClient);
    return newClient;
  }

  async updateClient(id: number, clientUpdate: Partial<InsertClient>): Promise<Client | undefined> {
    const existingClient = this.clients.get(id);
    if (!existingClient) return undefined;
    
    const updatedClient: Client = { 
      ...existingClient, 
      ...clientUpdate 
    };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  // Loan methods
  async getLoans(): Promise<Loan[]> {
    return Array.from(this.loans.values());
  }

  async getLoan(id: number): Promise<Loan | undefined> {
    return this.loans.get(id);
  }

  async getLoansByClientId(clientId: number): Promise<Loan[]> {
    return Array.from(this.loans.values()).filter(loan => loan.clientId === clientId);
  }

  async createLoan(loan: InsertLoan): Promise<Loan> {
    const id = this.loanIdCounter++;
    const loanNumber = generateLoanNumber(id);
    
    const newLoan: Loan = {
      ...loan,
      id,
      loanNumber,
      createdAt: new Date()
    };
    
    this.loans.set(id, newLoan);
    return newLoan;
  }

  async updateLoan(id: number, loanUpdate: Partial<InsertLoan>): Promise<Loan | undefined> {
    const existingLoan = this.loans.get(id);
    if (!existingLoan) return undefined;
    
    const updatedLoan: Loan = {
      ...existingLoan,
      ...loanUpdate
    };
    
    this.loans.set(id, updatedLoan);
    return updatedLoan;
  }

  // Installment methods
  async getInstallments(loanId: number): Promise<Installment[]> {
    return Array.from(this.installments.values())
      .filter(installment => installment.loanId === loanId)
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
  }

  async getInstallment(id: number): Promise<Installment | undefined> {
    return this.installments.get(id);
  }

  async createInstallment(installment: InsertInstallment): Promise<Installment> {
    const id = this.installmentIdCounter++;
    
    const newInstallment: Installment = {
      ...installment,
      id,
      createdAt: new Date()
    };
    
    this.installments.set(id, newInstallment);
    return newInstallment;
  }

  async updateInstallment(id: number, installmentUpdate: Partial<InsertInstallment>): Promise<Installment | undefined> {
    const existingInstallment = this.installments.get(id);
    if (!existingInstallment) return undefined;
    
    const updatedInstallment: Installment = {
      ...existingInstallment,
      ...installmentUpdate
    };
    
    this.installments.set(id, updatedInstallment);
    return updatedInstallment;
  }

  // Payment methods
  async getPayments(loanId: number): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.loanId === loanId)
      .sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.paymentIdCounter++;
    
    const newPayment: Payment = {
      ...payment,
      id,
      createdAt: new Date()
    };
    
    this.payments.set(id, newPayment);
    
    // Update installment status if installmentId is provided
    if (payment.installmentId) {
      const installment = this.installments.get(payment.installmentId);
      if (installment) {
        const remainingAmount = Number(installment.remainingAmount) - Number(payment.amount);
        let status = 'pending';
        
        if (remainingAmount <= 0) {
          status = 'paid';
        } else if (remainingAmount < Number(installment.totalDue)) {
          status = 'partial';
        }
        
        this.updateInstallment(installment.id, {
          remainingAmount: remainingAmount.toString() as any,
          status
        });
      }
    }
    
    return newPayment;
  }

  // Reports
  async getTotalActiveLoans(): Promise<number> {
    return Array.from(this.loans.values()).filter(loan => loan.status === 'active').length;
  }

  async getTotalDisbursedAmount(): Promise<number> {
    return Array.from(this.loans.values())
      .reduce((sum, loan) => sum + Number(loan.amount), 0);
  }

  async getOverduePaymentsCount(): Promise<number> {
    return Array.from(this.installments.values())
      .filter(installment => installment.status === 'overdue').length;
  }

  async getRecentLoans(limit: number): Promise<(Loan & { clientName: string })[]> {
    const loansWithClientNames = Array.from(this.loans.values())
      .map(loan => {
        const client = this.clients.get(loan.clientId);
        return {
          ...loan,
          clientName: client ? client.name : 'Unknown Client'
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return loansWithClientNames.slice(0, limit);
  }

  async getLoansEndingSoon(daysThreshold: number): Promise<(Loan & { clientName: string })[]> {
    const today = new Date();
    const thresholdDate = new Date(today);
    thresholdDate.setDate(today.getDate() + daysThreshold);
    
    return Array.from(this.loans.values())
      .filter(loan => {
        const endDate = new Date(loan.endDate);
        return loan.status === 'active' && 
               endDate >= today && 
               endDate <= thresholdDate;
      })
      .map(loan => {
        const client = this.clients.get(loan.clientId);
        return {
          ...loan,
          clientName: client ? client.name : 'Unknown Client'
        };
      });
  }

  async getOverdueInstallments(): Promise<(Installment & { loan: Loan; clientName: string })[]> {
    const today = new Date();
    
    return Array.from(this.installments.values())
      .filter(installment => {
        const dueDate = new Date(installment.dueDate);
        return dueDate < today && installment.status !== 'paid';
      })
      .map(installment => {
        const loan = this.loans.get(installment.loanId)!;
        const client = this.clients.get(loan.clientId);
        return {
          ...installment,
          loan,
          clientName: client ? client.name : 'Unknown Client'
        };
      });
  }

  async getUpcomingInstallments(daysThreshold: number): Promise<(Installment & { loan: Loan; clientName: string })[]> {
    const today = new Date();
    const thresholdDate = new Date(today);
    thresholdDate.setDate(today.getDate() + daysThreshold);
    
    return Array.from(this.installments.values())
      .filter(installment => {
        const dueDate = new Date(installment.dueDate);
        return installment.status !== 'paid' && 
               dueDate >= today && 
               dueDate <= thresholdDate;
      })
      .map(installment => {
        const loan = this.loans.get(installment.loanId)!;
        const client = this.clients.get(loan.clientId);
        return {
          ...installment,
          loan,
          clientName: client ? client.name : 'Unknown Client'
        };
      });
  }
}

export const storage = new MemStorage();
