import { Award, Clock, TrendingUp, Zap } from "lucide-react";

export const categories = [
  { id: "all", label: "Todas", icon: null },
  { id: "trending", label: "Em Alta", icon: TrendingUp },
  { id: "featured", label: "Destaque", icon: Award },
  { id: "ending-soon", label: "Encerrando", icon: Clock },
  { id: "new", label: "Novas", icon: Zap }
];
