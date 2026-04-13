import { MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { EstadoType } from "~/types/estados";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Skeleton } from "./ui/skeleton";

interface SelectEstadoProps {
  pais?: { id: number };
  value?: string;
  onChange: (value: { id: number; iso2: string }) => void;
}

export function SelectEstado({ pais, value, onChange }: SelectEstadoProps) {
  const [estados, setEstados] = useState<EstadoType[]>([]);
  const [isLoading, setIsLoading] = useState(() => !!pais?.id);

  useEffect(() => {
    if (!pais?.id) {
      setEstados([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    (async () => {
      try {
        const response = await fetch(`/api/geral/estados/${pais.id}`);
        const data = await response.json();
        setEstados(data.data || []);
      } catch (error) {
        console.error("Erro ao carregar estados:", error);
        setEstados([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [pais]);

  const estadoItems = useMemo(() => {
    return estados.map((estado) => (
      <SelectItem
        key={estado.id}
        value={String(estado.iso2)}
        className="text-stone-100 focus:bg-stone-700 focus:text-stone-100"
      >
        {estado.iso2}
      </SelectItem>
    ));
  }, [estados]);

  if (isLoading) {
    return (
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
        <Skeleton className="h-10 w-full bg-stone-700 rounded-md" />
      </div>
    );
  }

  return (
    <Select
      value={value ?? ""}
      onValueChange={(val) => {
        const estado = estados.find((estado) => estado.iso2 === val);
        if (!estado) return;
        onChange({ id: estado.id, iso2: estado.iso2 });
      }}
      disabled={!pais || estados.length === 0}
    >
      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
      <SelectTrigger className="bg-stone-800 border-stone-700 text-stone-100 w-full h-10 pl-10">
        <SelectValue
          className="text-stone-100"
          placeholder="Selecione um estado"
        />
      </SelectTrigger>
      <SelectContent
        className="bg-stone-800 border-stone-700 max-h-75"
        position="popper"
        sideOffset={4}
      >
        {estadoItems}
      </SelectContent>
    </Select>
  );
}
