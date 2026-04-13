import { Building2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CidadeType } from "~/types/cidades";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Skeleton } from "./ui/skeleton";

interface SelectCidadeProps {
  pais?: { id: number };
  estadoId?: number | null;
  value?: string;
  onChange: (value: string) => void;
}

export function SelectCidade({
  pais,
  estadoId,
  value,
  onChange,
}: SelectCidadeProps) {
  const [cidades, setCidades] = useState<CidadeType[]>([]);
  const [isLoading, setIsLoading] = useState(() => !!(pais?.id && estadoId));

  useEffect(() => {
    if (!pais?.id || !estadoId) {
      setCidades([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    (async () => {
      try {
        const response = await fetch(
          `/api/geral/cidade/${pais.id}/${estadoId}`,
        );
        const data = await response.json();
        setCidades(data.data || []);
      } catch (error) {
        console.error("Erro ao carregar cidades:", error);
        setCidades([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [pais, estadoId]);

  const cidadeItems = useMemo(() => {
    return cidades.map((cidade) => (
      <SelectItem
        key={cidade.id}
        value={cidade.name}
        className="text-stone-100 focus:bg-stone-700 focus:text-stone-100"
      >
        {cidade.name}
      </SelectItem>
    ));
  }, [cidades]);

  if (isLoading) {
    return (
      <div className="relative">
        <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
        <Skeleton className="h-10 w-full bg-stone-700 rounded-md" />
      </div>
    );
  }

  return (
    <Select
      value={value ?? ""}
      onValueChange={onChange}
      disabled={!pais?.id || !estadoId}
    >
      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
      <SelectTrigger className="bg-stone-800 border-stone-700 text-stone-100 w-full h-10 pl-10">
        <SelectValue
          className="text-stone-100"
          placeholder="Selecione uma cidade"
        />
      </SelectTrigger>
      <SelectContent
        className="bg-stone-800 border-stone-700 max-h-75"
        position="popper"
        sideOffset={4}
      >
        {cidadeItems}
      </SelectContent>
    </Select>
  );
}
