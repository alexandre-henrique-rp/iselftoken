import { Flag } from "lucide-react";
import { useEffect, useState } from "react";
import type { PaisType } from "~/types/paises";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface SelectPaisProps {
  value?: PaisType;
  onChange: (value: PaisType) => void;
}

export function SelectPais({ value, onChange }: SelectPaisProps) {
  const [DadosApi, setDadosApi] = useState<PaisType[]>([]);

  useEffect(() => {
    (async () => {
      const response = await fetch("/api/geral/paises");
      const data = await response.json();
      setDadosApi(data.data);
    })();
  }, []);

  const handleChange = (value: string) => {
    const pais = DadosApi.find((pais) => pais.iso3 === value);
    if (!pais) return;
    onChange(pais);
  };
  return (
    <div className="relative">
      <Select
        value={value?.iso3 ?? ""}
        onValueChange={(value) => handleChange(value)}
      >
        <Flag className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-stone-500" />
        <SelectTrigger className="h-10 w-full border-stone-700 bg-stone-800 pl-10 text-stone-100">
          <SelectValue
            className="text-stone-100"
            placeholder="Selecione um país"
          />
        </SelectTrigger>
        <SelectContent className="bg-stone-800 border-stone-700">
          {DadosApi.map((option) => (
            <SelectItem
              key={option.id}
              value={option.iso3}
              className="text-stone-100 focus:bg-stone-700 focus:text-stone-100"
            >
              {option.emoji} {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
