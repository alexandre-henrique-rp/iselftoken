import {
  BookMarkedIcon,
  FactoryIcon,
  GraduationCapIcon,
  Home,
  LayersPlusIcon,
  Sheet,
} from "lucide-react";
import type { MenuData } from "~/types/menuItem";

export const PrimaryMenu: MenuData[] = [
  {
    title: "Home",
    url: "/home",
    icon: Home,
    isActive: true,
    role: "ALL",
  },
  {
    title: "startups",
    icon: FactoryIcon,
    isActive: false,
    role: "STARTUP",
    items: [
      {
        title: "Minhas startups",
        url: "/startups/dashboard",
        icon: Sheet,
        role: "STARTUP",
      },
      {
        title: "Add Startup",
        url: "/startups/new",
        icon: LayersPlusIcon,
        role: "STARTUP",
      },
      {
        title: "Campanhas",
        url: "/startups/campaigns",
        icon: BookMarkedIcon,
        role: "STARTUP",
      },
    ],
  },
];

export const SecondaryMenu: MenuData[] = [
  {
    title: "Education",
    url: "https://iselftoken.net/portugues/",
    icon: GraduationCapIcon,
    isActive: true,
    role: "ALL",
  },
];
