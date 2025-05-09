import React from "react";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden mr-2 text-neutral-700"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
          <h2 className="text-lg font-medium text-neutral-800">{title}</h2>
        </div>
        <div className="flex items-center">
          <div className="relative mr-3">
            <Button variant="ghost" size="icon" className="text-neutral-500">
              <Bell className="h-5 w-5" />
            </Button>
            <span className="absolute top-0 right-0 h-4 w-4 bg-destructive rounded-full flex items-center justify-center text-white text-xs">
              3
            </span>
          </div>
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white mr-2">
              JD
            </div>
            <span className="text-sm font-medium text-neutral-700 hidden sm:block">
              John Doe
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
