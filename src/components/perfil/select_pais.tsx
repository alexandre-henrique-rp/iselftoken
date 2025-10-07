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

interface Pais {
  id: number;
  iso3: string;
  emoji: string;
  native: string;
}

interface SelectPaisProps {
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  isLoading: (value: boolean) => void;
}

export default function SelectPais({ value, onChange, error, isLoading }: SelectPaisProps) {
  const [paises, setPaises] = useState<Pais[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    const fetchPaises = async () => {
      try {
        const res = await fetch('/api/location/countries');
        if (!res.ok) throw new Error('Falha ao carregar países');
        const data = await res.json();
        setPaises(data.data);
      } catch (error) {
        console.error('Erro ao carregar países:', error);
      } finally {
        setLoading(false);
        isLoading(false);
      }
    };

    fetchPaises();
  }, [isLoading]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-70" />
      </div>
    );
  }

  const handleValueChange = (value: string) => {
    setCurrentValue(value);
    onChange(value);
  };

  return (
    <>
      <Select value={currentValue} onValueChange={handleValueChange}>
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        <SelectTrigger className="w-70">
          <SelectValue placeholder="Selecione o país" />
        </SelectTrigger>
        <SelectContent>
          {paises.map((pais) => (
            <SelectItem key={pais.id} value={pais.iso3}>
              {pais.emoji} {pais.native}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
