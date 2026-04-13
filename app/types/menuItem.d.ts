import { type LucideIcon } from "lucide-react";

export interface MenuData {
  title: string;
  url?: string;
  icon: LucideIcon;
  isActive: boolean;
  role: "ALL" | "STARTUP" | "ADMIN" | "FINANCEIRO" | "COMPLIANCE";
  items?: MenuItem[];
}

export interface MenuItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  role?: "ALL" | "STARTUP" | "ADMIN" | "FINANCEIRO" | "COMPLIANCE";
}
