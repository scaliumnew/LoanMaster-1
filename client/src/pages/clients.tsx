import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AppShell } from "@/components/layout/app-shell";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, UserCircle, ArrowUpRight, Phone, Mail } from "lucide-react";
import { ClientForm } from "@/components/clients/client-form";
import { formatDate, getInitials } from "@/lib/utils";
import { MobileBottomNav } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
}

export default function ClientsPage() {
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch clients
  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch("/api/clients");
      if (!response.ok) {
        throw new Error("Failed to fetch clients");
      }
      return response.json();
    },
  });

  // Define columns for the data table
  const columns = [
    {
      accessorKey: "name",
      header: "Client Name",
      cell: ({ row }: any) => {
        const client = row.original;
        return (
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700 mr-2">
              {getInitials(client.name)}
            </div>
            <span className="font-medium text-neutral-800">{client.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }: any) => {
        const phone = row.getValue("phone");
        return (
          <div className="flex items-center">
            <Phone className="h-4 w-4 mr-2 text-neutral-400" />
            <span>{phone}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }: any) => {
        const email = row.getValue("email");
        return (
          <div className="flex items-center">
            <Mail className="h-4 w-4 mr-2 text-neutral-400" />
            <span>{email}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created On",
      cell: ({ row }: any) => {
        const date = row.getValue("createdAt");
        return formatDate(date);
      },
    },
    {
      id: "actions",
      cell: ({ row }: any) => {
        const client = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <Link href={`/clients/${client.id}`}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ArrowUpRight className="h-4 w-4" />
                <span className="sr-only">View details</span>
              </Button>
            </Link>
          </div>
        );
      },
    },
  ];

  // Filter clients based on search term
  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClientFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
  };

  return (
    <AppShell title="Clients">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Client Management</h1>
          <Button onClick={() => setIsAddClientModalOpen(true)} className="flex items-center">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>All Clients</CardTitle>
            <CardDescription>View and manage your clients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
                <Input
                  placeholder="Search clients by name, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {filteredClients.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <UserCircle className="h-12 w-12 text-neutral-300 mb-2" />
                <h3 className="text-lg font-medium">No clients found</h3>
                {searchTerm ? (
                  <p className="text-neutral-500 mt-1">
                    No clients match your search criteria
                  </p>
                ) : (
                  <p className="text-neutral-500 mt-1">
                    Add your first client to get started
                  </p>
                )}
                <Button
                  onClick={() => setIsAddClientModalOpen(true)}
                  variant="outline"
                  className="mt-4"
                >
                  Add Client
                </Button>
              </div>
            ) : (
              <DataTable columns={columns} data={filteredClients} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Client Modal */}
      <ClientForm
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        onSuccess={handleClientFormSuccess}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        onNewLoan={() => {}}
        onNewPayment={() => {}}
      />
    </AppShell>
  );
}
