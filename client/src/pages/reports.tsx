import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, getInitials, getLoanStatusColor, getInstallmentStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

// Custom components for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded shadow-sm">
        <p className="font-medium">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {`${entry.name}: ${formatCurrency(entry.value)}`}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

const COLORS = ['#1E88E5', '#43A047', '#FF9800', '#F44336', '#9C27B0', '#795548'];

export default function ReportsPage() {
  // Fetch all necessary data for reports
  const { data: loansData = [], isLoading: isLoadingLoans } = useQuery({
    queryKey: ["/api/loans"],
    queryFn: async () => {
      const response = await fetch("/api/loans");
      if (!response.ok) {
        throw new Error("Failed to fetch loans");
      }
      return response.json();
    },
  });

  // Fetch clients for loan-client mapping
  const { data: clientsData = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch("/api/clients");
      if (!response.ok) {
        throw new Error("Failed to fetch clients");
      }
      return response.json();
    },
  });

  // Get client name by id
  const getClientName = (clientId: number) => {
    const client = clientsData.find((c: any) => c.id === clientId);
    return client ? client.name : "Unknown Client";
  };

  // Prepare data for charts
  const prepareLoansByStatusData = () => {
    const statusCounts: any = {
      active: 0,
      completed: 0,
      defaulted: 0,
    };

    loansData.forEach((loan: any) => {
      if (statusCounts[loan.status] !== undefined) {
        statusCounts[loan.status]++;
      }
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }));
  };

  const prepareLoansByTypeData = () => {
    const typeCounts: any = {
      flat: 0,
      reducing: 0,
    };

    loansData.forEach((loan: any) => {
      if (typeCounts[loan.interestType] !== undefined) {
        typeCounts[loan.interestType]++;
      }
    });

    return Object.entries(typeCounts).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
    }));
  };

  const prepareAmountByMonthData = () => {
    const monthlyData: any = {};

    // Initialize with last 6 months
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      monthlyData[`${monthName} ${d.getFullYear()}`] = 0;
    }

    // Sum up loan amounts by month
    loansData.forEach((loan: any) => {
      if (loan.startDate) {
        try {
          const date = new Date(loan.startDate);
          if (!isNaN(date.getTime())) {
            const monthName = date.toLocaleString('default', { month: 'short' });
            const key = `${monthName} ${date.getFullYear()}`;
            
            if (monthlyData[key] !== undefined) {
              monthlyData[key] += parseFloat(loan.amount);
            }
          }
        } catch (error) {
          console.error("Error processing loan date:", error);
        }
      }
    });

    return Object.entries(monthlyData).map(([month, amount]) => ({
      month,
      amount,
    }));
  };

  // Prepare overdue loans data
  const getOverdueLoans = async () => {
    const overdueLoans: any[] = [];
    
    for (const loan of loansData) {
      if (loan.status === 'active') {
        const response = await fetch(`/api/loans/${loan.id}/installments`);
        if (response.ok) {
          const installments = await response.json();
          const hasOverdue = installments.some((inst: any) => 
            inst.status === 'overdue'
          );
          
          if (hasOverdue) {
            overdueLoans.push({
              ...loan,
              clientName: getClientName(loan.clientId),
              overdueInstallments: installments.filter((inst: any) => 
                inst.status === 'overdue'
              ),
            });
          }
        }
      }
    }
    
    return overdueLoans;
  };

  const { data: overdueLoans = [], isLoading: isLoadingOverdueLoans } = useQuery({
    queryKey: ["/api/reports/overdue"],
    queryFn: getOverdueLoans,
    enabled: !isLoadingLoans,
  });

  const calculateTotalDisbursed = () => {
    return loansData.reduce((sum: number, loan: any) => 
      sum + parseFloat(loan.amount), 0
    );
  };

  return (
    <AppShell title="Reports">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Financial Reports</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-neutral-500">Total Disbursed Amount</p>
                <p className="text-3xl font-bold mt-1">
                  {formatCurrency(calculateTotalDisbursed())}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-neutral-500">Active Loans</p>
                <p className="text-3xl font-bold mt-1">
                  {loansData.filter((loan: any) => loan.status === 'active').length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-neutral-500">Overdue Installments</p>
                <p className="text-3xl font-bold mt-1 text-destructive">
                  {overdueLoans.reduce((sum: number, loan: any) => 
                    sum + loan.overdueInstallments.length, 0
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Loan Disbursements by Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareAmountByMonthData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis 
                      tickFormatter={(value) => 
                        value === 0 ? '0' : `${(value / 1000).toFixed(0)}K`
                      } 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar name="Amount Disbursed" dataKey="amount" fill="#1E88E5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loans by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={prepareLoansByStatusData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {prepareLoansByStatusData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Reports */}
        <Tabs defaultValue="overdue">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overdue">Overdue Loans</TabsTrigger>
            <TabsTrigger value="disbursements">Recent Disbursements</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overdue">
            <Card>
              <CardHeader>
                <CardTitle>Overdue Loans</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingOverdueLoans ? (
                  <p>Loading overdue loans...</p>
                ) : overdueLoans.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-neutral-500">No overdue loans found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead>
                        <tr className="bg-neutral-50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Client
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Loan Number
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Overdue Installments
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Overdue Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {overdueLoans.map((loan: any) => {
                          const overdueAmount = loan.overdueInstallments.reduce(
                            (sum: number, inst: any) => sum + parseFloat(inst.remainingAmount),
                            0
                          );
                          
                          return (
                            <tr key={loan.id} className="hover:bg-neutral-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700 mr-2">
                                    {getInitials(loan.clientName)}
                                  </div>
                                  <span className="font-medium">{loan.clientName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {loan.loanNumber}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-medium">
                                {formatCurrency(loan.amount)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Badge variant="destructive">
                                  {loan.overdueInstallments.length} installments
                                </Badge>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-medium text-destructive">
                                {formatCurrency(overdueAmount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="disbursements">
            <Card>
              <CardHeader>
                <CardTitle>Recent Disbursements</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingLoans ? (
                  <p>Loading disbursements...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead>
                        <tr className="bg-neutral-50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Client
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Loan Number
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Disbursement Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {[...loansData]
                          .sort((a: any, b: any) => {
                            try {
                              if (!a.startDate || !b.startDate) return 0;
                              const dateA = new Date(a.startDate);
                              const dateB = new Date(b.startDate);
                              if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
                              return dateB.getTime() - dateA.getTime();
                            } catch (error) {
                              return 0;
                            }
                          })
                          .slice(0, 10)
                          .map((loan: any) => (
                            <tr key={loan.id} className="hover:bg-neutral-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700 mr-2">
                                    {getInitials(getClientName(loan.clientId))}
                                  </div>
                                  <span className="font-medium">{getClientName(loan.clientId)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {loan.loanNumber}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-medium">
                                {formatCurrency(loan.amount)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-2 text-neutral-400" />
                                  {loan.startDate ? formatDate(loan.startDate) : 'Unknown date'}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Badge variant="secondary">
                                  {loan.interestType && typeof loan.interestType === 'string' 
                                    ? loan.interestType.charAt(0).toUpperCase() + loan.interestType.slice(1)
                                    : 'Unknown'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <Badge variant={loan.status ? getLoanStatusColor(loan.status) : "default"}>
                                  {loan.status && typeof loan.status === 'string'
                                    ? loan.status.charAt(0).toUpperCase() + loan.status.slice(1)
                                    : 'Unknown'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
