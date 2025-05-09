import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Landmark,
  Wallet,
  FileText,
  Settings,
} from "lucide-react";

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const [location] = useLocation();

  const isActiveRoute = (route: string) => {
    return location === route;
  };

  const sidebarItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Clients",
      href: "/clients",
      icon: Users,
    },
    {
      name: "Loans",
      href: "/loans",
      icon: Landmark,
    },
    {
      name: "Payments",
      href: "/payments",
      icon: Wallet,
    },
    {
      name: "Reports",
      href: "/reports",
      icon: FileText,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <div
      className={cn(
        "bg-white w-64 shadow-lg flex-shrink-0 transition-all duration-300 ease-in-out",
        "fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="p-4 border-b border-neutral-200">
        <h1 className="text-2xl font-bold text-primary">LoanManager Pro</h1>
        <p className="text-sm text-neutral-500">NBFC Loan Management</p>
      </div>
      <div className="py-2 custom-scrollbar overflow-y-auto h-[calc(100vh-72px)]">
        {sidebarItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a
              className={cn(
                "px-4 py-3 flex items-center cursor-pointer",
                isActiveRoute(item.href)
                  ? "bg-primary/10 border-l-4 border-primary text-primary font-medium"
                  : "text-neutral-700 hover:bg-primary/5"
              )}
              onClick={(e) => {
                if (onCloseMobile) {
                  onCloseMobile();
                }
              }}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span>{item.name}</span>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
