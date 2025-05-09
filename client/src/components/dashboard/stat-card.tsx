import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  className?: string;
}

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("bg-white", className)}>
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-neutral-500 text-sm">{title}</p>
            <h3 className="text-2xl font-bold text-neutral-800">{value}</h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary-light/20 flex items-center justify-center">
            {icon}
          </div>
        </div>
        {trend && (
          <div className="flex items-center mt-2">
            <span
              className={cn(
                "flex items-center text-sm",
                trend.isPositive ? "text-success" : "text-destructive"
              )}
            >
              {trend.isPositive ? (
                <ArrowUp className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDown className="h-4 w-4 mr-1" />
              )}
              {trend.value}%
            </span>
            {trend.label && (
              <span className="text-neutral-500 text-sm ml-2">
                {trend.label}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
