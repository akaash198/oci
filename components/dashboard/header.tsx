"use client";

import { Bell, Search, Menu, Sun, Moon, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuClick?: () => void;
  className?: string;
}

export function Header({ onMenuClick, className }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  // Mock alerts for demo
  const alerts = [
    { id: 1, type: "critical", title: "FDI Attack Detected", time: "2m ago", source: "Substation 1" },
    { id: 2, type: "high", title: "Anomalous Network Traffic", time: "5m ago", source: "SCADA Server" },
    { id: 3, type: "medium", title: "Firmware Integrity Alert", time: "12m ago", source: "PLC-001" },
    { id: 4, type: "low", title: "Unusual Login Pattern", time: "1h ago", source: "HMI Workstation" },
  ];

  const getSeverityColor = (type: string) => {
    switch (type) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-muted";
    }
  };

  return (
    <header className={cn("flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6", className)}>
      {/* Mobile menu button */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search assets, alerts, incidents..."
          className="pl-9 bg-muted/50"
        />
      </div>

      {/* Status indicators */}
      <div className="hidden items-center gap-4 md:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">All Systems Operational</span>
        </div>
        <Badge variant="outline" className="gap-1">
          <Shield className="h-3 w-3" />
          8 Models Active
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-medium text-destructive-foreground">
                {alerts.length}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Recent Alerts</span>
              <Badge variant="destructive" className="text-xs">
                {alerts.filter(a => a.type === "critical").length} Critical
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {alerts.map((alert) => (
              <DropdownMenuItem key={alert.id} className="flex flex-col items-start gap-1 p-3">
                <div className="flex w-full items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full", getSeverityColor(alert.type))} />
                  <span className="flex-1 font-medium text-sm">{alert.title}</span>
                  <span className="text-xs text-muted-foreground">{alert.time}</span>
                </div>
                <span className="text-xs text-muted-foreground ml-4">Source: {alert.source}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-primary">
              View all alerts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Emergency button */}
        <Button variant="destructive" size="sm" className="hidden gap-1 sm:flex">
          <AlertTriangle className="h-4 w-4" />
          Emergency
        </Button>
      </div>
    </header>
  );
}
