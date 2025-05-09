import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, BellRing, Info } from "lucide-react";
import { Link } from "wouter";

interface Alert {
  id: number;
  type: "warning" | "notification" | "info";
  title: string;
  description: string;
  link: string;
}

interface AlertsListProps {
  alerts: Alert[];
}

export function AlertsList({ alerts }: AlertsListProps) {
  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "warning":
        return (
          <div className="rounded-full h-8 w-8 bg-destructive/10 flex items-center justify-center mr-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
        );
      case "notification":
        return (
          <div className="rounded-full h-8 w-8 bg-warning/10 flex items-center justify-center mr-3">
            <BellRing className="h-4 w-4 text-warning" />
          </div>
        );
      case "info":
        return (
          <div className="rounded-full h-8 w-8 bg-primary/10 flex items-center justify-center mr-3">
            <Info className="h-4 w-4 text-primary" />
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="px-4 py-3 border-b border-neutral-200">
        <CardTitle className="text-base font-medium">
          Alerts & Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="px-4 py-3 border-b border-neutral-100 flex items-start"
          >
            {getAlertIcon(alert.type)}
            <div className="flex-1">
              <p className="text-neutral-800 font-medium">{alert.title}</p>
              <p className="text-neutral-500 text-sm">{alert.description}</p>
            </div>
            <div>
              <Link href={alert.link}>
                <Button variant="link" size="sm" className="text-primary p-0">
                  View
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
