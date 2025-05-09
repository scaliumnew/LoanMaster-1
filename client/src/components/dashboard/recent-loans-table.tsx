import React from "react";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, getInitials, getLoanStatusColor } from "@/lib/utils";
import { MoreVertical } from "lucide-react";

interface Loan {
  id: number;
  loanNumber: string;
  clientName: string;
  amount: string | number;
  date: string | Date;
  type: string;
  status: string;
}

interface RecentLoansTableProps {
  loans: Loan[];
  onViewAll: () => void;
}

export function RecentLoansTable({ loans, onViewAll }: RecentLoansTableProps) {
  return (
    <Card>
      <CardHeader className="px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
        <CardTitle className="text-base font-medium">Recent Loans</CardTitle>
        <Button variant="link" size="sm" onClick={onViewAll} className="text-primary">
          View All
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50">
                <TableHead className="text-sm font-medium text-neutral-500">
                  Client Name
                </TableHead>
                <TableHead className="text-sm font-medium text-neutral-500">
                  Loan ID
                </TableHead>
                <TableHead className="text-sm font-medium text-neutral-500">
                  Amount
                </TableHead>
                <TableHead className="text-sm font-medium text-neutral-500">
                  Date
                </TableHead>
                <TableHead className="text-sm font-medium text-neutral-500">
                  Type
                </TableHead>
                <TableHead className="text-sm font-medium text-neutral-500">
                  Status
                </TableHead>
                <TableHead className="text-sm font-medium text-neutral-500">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => (
                <TableRow
                  key={loan.id}
                  className="border-b border-neutral-100 hover:bg-primary-light/5"
                >
                  <TableCell>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700 mr-2">
                        {getInitials(loan.clientName)}
                      </div>
                      <span className="font-medium text-neutral-800">
                        {loan.clientName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {loan.loanNumber}
                  </TableCell>
                  <TableCell className="text-neutral-800 font-medium">
                    {formatCurrency(loan.amount)}
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {formatDate(new Date(loan.date))}
                  </TableCell>
                  <TableCell>
                    <Badge variant="primary">
                      {loan.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getLoanStatusColor(loan.status)}>
                      {loan.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/loans/${loan.id}`}>
                      <Button variant="ghost" size="icon" className="text-primary h-8 w-8">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
