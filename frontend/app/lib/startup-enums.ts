export type EstagioStartup =
  | "ideacao"
  | "mvp"
  | "operacao"
  | "tracao"
  | "escala"
  | "breakeven";

export const ESTAGIO_LABELS: Record<EstagioStartup, string> = {
  ideacao: "Ideação",
  mvp: "MVP",
  operacao: "Operação",
  tracao: "Tração",
  escala: "Escala",
  breakeven: "Breakeven",
};

export const ESTAGIO_VALUES = [
  "ideacao",
  "mvp",
  "operacao",
  "tracao",
  "escala",
  "breakeven",
] as const;

export const ESTAGIO_OPTIONS: ReadonlyArray<{ value: EstagioStartup; label: string }> = (
  Object.entries(ESTAGIO_LABELS) as [EstagioStartup, string][]
).map(([value, label]) => ({ value, label }));

export type AreaAtuacao =
  | "fintech"
  | "tecnologia_saas"
  | "healthtech"
  | "edtech"
  | "biotech"
  | "agrotech"
  | "retail"
  | "outro";

export const AREA_LABELS: Record<AreaAtuacao, string> = {
  fintech: "Fintech",
  tecnologia_saas: "Tecnologia / SaaS",
  healthtech: "HealthTech",
  edtech: "EdTech",
  biotech: "BioTech",
  agrotech: "AgroTech",
  retail: "Retail",
  outro: "Outro",
};

export const AREA_OPTIONS: ReadonlyArray<{ value: AreaAtuacao; label: string }> = (
  Object.entries(AREA_LABELS) as [AreaAtuacao, string][]
).map(([value, label]) => ({ value, label }));
