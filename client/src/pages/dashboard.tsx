import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { RecentLoansTable } from "@/components/dashboard/recent-loans-table";
import { LoanForm } from "@/components/loans/loan-form";
import { PaymentForm } from "@/components/payments/payment-form";
import { formatCurrency } from "@/lib/utils";
import {
  Landmark,
  Wallet,
  AlertTriangle,
  BellRing,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileBottomNav } from "@/components/layout/app-shell";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Fetch dashboard data
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      return response.json();
    },
  });

  const generateAlerts = () => {
    if (!data || !data.alerts) return [];

    const alerts = [];

    // Add overdue installments alert
    if (data.alerts.overdueInstallments && data.alerts.overdueInstallments.length > 0) {
      const overdueCount = data.alerts.overdueInstallments.length;
      const totalAmount = data.alerts.overdueInstallments.reduce(
        (sum: number, installment: any) => sum + parseFloat(installment.remainingAmount),
        0
      );

      alerts.push({
        id: 1,
        type: "warning" as const,
        title: `${overdueCount} loans have overdue payments`,
        description: `Total overdue amount: ${formatCurrency(totalAmount)}`,
        link: "/loans?filter=overdue",
      });
    }

    // Add upcoming payments alert
    if (data.alerts.upcomingInstallments && data.alerts.upcomingInstallments.length > 0) {
      const upcomingCount = data.alerts.upcomingInstallments.length;
      const totalAmount = data.alerts.upcomingInstallments.reduce(
        (sum: number, installment: any) => sum + parseFloat(installment.remainingAmount),
        0
      );

      alerts.push({
        id: 2,
        type: "notification" as const,
        title: `${upcomingCount} payments due in the next 7 days`,
        description: `Total amount: ${formatCurrency(totalAmount)}`,
        link: "/payments?filter=upcoming",
      });
    }

    // Add loans ending soon alert
    if (data.alerts.loansEndingSoon && data.alerts.loansEndingSoon.length > 0) {
      const count = data.alerts.loansEndingSoon.length;

      alerts.push({
        id: 3,
        type: "info" as const,
        title: `${count} loans ending in the next week`,
        description: "Final payments scheduled",
        link: "/loans?filter=ending-soon",
      });
    }

    return alerts;
  };

  // Handle form submission callbacks
  const handleLoanSuccess = () => {
    // Refresh dashboard data
  };

  const handlePaymentSuccess = () => {
    // Refresh dashboard data
  };

  return (
    <AppShell title="Dashboard">
      <div className="mb-6">
        {/* Action Buttons */}
        <div className="flex justify-end mb-6 gap-2">
          <Button
            variant="outline"
            className="flex items-center"
            onClick={() => setIsPaymentModalOpen(true)}
          >
            <Wallet className="mr-2 h-5 w-5" />
            Record Payment
          </Button>
          <Button
            className="flex items-center"
            onClick={() => setIsLoanModalOpen(true)}
          >
            <Landmark className="mr-2 h-5 w-5" />
            Create Loan
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Total Active Loans"
            value={isLoading ? "..." : data?.stats?.activeLoans || 0}
            icon={<Landmark className="h-6 w-6 text-primary" />}
            trend={{
              value: 5.3,
              isPositive: true,
              label: "vs last month",
            }}
          />
          <StatCard
            title="Total Amount Disbursed"
            value={
              isLoading
                ? "..."
                : formatCurrency(data?.stats?.disbursedAmount || 0)
            }
            icon={<Wallet className="h-6 w-6 text-secondary" />}
            trend={{
              value: 7.2,
              isPositive: true,
              label: "vs last month",
            }}
          />
          <StatCard
            title="Overdue Payments"
            value={isLoading ? "..." : data?.stats?.overduePayments || 0}
            icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
            trend={{
              value: 2.8,
              isPositive: false,
              label: "vs last month",
            }}
          />
        </div>

        {/* Alerts Section */}
        <div className="mb-6">
          <AlertsList
            alerts={isLoading ? [] : generateAlerts()}
          />
        </div>

        {/* Recent Loans Section */}
        <div>
          <RecentLoansTable
            loans={
              isLoading
                ? []
                : (data?.recentLoans || []).map((loan: any) => ({
                    id: loan.id,
                    loanNumber: loan.loanNumber,
                    clientName: loan.clientName,
                    amount: loan.amount,
                    date: loan.startDate,
                    type: loan.interestType,
                    status: loan.status,
                  }))
            }
            onViewAll={() => navigate("/loans")}
          />
        </div>
      </div>

      {/* Forms */}
      <LoanForm
        isOpen={isLoanModalOpen}
        onClose={() => setIsLoanModalOpen(false)}
        onSuccess={handleLoanSuccess}
      />
      <PaymentForm
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={handlePaymentSuccess}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        onNewLoan={() => setIsLoanModalOpen(true)}
        onNewPayment={() => setIsPaymentModalOpen(true)}
      />
    </AppShell>
  );
}
