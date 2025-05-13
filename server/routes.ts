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
  // Health check endpoint for Railway.com
  app.get("/api/health", async (req: Request, res: Response) => {
    try {
      // Perform a simple database query to verify connection
      const clientCount = await storage.getClients().then(clients => clients.length);
      res.json({ 
        status: "ok", 
        database: "connected",
        timestamp: new Date().toISOString(),
        metrics: {
          clients: clientCount
        }
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(500).json({ 
        status: "error", 
        database: "disconnected",
        message: "Database connection failed",
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Database configuration debug endpoint
  app.get("/api/debug/database-config", async (req: Request, res: Response) => {
    try {
      // Generate diagnostic info about database connection
      const diagnostics = {
        environment: {
          NODE_ENV: process.env.NODE_ENV || 'not set',
          RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'not set',
          RAILWAY_PRIVATE_DOMAIN: process.env.RAILWAY_PRIVATE_DOMAIN || 'not set',
        },
        databaseConfig: {
          PGHOST: process.env.PGHOST || 'not set',
          PGPORT: process.env.PGPORT || 'not set',
          PGUSER: process.env.PGUSER ? 'set (hidden)' : 'not set',
          PGPASSWORD: process.env.PGPASSWORD ? 'set (hidden)' : 'not set',
          PGDATABASE: process.env.PGDATABASE || 'not set',
          PGSSLMODE: process.env.PGSSLMODE || 'not set',
          DATABASE_URL: process.env.DATABASE_URL ? 'set (hidden)' : 'not set'
        },
        serverTime: new Date().toISOString()
      };
      
      // Create simple test query to check DB connection
      let dbStatus = 'unknown';
      let dbError = null;
      
      try {
        // Test simple query
        const clients = await storage.getClients();
        dbStatus = 'connected';
      } catch (err: any) {
        dbStatus = 'error';
        dbError = {
          message: err.message,
          code: err.code,
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        };
      }
      
      res.json({
        ...diagnostics,
        databaseTest: {
          status: dbStatus,
          error: dbError
        },
        message: "This endpoint is for debugging only and should be disabled in production"
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: "Debug info failed", 
        message: error.message 
      });
    }
  });

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
      console.log("Loan request body:", req.body);
      
      // Convert string values to appropriate types
      const processedData = {
        ...req.body,
        clientId: parseInt(req.body.clientId),
        termLength: parseInt(req.body.termLength),
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate)
      };
      
      console.log("Processed loan data:", processedData);
      
      const validatedData = insertLoanSchema.parse(processedData);
      
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
      console.error("Loan creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid loan data", 
          errors: error.errors,
          details: "Please check all form fields are filled correctly" 
        });
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Failed to create loan", error: errorMessage });
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
      console.log("Payment request body:", req.body);
      
      // Process the data to ensure proper types
      const processedData = {
        ...req.body,
        loanId: parseInt(req.body.loanId),
        installmentId: req.body.installmentId ? parseInt(req.body.installmentId) : null,
        paymentDate: new Date(req.body.paymentDate)
      };
      
      console.log("Processed payment data:", processedData);
      
      const validatedData = insertPaymentSchema.parse(processedData);
      console.log("Validated payment data:", validatedData);
      
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
      
      console.log("Final payment data to be saved:", paymentWithFees);
      
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
      console.error("Payment creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid payment data", 
          errors: error.errors,
          details: "Please check all form fields are filled correctly" 
        });
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Failed to create payment", error: errorMessage });
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
