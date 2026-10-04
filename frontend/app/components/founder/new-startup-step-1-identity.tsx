import { FileText, Loader2, Search, Upload } from "lucide-react";
import type { ChangeEvent } from "react";
import { StartupCascataSelect } from "~/components/startup/startup-cascata-select";
import { InitialsImage } from "~/components/ui/initials-image";
import { ESTAGIO_VALUES } from "~/lib/new-startup-schema";
import { FormFieldError, startupInputClass } from "./new-startup-form-field";
import type { StartupStepProps } from "./new-startup-types";

const ESTAGIO_MAP: Record<string, string> = {
  ideacao: "Ideação",
  mvp: "MVP",
  operacao: "Operação",
  tracao: "Tração",
  escala: "Escala",
  breakeven: "Breakeven",
};

interface IdentityStepProps extends StartupStepProps {
  isLookingCnpj: boolean;
  onCnpjChange: (value: string) => void;
  onCnpjLookup: () => void;
  onLogoUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onPitchDeckUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  logoPreviewUrl: string | null;
  pitchDeckFileName: string | null;
  logoUploading: boolean;
  pitchDeckUploading: boolean;
  logoUploadError: string | null;
  pitchDeckUploadError: string | null;
}

export function NewStartupStep1Identity({
  form,
  countries,
  isLookingCnpj,
  onCnpjChange,
  onCnpjLookup,
  onLogoUpload,
  onPitchDeckUpload,
  logoPreviewUrl,
  pitchDeckFileName,
  logoUploading,
  pitchDeckUploading,
  logoUploadError,
  pitchDeckUploadError,
}: IdentityStepProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const values = watch();
  const errorId = (field: string) => `startup-${field}-error`;
  const invalid = (field: keyof typeof errors) => Boolean(errors[field]);
  const describedBy = (field: keyof typeof errors) =>
    errors[field] ? errorId(String(field)) : undefined;
  const uploadStatus = logoUploadError || pitchDeckUploadError;

  return (
    <section aria-labelledby="step-1-title" className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Etapa 1 de 3
        </p>
        <h2
          id="step-1-title"
          className="mt-1 text-2xl font-bold text-foreground"
        >
          Informações da startup
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-2 md:p-5 lg:gap-5 lg:p-6">
        <div className="space-y-2 md:col-span-2">
          <label
            htmlFor="cnpj"
            className="text-sm font-semibold text-foreground"
          >
            CNPJ
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="cnpj"
              className={`${startupInputClass} ${invalid("cnpj") ? "border-destructive" : ""}`}
              placeholder="00.000.000/0000-00"
              type="text"
              value={values.cnpj || ""}
              onChange={(event) => onCnpjChange(event.target.value)}
              aria-invalid={invalid("cnpj")}
              aria-describedby={describedBy("cnpj")}
            />
            <button
              type="button"
              onClick={onCnpjLookup}
              disabled={
                isLookingCnpj ||
                String(values.cnpj || "").replace(/[^A-Z0-9]/gi, "").length !==
                  14
              }
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-primary/30 px-4 text-sm font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Buscar dados do CNPJ"
            >
              {isLookingCnpj ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="h-4 w-4" aria-hidden="true" />
              )}{" "}
              Buscar
            </button>
          </div>
          <FormFieldError id={errorId("cnpj")} error={errors.cnpj} />
          <p className="text-xs text-muted-foreground">
            Ainda não possui CNPJ?{" "}
            <a
              href="https://maestro.redesim.gov.br/login"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Abra sua empresa no Inova Simples
            </a>
            .
          </p>
        </div>
        <FormInput
          id="nomeFantasia"
          label="Nome da startup (fantasia)"
          placeholder="Ex: Nova Cloud"
          register={register("nomeFantasia")}
          error={errors.nomeFantasia}
          describedBy={describedBy("nomeFantasia")}
        />
        <FormInput
          id="razaoSocial"
          label="Razão social"
          placeholder="Ex: Tech Solutions LTDA"
          register={register("razaoSocial")}
          error={errors.razaoSocial}
          describedBy={describedBy("razaoSocial")}
        />
        <FormInput
          id="dataAbertura"
          label="Data de abertura"
          placeholder="Ex: 10/12/2022"
          register={register("dataAbertura")}
          error={errors.dataAbertura}
          describedBy={describedBy("dataAbertura")}
        />
        <div className="space-y-2">
          <label
            htmlFor="paisIso3"
            className="text-sm font-semibold text-foreground"
          >
            País sede
          </label>
          <select
            id="paisIso3"
            className={`${startupInputClass} ${invalid("paisIso3") ? "border-destructive" : ""}`}
            {...register("paisIso3")}
            aria-invalid={invalid("paisIso3")}
            aria-describedby={describedBy("paisIso3")}
          >
            <option value="" disabled>
              Selecione um país
            </option>
            {countries.map((country) => (
              <option key={country.iso3} value={country.iso3}>
                {country.name}
              </option>
            ))}
          </select>
          <FormFieldError id={errorId("paisIso3")} error={errors.paisIso3} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-foreground">
            Categoria e área de atuação
          </span>
          <StartupCascataSelect
            value={{
              categoryId: values.categoryId ?? null,
              areaAtuacaoIds: values.areaAtuacaoIds ?? [],
            }}
            onChange={(next) => {
              setValue(
                "categoryId",
                next.categoryId ?? (undefined as unknown as number),
                { shouldDirty: true, shouldValidate: true },
              );
              setValue("areaAtuacaoIds", next.areaAtuacaoIds, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
            error={
              (errors.categoryId?.message as string | undefined) ||
              (errors.areaAtuacaoIds?.message as string | undefined)
            }
            categoryId="categoryId"
            areaId="areaAtuacaoId"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="estagio"
            className="text-sm font-semibold text-foreground"
          >
            Estágio da startup
          </label>
          <select
            id="estagio"
            className={`${startupInputClass} ${invalid("estagio") ? "border-destructive" : ""}`}
            {...register("estagio")}
            aria-invalid={invalid("estagio")}
            aria-describedby={describedBy("estagio")}
          >
            <option value="" disabled>
              Selecione o estágio
            </option>
            {ESTAGIO_VALUES.map((value) => (
              <option key={value} value={value}>
                {ESTAGIO_MAP[value]}
              </option>
            ))}
          </select>
          <FormFieldError id={errorId("estagio")} error={errors.estagio} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label
            htmlFor="descricao"
            className="text-sm font-semibold text-foreground"
          >
            Descrição do projeto
          </label>
          <textarea
            id="descricao"
            className={`${startupInputClass} min-h-24 resize-y ${invalid("descricao") ? "border-destructive" : ""}`}
            placeholder="Descreva o problema e a solução geral do seu projeto..."
            {...register("descricao")}
            aria-invalid={invalid("descricao")}
            aria-describedby={describedBy("descricao")}
            maxLength={1000}
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Mínimo 3 caracteres</span>
            <span className={invalid("descricao") ? "text-destructive font-bold" : ""}>
              {String(watch("descricao") || "").length}/1000
            </span>
          </div>
          <FormFieldError id={errorId("descricao")} error={errors.descricao} />
        </div>
        <div className="md:col-span-2 grid gap-4 border-t border-border pt-5 md:grid-cols-2 lg:gap-5">
          <div className="space-y-2">
            <UploadField
              id="logo"
              label="Logo (JPG ou PNG)"
              accept="image/jpeg,image/png"
              onChange={onLogoUpload}
              loading={logoUploading}
              status={
                logoUploadError ||
                (logoUploading
                  ? "Enviando logo..."
                  : logoPreviewUrl
                    ? "Logo enviada. Clique para substituir."
                    : "Clique para enviar a logo")
              }
              preview={
                logoPreviewUrl ? (
                  <InitialsImage
                    name={String(values.nomeFantasia || "Startup")}
                    src={logoPreviewUrl}
                    alt="Prévia da logo da startup"
                    className="h-16 w-16 rounded-xl border border-border"
                  />
                ) : undefined
              }
            />
            <FormFieldError id={errorId("logo")} error={errors.logo} />
          </div>
          <div className="space-y-2">
            <UploadField
              id="pitchDeck"
              label="Pitch Deck (PDF)"
              accept="application/pdf"
              onChange={onPitchDeckUpload}
              loading={pitchDeckUploading}
              status={
                pitchDeckUploadError ||
                (pitchDeckUploading
                  ? "Enviando PDF..."
                  : pitchDeckFileName || "Clique para enviar o Pitch Deck")
              }
              preview={
                pitchDeckFileName ? (
                  <FileText
                    className="h-8 w-8 text-primary"
                    aria-hidden="true"
                  />
                ) : undefined
              }
            />
            <FormFieldError
              id={errorId("pitchDeck")}
              error={errors.pitchDeck}
            />
          </div>
        </div>
        {uploadStatus && (
          <p role="status" className="text-sm text-destructive md:col-span-2">
            {uploadStatus}
          </p>
        )}
        <div className="grid gap-4 md:col-span-2 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          <FormInput
            id="videoPitch"
            label="Link do YouTube Pitch"
            placeholder="https://youtube.com/watch?v=..."
            type="url"
            register={register("videoPitch")}
            error={errors.videoPitch}
            describedBy={describedBy("videoPitch")}
          />
          <FormInput
            id="website"
            label="Link do site"
            placeholder="https://suastartup.com"
            type="url"
            register={register("website")}
            error={errors.website}
            describedBy={describedBy("website")}
          />
          <FormInput
            id="linkedin"
            label="LinkedIn"
            placeholder="https://linkedin.com/company/..."
            type="url"
            register={register("linkedin")}
            error={errors.linkedin}
            describedBy={describedBy("linkedin")}
          />
          <FormInput
            id="instagram"
            label="Instagram"
            placeholder="https://instagram.com/..."
            type="url"
            register={register("instagram")}
            error={errors.instagram}
            describedBy={describedBy("instagram")}
          />
          <FormInput
            id="twitter"
            label="X / Twitter"
            placeholder="https://x.com/..."
            type="url"
            register={register("twitter")}
            error={errors.twitter}
            describedBy={describedBy("twitter")}
          />
        </div>
      </div>
    </section>
  );
}

function FormInput({
  id,
  label,
  placeholder,
  type = "text",
  register,
  error,
  describedBy,
}: {
  id: string;
  label: string;
  placeholder: string;
  type?: string;
  register: ReturnType<StartupStepProps["form"]["register"]>;
  error?: import("react-hook-form").FieldError;
  describedBy?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      <input
        id={id}
        className={`${startupInputClass} ${error ? "border-destructive" : ""}`}
        placeholder={placeholder}
        type={type}
        {...register}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
      />
      <FormFieldError id={errorId} error={error} />
    </div>
  );
}

function UploadField({
  id,
  label,
  accept,
  onChange,
  loading,
  status,
  preview,
}: {
  id: string;
  label: string;
  accept: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
  status: string;
  preview?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      <label
        htmlFor={id}
        className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 p-4 text-center transition hover:border-primary focus-within:ring-2 focus-within:ring-primary"
      >
        <input
          id={id}
          type="file"
          accept={accept}
          onChange={onChange}
          className="sr-only"
          aria-describedby={`${id}-status`}
        />
        {loading ? (
          <Loader2
            className="h-8 w-8 animate-spin text-primary"
            aria-hidden="true"
          />
        ) : (
          preview || (
            <Upload className="h-8 w-8 text-primary" aria-hidden="true" />
          )
        )}
        <span
          id={`${id}-status`}
          role="status"
          className="text-xs font-semibold text-muted-foreground"
        >
          {status}
        </span>
      </label>
    </div>
  );
}
