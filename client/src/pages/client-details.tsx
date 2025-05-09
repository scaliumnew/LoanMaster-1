import React, { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, getInitials, getLoanStatusColor } from "@/lib/utils";
import { ClientForm } from "@/components/clients/client-form";
import { LoanForm } from "@/components/loans/loan-form";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Edit, 
  PlusCircle, 
  Landmark,
  Calendar,
  CreditCard
} from "lucide-react";

export default function ClientDetailsPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/clients/:id");
  const clientId = params ? parseInt(params.id) : 0;
  
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [isAddLoanModalOpen, setIsAddLoanModalOpen] = useState(false);

  // Fetch client details
  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: [`/api/clients/${clientId}`],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch client details");
      }
      return response.json();
    },
    enabled: !!clientId,
  });

  // Fetch client's loans
  const { data: loans = [], isLoading: isLoadingLoans } = useQuery({
    queryKey: [`/api/loans?clientId=${clientId}`],
    queryFn: async () => {
      const response = await fetch(`/api/loans?clientId=${clientId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch client loans");
      }
      return response.json();
    },
    enabled: !!clientId,
  });

  const handleClientUpdateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}`] });
  };

  const handleLoanSuccess = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/loans?clientId=${clientId}`] });
  };

  if (isLoadingClient) {
    return (
      <AppShell title="Client Details">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/clients")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clients
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          
          <Skeleton className="h-[400px]" />
        </div>
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell title="Client Not Found">
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-2xl font-bold mb-4">Client Not Found</h2>
          <p className="text-neutral-500 mb-6">
            The client you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/clients")}>Return to Clients</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Client: ${client.name}`}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate("/clients")} className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsEditClientModalOpen(true)}
            className="flex items-center"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Client
          </Button>
        </div>

        {/* Client Profile Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-6 rounded-lg shadow-sm">
          <div className="h-16 w-16 rounded-full bg-primary-light/20 flex items-center justify-center text-primary text-xl font-bold">
            {getInitials(client.name)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-neutral-800">{client.name}</h1>
            <div className="flex flex-wrap gap-4 mt-2">
              <div className="flex items-center text-neutral-600">
                <Phone className="h-4 w-4 mr-2" />
                {client.phone}
              </div>
              <div className="flex items-center text-neutral-600">
                <Mail className="h-4 w-4 mr-2" />
                {client.email}
              </div>
              {client.address && (
                <div className="flex items-center text-neutral-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  {client.address}
                </div>
              )}
            </div>
          </div>
          <div>
            <Button 
              onClick={() => setIsAddLoanModalOpen(true)}
              className="flex items-center"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New Loan
            </Button>
          </div>
        </div>

        {/* Client Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-neutral-500">Total Loans</p>
                  <p className="text-2xl font-bold">
                    {isLoadingLoans ? (
                      <Skeleton className="h-8 w-16 rounded-md" />
                    ) : (
                      loans.length
                    )}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary-light/20 flex items-center justify-center">
                  <Landmark className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-neutral-500">Active Loans</p>
                  <p className="text-2xl font-bold">
                    {isLoadingLoans ? (
                      <Skeleton className="h-8 w-16 rounded-md" />
                    ) : (
                      loans.filter(loan => loan.status === 'active').length
                    )}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center">
                  <Landmark className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-neutral-500">Total Disbursed</p>
                  <p className="text-2xl font-bold">
                    {isLoadingLoans ? (
                      <Skeleton className="h-8 w-24 rounded-md" />
                    ) : (
                      formatCurrency(
                        loans.reduce((sum, loan) => sum + parseFloat(loan.amount), 0)
                      )
                    )}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary-light/20 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loans Tab */}
        <Tabs defaultValue="all-loans" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all-loans">All Loans</TabsTrigger>
            <TabsTrigger value="active-loans">Active Loans</TabsTrigger>
            <TabsTrigger value="completed-loans">Completed Loans</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all-loans">
            <Card>
              <CardHeader className="border-b border-neutral-200">
                <CardTitle>Loan History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingLoans ? (
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : loans.length === 0 ? (
                  <div className="p-6 text-center">
                    <Landmark className="h-12 w-12 text-neutral-300 mx-auto mb-2" />
                    <h3 className="text-lg font-medium">No loans found</h3>
                    <p className="text-neutral-500 mt-1">
                      This client doesn't have any loans yet
                    </p>
                    <Button
                      onClick={() => setIsAddLoanModalOpen(true)}
                      variant="outline"
                      className="mt-4"
                    >
                      Create New Loan
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead>
                        <tr className="bg-neutral-50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Loan Number
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Start Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            End Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Interest
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {loans.map((loan) => (
                          <tr key={loan.id} className="hover:bg-neutral-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <Landmark className="h-4 w-4 mr-2 text-neutral-400" />
                                <span className="font-medium">{loan.loanNumber}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-medium">
                              {formatCurrency(loan.amount)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-neutral-400" />
                                {formatDate(loan.startDate)}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-neutral-400" />
                                {formatDate(loan.endDate)}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {`${loan.interestRate}% (${loan.interestType})`}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Badge variant={getLoanStatusColor(loan.status)}>
                                {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <Link href={`/loans/${loan.id}`}>
                                <Button size="sm" variant="ghost">
                                  View Details
                                </Button>
                              </Link>
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
          
          <TabsContent value="active-loans">
            <Card>
              <CardHeader className="border-b border-neutral-200">
                <CardTitle>Active Loans</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingLoans ? (
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : loans.filter(loan => loan.status === 'active').length === 0 ? (
                  <div className="p-6 text-center">
                    <Landmark className="h-12 w-12 text-neutral-300 mx-auto mb-2" />
                    <h3 className="text-lg font-medium">No active loans</h3>
                    <p className="text-neutral-500 mt-1">
                      This client doesn't have any active loans
                    </p>
                    <Button
                      onClick={() => setIsAddLoanModalOpen(true)}
                      variant="outline"
                      className="mt-4"
                    >
                      Create New Loan
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead>
                        <tr className="bg-neutral-50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Loan Number
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Start Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            End Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Interest
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {loans
                          .filter(loan => loan.status === 'active')
                          .map((loan) => (
                            <tr key={loan.id} className="hover:bg-neutral-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <Landmark className="h-4 w-4 mr-2 text-neutral-400" />
                                  <span className="font-medium">{loan.loanNumber}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-medium">
                                {formatCurrency(loan.amount)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-2 text-neutral-400" />
                                  {formatDate(loan.startDate)}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-2 text-neutral-400" />
                                  {formatDate(loan.endDate)}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {`${loan.interestRate}% (${loan.interestType})`}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <Link href={`/loans/${loan.id}`}>
                                  <Button size="sm" variant="ghost">
                                    View Details
                                  </Button>
                                </Link>
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
          
          <TabsContent value="completed-loans">
            <Card>
              <CardHeader className="border-b border-neutral-200">
                <CardTitle>Completed Loans</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingLoans ? (
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : loans.filter(loan => loan.status === 'completed').length === 0 ? (
                  <div className="p-6 text-center">
                    <Landmark className="h-12 w-12 text-neutral-300 mx-auto mb-2" />
                    <h3 className="text-lg font-medium">No completed loans</h3>
                    <p className="text-neutral-500 mt-1">
                      This client doesn't have any completed loans yet
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead>
                        <tr className="bg-neutral-50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Loan Number
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Start Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            End Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Interest
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-neutral-200">
                        {loans
                          .filter(loan => loan.status === 'completed')
                          .map((loan) => (
                            <tr key={loan.id} className="hover:bg-neutral-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <Landmark className="h-4 w-4 mr-2 text-neutral-400" />
                                  <span className="font-medium">{loan.loanNumber}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-medium">
                                {formatCurrency(loan.amount)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-2 text-neutral-400" />
                                  {formatDate(loan.startDate)}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-2 text-neutral-400" />
                                  {formatDate(loan.endDate)}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {`${loan.interestRate}% (${loan.interestType})`}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <Link href={`/loans/${loan.id}`}>
                                  <Button size="sm" variant="ghost">
                                    View Details
                                  </Button>
                                </Link>
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

      {/* Edit Client Modal */}
      <ClientForm
        isOpen={isEditClientModalOpen}
        onClose={() => setIsEditClientModalOpen(false)}
        onSuccess={handleClientUpdateSuccess}
        defaultValues={{
          name: client.name,
          phone: client.phone,
          email: client.email,
          address: client.address || "",
        }}
        isEditing={true}
        clientId={client.id}
      />

      {/* Add Loan Modal */}
      <LoanForm
        isOpen={isAddLoanModalOpen}
        onClose={() => setIsAddLoanModalOpen(false)}
        onSuccess={handleLoanSuccess}
      />
    </AppShell>
  );
}
