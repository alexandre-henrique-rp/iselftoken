import { type LucideIcon } from "lucide-react";

export namespace Rotas {
  export interface Types {
    id: number,
    nome: string,
    path: string,
    url: string,
    isActive: boolean,
    menu: string,
    icon: any | LucideIcon | null,
  }
}