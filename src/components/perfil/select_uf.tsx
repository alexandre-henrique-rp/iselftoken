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
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  isLoading: boolean;
  IsLoadingState: (value: boolean) => void;
}

interface Uf {
  id: number;
  iso2: string;
  name: string;
}

export default function SelectUf({
  pais,
  value = '',
  onChange,
  error,
  isLoading = true,
  IsLoadingState,
}: Props) {
  const [Ufs, setUfs] = useState<Uf[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentValue, setCurrentValue] = useState<string>(value || '');

  useEffect(() => {
    const fetchUfs = async () => {
      try {
        const res = await fetch(`/api/location/states?country=${pais}`);
        if (!res.ok) throw new Error('Falha ao carregar estados');
        const data = await res.json();
        setUfs(data.data);
      } catch (error) {
        console.error('Erro ao carregar estados:', error);
      } finally {
        setLoading(false);
        IsLoadingState(false);
      }
    };

    if (pais) {
      fetchUfs();
    }
  }, [pais, IsLoadingState]);

  if (isLoading || loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-50" />
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
        <SelectTrigger className="w-50">
          <SelectValue placeholder="Selecione o estado" />
        </SelectTrigger>
        <SelectContent>
          {Ufs.length > 0 ? (
            Ufs.map((uf) => (
              <SelectItem key={uf.id} value={uf.iso2}>
                {uf.name}
              </SelectItem>
            ))
          ) : (
            <div className="text-muted-foreground px-2 py-1.5 text-sm">
              Nenhum estado encontrado
            </div>
          )}
        </SelectContent>
      </Select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
