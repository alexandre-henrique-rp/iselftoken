'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  pais: string;
  uf: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  isLoading: boolean;
  isLoadingState: boolean;
}

interface City {
  id: number;
  iso2: string;
  name: string;
}

export default function SelectCity({
  pais,
  uf,
  value = '',
  onChange,
  error,
  isLoading = true,
  isLoadingState = true,
}: Props) {
  const [Cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentValue, setCurrentValue] = useState<string>(value || '');

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const retState = await fetch(`/api/location/states?country=${pais}`);
        const stateData = await retState.json();
        const filtro = stateData.data.find((state: { iso2: string; name: string }) => state.iso2 === uf);
        if (!filtro.name) throw new Error('Estado não encontrado');
        const res = await fetch(`/api/location/cities?country=${pais}&state=${filtro.name}`);
        if (!res.ok) throw new Error('Falha ao carregar estados');
        const data = await res.json();
        setCities(data.data);
      } catch (error) {
        console.error('Erro ao carregar estados:', error);
      } finally {
        setLoading(false);
      }
    };

    if (pais && uf) {
      fetchCities();
    }
  }, [pais, uf]);

  if (isLoading || loading || isLoadingState) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-80" />
      </div>
    );
  }

  const handleValueChange = (newValue: string) => {
    setCurrentValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="w-full">
      <Select value={currentValue} onValueChange={handleValueChange}>
        <SelectTrigger className="w-80">
          <SelectValue placeholder="Selecione uma cidade" />
        </SelectTrigger>
        <SelectContent>
          {Cities.length > 0 ? (
            Cities.map((city) => (
              <SelectItem key={city.id} value={city.name}>
                {city.name}
              </SelectItem>
            ))
          ) : (
            <div className="text-muted-foreground px-2 py-1.5 text-sm">
              Nenhuma cidade encontrada
            </div>
          )}
        </SelectContent>
      </Select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
