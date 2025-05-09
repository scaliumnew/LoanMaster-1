import React, { useState } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { Landmark, Wallet, Users, FileText, Menu } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} onMenuClick={toggleMobileSidebar} />
        <main className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50">
          {children}
        </main>
      </div>

      {/* Bottom action bar for mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 py-2 px-4 flex justify-around md:hidden">
        <button
          className="flex flex-col items-center text-primary"
          onClick={() => {}}
        >
          <Landmark className="h-5 w-5" />
          <span className="text-xs mt-1">New Loan</span>
        </button>
        <button
          className="flex flex-col items-center text-primary"
          onClick={() => {}}
        >
          <Wallet className="h-5 w-5" />
          <span className="text-xs mt-1">Payment</span>
        </button>
        <button
          className="flex flex-col items-center text-neutral-500"
          onClick={toggleMobileSidebar}
        >
          <Users className="h-5 w-5" />
          <span className="text-xs mt-1">Clients</span>
        </button>
        <button
          className="flex flex-col items-center text-neutral-500"
          onClick={toggleMobileSidebar}
        >
          <FileText className="h-5 w-5" />
          <span className="text-xs mt-1">Reports</span>
        </button>
        <button
          className="flex flex-col items-center text-neutral-500"
          onClick={toggleMobileSidebar}
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs mt-1">Menu</span>
        </button>
      </div>
    </div>
  );
}

export function MobileBottomNav({
  onNewLoan,
  onNewPayment,
}: {
  onNewLoan: () => void;
  onNewPayment: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 py-2 px-4 flex justify-around md:hidden">
      <button
        className="flex flex-col items-center text-primary"
        onClick={onNewLoan}
      >
        <Landmark className="h-5 w-5" />
        <span className="text-xs mt-1">New Loan</span>
      </button>
      <button
        className="flex flex-col items-center text-primary"
        onClick={onNewPayment}
      >
        <Wallet className="h-5 w-5" />
        <span className="text-xs mt-1">Payment</span>
      </button>
    </div>
  );
}
