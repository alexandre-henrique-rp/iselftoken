import { useQuery } from "@tanstack/react-query";
import { Globe, Loader2 } from "lucide-react";
import type { Pais } from "~/types/auth";
import { countriesQueryOptions, type Country } from "~/lib/queries";

interface CountrySelectProps {
  value: Pais | null;
  onChange: (pais: Pais | null) => void;
  disabled?: boolean;
}

export function CountrySelect({ value, onChange, disabled }: CountrySelectProps) {
  const { data: countries = [], isLoading } = useQuery(countriesQueryOptions);

  const selectedIso3 = value?.iso3 ?? "";

  const handleChange = (iso3: string) => {
    if (!iso3) {
      onChange(null);
      return;
    }
    const country: Country | undefined = countries.find((c) => c.iso3 === iso3);
    if (!country) {
      onChange(null);
      return;
    }
    onChange({
      id: country.id,
      iso3: country.iso3,
      nome: country.name,
      emoji: country.emoji,
    });
  };

  return (
    <div className="relative">
      <select
        value={selectedIso3}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled || isLoading}
        className="w-full appearance-none rounded-lg border border-border bg-surface-container-high py-2.5 pl-3 pr-9 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
      >
        <option value="" className="bg-black text-muted-foreground">
          Selecione um país
        </option>
        {countries.map((country) => (
          <option key={country.id} value={country.iso3} className="bg-black text-foreground">
            {country.emoji} {country.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
        {isLoading ? <Loader2 className="size-3 animate-spin" /> : <Globe className="size-3" />}
      </div>
    </div>
  );
}
