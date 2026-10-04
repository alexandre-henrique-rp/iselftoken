import { Loader2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useUpdateIdentityMutation } from "~/hooks/use-update-identity-mutation";
import { applyCnpjMask, applyCpfMask, applyRgMask } from "~/lib/mask-utils";
import type { UserData } from "~/types/auth";

interface ProfileIdentityCardProps {
  user: UserData | null | undefined;
}

interface IdentityForm {
  nome: string;
  telefone: string;
  data_nascimento: string;
  genero: UserData["genero"] | "";
  tipo_documento: UserData["tipo_documento"] | "";
  reg_documento: string;
}

function snapshot(user: UserData | null | undefined): IdentityForm {
  return {
    nome: user?.nome ?? "",
    telefone: user?.telefone ?? "",
    data_nascimento: user?.data_nascimento?.slice(0, 10) ?? "",
    genero: user?.genero ?? "",
    tipo_documento: user?.tipo_documento ?? "",
    reg_documento: user?.reg_documento ?? "",
  };
}

/**
 * Aplica a máscara dinâmica do campo de documento conforme o tipo selecionado.
 *  - CPF              → 999.999.999-99
 *  - CNPJ             → 99.999.999/0001-99 (numérico legado)
 *  - PASSPORT         → sem máscara (alfanumérico livre)
 *  - NATIONAL_ID      → sem máscara (DNI / ID Card alfanumérico)
 *  - DRIVER_LICENSE   → sem máscara (CNH — o padrão varia por estado)
 *  - RESIDENCE_PERMIT → sem máscara (RNM / CRNM alfanumérico)
 *  - RG               → 99.999.999-9 (SP)
 *  - (vazio)          → sem máscara
 *
 * Para CNPJ alfanumérico (IN RFB 2.229/2024) ver
 * `use-update-identity-mutation.ts` — o backend aceita letras no radical.
 */
function maskDocument(
  value: string,
  type: IdentityForm["tipo_documento"],
): string {
  switch (type) {
    case "CPF":
      return applyCpfMask(value);
    case "CNPJ":
      // Backend aceita CNPJ alfanumérico (IN RFB 2.229/2024). Usa a máscara
      // alfanumérica aqui para consistência com o cadastro de startup.
      return applyCnpjMask(value);
    case "RG":
      return applyRgMask(value);
    default:
      // PASSPORT / NATIONAL_ID / DRIVER_LICENSE / RESIDENCE_PERMIT — sem máscara.
      return value;
  }
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

const GENERO_OPTIONS: Array<{ value: UserData["genero"]; label: string }> = [
  { value: "HOMEM", label: "Masculino" },
  { value: "MULHER", label: "Feminino" },
  { value: "OUTRO", label: "Outro" },
];

const DOC_OPTIONS: Array<{ value: UserData["tipo_documento"]; label: string }> =
  [
    { value: "RG", label: "RG" },
    { value: "CPF", label: "CPF" },
    { value: "PASSPORT", label: "Passaporte" },
    { value: "NATIONAL_ID", label: "DNI / ID Card" },
    { value: "DRIVER_LICENSE", label: "CNH" },
    { value: "RESIDENCE_PERMIT", label: "RNM / CRNM" },
  ];

export function ProfileIdentityCard({ user }: ProfileIdentityCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<IdentityForm>(() => snapshot(user));

  useEffect(() => {
    if (!editing) setForm(snapshot(user));
  }, [user, editing]);

  const mutation = useUpdateIdentityMutation();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form, {
      onSuccess: () => setEditing(false),
    });
  };

  return (
    <section className="glass-panel rounded-xl border border-white/5 p-5 md:p-6">
      <header className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 text-base font-bold text-foreground sm:text-lg">
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="size-4" />
          </span>
          Identidade
        </h2>
        {editing ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={mutation.isPending}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-surface-container-high transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="identity-form"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {mutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              Salvar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            Editar
          </button>
        )}
      </header>

      {editing ? (
        <form
          id="identity-form"
          onSubmit={handleSave}
          className="grid gap-3.5 sm:grid-cols-2"
        >
          <Field label="Nome">
            <input
              required
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="Telefone">
            <input
              value={form.telefone}
              onChange={(e) =>
                setForm((f) => ({ ...f, telefone: e.target.value }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Data de nascimento">
            <input
              type="date"
              value={form.data_nascimento}
              onChange={(e) =>
                setForm((f) => ({ ...f, data_nascimento: e.target.value }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Gênero">
            <select
              value={form.genero}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  genero: e.target.value as IdentityForm["genero"],
                }))
              }
              className={selectClass}
            >
              <option value="">—</option>
              {GENERO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de documento">
            <select
              value={form.tipo_documento}
              onChange={(e) => {
                const newType = e.target
                  .value as IdentityForm["tipo_documento"];
                setForm((f) => ({
                  ...f,
                  tipo_documento: newType,
                  // Re-aplica a máscara no valor atual com o novo tipo.
                  reg_documento: maskDocument(f.reg_documento, newType),
                }));
              }}
              className={selectClass}
            >
              <option value="">—</option>
              {DOC_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Número do documento">
            <input
              value={form.reg_documento}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  reg_documento: maskDocument(e.target.value, f.tipo_documento),
                }))
              }
              placeholder={
                form.tipo_documento === "CPF"
                  ? "000.000.000-00"
                  : form.tipo_documento === "CNPJ"
                    ? "00.000.000/0000-00"
                    : form.tipo_documento === "RG"
                      ? "00.000.000-0"
                      : "Digite o número do documento"
              }
              className={inputClass}
            />
          </Field>
          {mutation.isError ? (
            <p className="col-span-full text-xs text-destructive font-medium">
              {mutation.error.message}
            </p>
          ) : null}
        </form>
      ) : (
        <dl className="grid gap-3.5 sm:grid-cols-2">
          <ReadField label="Nome" value={user?.nome} />
          <ReadField label="Telefone" value={user?.telefone} />
          <ReadField
            label="Nascimento"
            value={formatDate(user?.data_nascimento)}
          />
          <ReadField
            label="Gênero"
            value={user?.genero ? user.genero.toLowerCase() : undefined}
          />
          <ReadField
            label={`Documento (${user?.tipo_documento ?? "—"})`}
            value={user?.reg_documento}
            full
          />
        </dl>
      )}
    </section>
  );
}

const inputClass =
  "w-full bg-surface-container-high border-none border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all py-2.5 px-3.5 text-foreground rounded-lg text-sm";
const selectClass =
  "w-full bg-surface-container-high border-none border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all py-2.5 px-3.5 text-foreground rounded-lg text-sm appearance-none cursor-pointer disabled:opacity-60";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 ml-0.5">
        {label}
      </span>
      {children}
    </label>
  );
}

function ReadField({
  label,
  value,
  full = false,
}: {
  label: string;
  value: string | undefined;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </dt>
      <dd className="text-sm font-medium capitalize text-foreground px-0.5">
        {value || "—"}
      </dd>
    </div>
  );
}
