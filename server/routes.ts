import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClientSchema, 
  insertLoanSchema, 
  insertPaymentSchema 
} from "@shared/schema";
import { 
  calculateInstallments, 
  calculatePaymentBreakdown, 
  calculateLateFee, 
  calculatePreclosureFee 
} from "./utils";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Client routes
  app.get("/api/clients", async (req: Request, res: Response) => {
    const clients = await storage.getClients();
    res.json(clients);
  });

  app.get("/api/clients/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }

    const client = await storage.getClient(id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.json(client);
  });

  app.post("/api/clients", async (req: Request, res: Response) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid client data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }

    try {
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, validatedData);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid client data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  // Loan routes
  app.get("/api/loans", async (req: Request, res: Response) => {
    let loans;
    
    if (req.query.clientId) {
      const clientId = parseInt(req.query.clientId as string);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      loans = await storage.getLoansByClientId(clientId);
    } else {
      loans = await storage.getLoans();
    }
    
    res.json(loans);
  });

  app.get("/api/loans/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid loan ID" });
    }

    const loan = await storage.getLoan(id);
    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    res.json(loan);
  });

  app.post("/api/loans", async (req: Request, res: Response) => {
    try {
      const validatedData = insertLoanSchema.parse(req.body);
      
      // Verify client exists
      const client = await storage.getClient(validatedData.clientId);
      if (!client) {
        return res.status(400).json({ message: "Client not found" });
      }
      
      const loan = await storage.createLoan(validatedData);
      
      // Generate installments
      const installments = calculateInstallments(loan);
      
      // Save installments
      for (const installment of installments) {
        await storage.createInstallment(installment);
      }
      
      res.status(201).json(loan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid loan data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create loan" });
    }
  });

  app.patch("/api/loans/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid loan ID" });
    }

    try {
      const validatedData = insertLoanSchema.partial().parse(req.body);
      const loan = await storage.updateLoan(id, validatedData);
      
      if (!loan) {
        return res.status(404).json({ message: "Loan not found" });
      }
      
      res.json(loan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid loan data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update loan" });
    }
  });

  // Installment routes
  app.get("/api/loans/:loanId/installments", async (req: Request, res: Response) => {
    const loanId = parseInt(req.params.loanId);
    if (isNaN(loanId)) {
      return res.status(400).json({ message: "Invalid loan ID" });
    }

    const loan = await storage.getLoan(loanId);
    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    const installments = await storage.getInstallments(loanId);
    res.json(installments);
  });

  // Payment routes
  app.get("/api/loans/:loanId/payments", async (req: Request, res: Response) => {
    const loanId = parseInt(req.params.loanId);
    if (isNaN(loanId)) {
      return res.status(400).json({ message: "Invalid loan ID" });
    }

    const loan = await storage.getLoan(loanId);
    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    const payments = await storage.getPayments(loanId);
    res.json(payments);
  });

  app.post("/api/payments", async (req: Request, res: Response) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      
      // Verify loan exists
      const loan = await storage.getLoan(validatedData.loanId);
      if (!loan) {
        return res.status(400).json({ message: "Loan not found" });
      }
      
      // Calculate any late fees if applicable
      let lateFee = "0";
      let preclosureFee = "0";
      
      if (validatedData.installmentId) {
        const installment = await storage.getInstallment(validatedData.installmentId);
        if (!installment) {
          return res.status(400).json({ message: "Installment not found" });
        }
        
        // Check if payment is late
        const dueDate = new Date(installment.dueDate);
        const paymentDate = new Date(validatedData.paymentDate);
        
        if (paymentDate > dueDate) {
          lateFee = calculateLateFee(
            installment.totalDue.toString(),
            loan.lateFeePercentage.toString(),
            dueDate,
            paymentDate
          );
        }
      }
      
      // Calculate preclosure fee if payment type is 'preclosure'
      if (validatedData.paymentType === 'preclosure') {
        // Get all pending installments
        const allInstallments = await storage.getInstallments(loan.id);
        const pendingInstallments = allInstallments.filter(
          installment => installment.status !== 'paid'
        );
        
        const remainingPrincipal = pendingInstallments.reduce(
          (sum, inst) => sum + Number(inst.principal),
          0
        );
        
        preclosureFee = calculatePreclosureFee(
          remainingPrincipal.toString(),
          loan.preclosureFeePercentage.toString()
        );
      }
      
      // Add fees to payment
      const paymentWithFees = {
        ...validatedData,
        lateFee,
        preclosureFee
      };
      
      // Create payment
      const payment = await storage.createPayment(paymentWithFees);
      
      // If it's a preclosure payment, update all remaining installments and loan status
      if (payment.paymentType === 'preclosure') {
        const allInstallments = await storage.getInstallments(loan.id);
        
        for (const installment of allInstallments) {
          if (installment.status !== 'paid') {
            await storage.updateInstallment(installment.id, {
              status: 'paid',
              remainingAmount: "0"
            });
          }
        }
        
        // Update loan status to completed
        await storage.updateLoan(loan.id, {
          status: 'completed'
        });
      }
      
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // Dashboard data route
  app.get("/api/dashboard", async (req: Request, res: Response) => {
    try {
      const activeLoans = await storage.getTotalActiveLoans();
      const disbursedAmount = await storage.getTotalDisbursedAmount();
      const overduePayments = await storage.getOverduePaymentsCount();
      const recentLoans = await storage.getRecentLoans(5);
      const overdueInstallments = await storage.getOverdueInstallments();
      const upcomingInstallments = await storage.getUpcomingInstallments(7);
      const loansEndingSoon = await storage.getLoansEndingSoon(7);
      
      res.json({
        stats: {
          activeLoans,
          disbursedAmount,
          overduePayments
        },
        recentLoans,
        alerts: {
          overdueInstallments,
          upcomingInstallments,
          loansEndingSoon
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
