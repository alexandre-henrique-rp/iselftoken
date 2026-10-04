import { useEffect } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { isOfficialSocialUrl, socialUrlMessage } from "~/lib/social-url";
import type { EditSectionProps } from "./_section-props";

interface SocialLinksForm {
  site: string;
  linkedin: string;
  instagram: string;
  twitter: string;
  youtube: string;
}

const defaults: SocialLinksForm = { site: "", linkedin: "", instagram: "", twitter: "", youtube: "" };
const SECTION_ID = "social-links";
const TOTAL = 5;

interface SocialLinksProps extends EditSectionProps { startup?: any; }

export function SocialLinks({ reportStatus, registerReset, registerGetValues, startup }: SocialLinksProps) {
  const { register, watch, formState, reset, getValues } = useForm<SocialLinksForm>({ defaultValues: defaults, mode: "onChange" });

  useEffect(() => {
    if (!startup) return;
    const redes = startup.redes_sociais || startup.redesSociais || {};
    reset({
      ...defaults,
      site: startup.site || redes.website || "",
      linkedin: redes.linkedin || startup.linkedin || "",
      instagram: redes.instagram || "",
      twitter: redes.twitter || "",
      youtube: startup.youtube_url || redes.youtube || "",
    });
  }, [startup, reset]);

  const values = watch();
  const dirty = Object.keys(formState.dirtyFields).length;
  const filled = Object.values(values).filter(Boolean).length;

  useEffect(() => { reportStatus({ id: SECTION_ID, dirty, filled, total: TOTAL }); }, [dirty, filled, reportStatus]);
  useEffect(() => { if (registerReset) registerReset(SECTION_ID, () => reset(defaults)); }, [registerReset, reset]);
  useEffect(() => {
    if (registerGetValues) registerGetValues(SECTION_ID, () => ({ values: getValues(), dirtyFields: formState.dirtyFields }));
  }, [registerGetValues, getValues, formState]);

  const socialRegister = (network: "linkedin" | "instagram" | "twitter", label: string) =>
    register(network, {
      validate: (value) => !value || isOfficialSocialUrl(value, network) || socialUrlMessage(label),
    });

  return (
    <section className="glass-card space-y-6 rounded-3xl p-8 lg:p-10">
      <header className="flex items-start justify-between">
        <div><h2 className="text-2xl font-black italic tracking-tight">Links &amp; Social</h2><p className="mt-1 text-sm text-muted-foreground">Presença digital da sua startup</p></div>
        <span className="pill">{filled}/{TOTAL} campos</span>
      </header>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <LinkInput label="Site" placeholder="https://exemplo.com.br" registration={register("site")} />
        <LinkInput label="LinkedIn" placeholder="https://linkedin.com/company/..." registration={socialRegister("linkedin", "LinkedIn")} error={formState.errors.linkedin?.message} />
        <LinkInput label="Instagram" placeholder="https://instagram.com/..." registration={socialRegister("instagram", "Instagram")} error={formState.errors.instagram?.message} />
        <LinkInput label="X / Twitter" placeholder="https://x.com/..." registration={socialRegister("twitter", "X / Twitter")} error={formState.errors.twitter?.message} />
        <LinkInput label="YouTube (pitch deck / vídeo)" placeholder="https://youtube.com/..." registration={register("youtube")} className="md:col-span-2" />
      </div>
    </section>
  );
}

function LinkInput({ label, placeholder, registration, error, className = "" }: { label: string; placeholder: string; registration: UseFormRegisterReturn<keyof SocialLinksForm>; error?: string; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="label-tag">{label}</label>
      <input className={`input-field ${error ? "border-destructive" : ""}`} placeholder={placeholder} type="url" {...registration} aria-invalid={Boolean(error)} />
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
