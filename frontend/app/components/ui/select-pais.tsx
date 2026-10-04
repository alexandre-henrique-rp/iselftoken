import { type ChangeEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { countriesQueryOptions, type Country } from "~/lib/queries";

interface SelectPaisProps {
  value: string; // ISO3
  onChange: (iso3: string) => void;
  id?: string;
  disabled?: boolean;
}

export function SelectPais({ value, onChange, id, disabled }: SelectPaisProps) {
  const { data: countries = [] } = useQuery<Country[]>(countriesQueryOptions);
  const selected = countries.find((c) => c.iso3 === value);

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <select
      id={id}
      disabled={disabled}
      className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
      value={selected ? value : ""}
      onChange={handleChange}
    >
      <option value="" disabled>
        Selecione um país
      </option>
      {countries.map((pais) => (
        <option key={pais.iso3} value={pais.iso3}>
          {pais.name}
        </option>
      ))}
    </select>
  );
}
