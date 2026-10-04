import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { InitialsImage } from "~/components/ui/initials-image";
import { UploadZone } from "~/components/ui/upload-zone";
import { useUploadMutation } from "~/hooks/use-upload";
import { resolveAssetUrl } from "~/lib/asset-url";
import { getUploadWebUrl } from "~/lib/upload-url";
import type { EditSectionProps } from "./_section-props";

interface StartupBrandingProps extends EditSectionProps {
  startup?: any;
}

const SECTION_ID = "startup-branding";
const TOTAL = 2; // logo + cover
const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
// P3-LOGO-RESTRICT: logo e cover da startup so aceitam JPG ou PNG.
// (webp/gif removidos — espelha `KIND_ALLOWED_MIMES` no backend)
const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png"];

export function StartupBranding({
  startup,
  reportStatus,
  registerReset,
}: StartupBrandingProps) {
  const uploadMutation = useUploadMutation();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  // Carregar logo e cover existentes da startup
  useEffect(() => {
    if (startup?.logo) {
      const url = getUploadWebUrl(startup.logo) || null;
      setLogoUrl(url ? resolveAssetUrl(url) : null);
    }
    if (startup?.cover) {
      const url = getUploadWebUrl(startup.cover) || null;
      setCoverUrl(url ? resolveAssetUrl(url) : null);
    }
  }, [startup]);

  const hasLogo = !!logoUrl;
  const hasCover = !!coverUrl;
  const filled = (hasLogo ? 1 : 0) + (hasCover ? 1 : 0);

  // Logo e cover sao persistidos imediatamente via PATCH /api/startup/:id
  // no proprio upload — a secao nao tem campos pendentes para o save
  // consolidado, entao dirty reportado e sempre 0. Reportar dirty>0 aqui
  // acendia a action bar e o save global retornava "Nenhuma alteração".
  useEffect(() => {
    reportStatus({ id: SECTION_ID, dirty: 0, filled, total: TOTAL });
  }, [filled, reportStatus]);

  useEffect(() => {
    if (!registerReset) return;
    registerReset(SECTION_ID, () => {
      if (startup?.logo) {
        const url = getUploadWebUrl(startup.logo) || null;
        setLogoUrl(url ? resolveAssetUrl(url) : null);
      } else {
        setLogoUrl(null);
      }
      if (startup?.cover) {
        const url = getUploadWebUrl(startup.cover) || null;
        setCoverUrl(url ? resolveAssetUrl(url) : null);
      } else {
        setCoverUrl(null);
      }
    });
  }, [registerReset, startup]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação client-side
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error(
        `Tipo não permitido: ${file.type || "desconhecido"}. Use JPG ou PNG.`,
      );
      e.target.value = "";
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      toast.error(
        `A logo excede 5MB. Tamanho atual: ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
      );
      e.target.value = "";
      return;
    }

    setLogoUploading(true);
    try {
      const result = await uploadMutation.mutateAsync({
        file,
        filename: file.name,
        kind: "startup-logo",
      });

      // Atualizar logo no backend (PATCH /startup/:id)
      if (startup?.id) {
        const patchRes = await fetch(`/api/startup/${startup.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ logo_id: result.id }),
        });

        if (!patchRes.ok) {
          throw new Error("Falha ao atualizar logo no servidor");
        }
      }

      setLogoUrl(
        resolveAssetUrl(result.url_web ?? result.url_md ?? result.url) ||
          URL.createObjectURL(file),
      );
      toast.success("Logo atualizada com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar logo.");
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error(
        `Tipo não permitido: ${file.type || "desconhecido"}. Use JPG ou PNG.`,
      );
      e.target.value = "";
      return;
    }

    const maxCoverSize = 10 * 1024 * 1024; // 10MB para cover (maior que logo)
    if (file.size > maxCoverSize) {
      toast.error(
        `O banner excede 10MB. Tamanho atual: ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
      );
      e.target.value = "";
      return;
    }

    setCoverUploading(true);
    try {
      const result = await uploadMutation.mutateAsync({
        file,
        filename: file.name,
        kind: "startup-cover",
      });

      if (startup?.id) {
        const patchRes = await fetch(`/api/startup/${startup.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ cover_id: result.id }),
        });

        if (!patchRes.ok) {
          throw new Error("Falha ao atualizar banner no servidor");
        }
      }

      setCoverUrl(
        resolveAssetUrl(result.url_web ?? result.url_md ?? result.url) ||
          URL.createObjectURL(file),
      );
      toast.success("Banner atualizado com sucesso!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao enviar banner.",
      );
    } finally {
      setCoverUploading(false);
      e.target.value = "";
    }
  };

  return (
    <section className="glass-card rounded-3xl p-8 lg:p-10 space-y-8">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight italic">
            Branding
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Como sua marca aparece pros investidores
          </p>
          <p className="text-muted-foreground/70 text-xs mt-1">
            Logo e banner são salvos automaticamente ao final do envio.
          </p>
        </div>
        <span className="pill">
          {filled}/{TOTAL} campos
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="label-tag">Logo (quadrado, JPG ou PNG)</label>
          <div className="relative">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <UploadZone
              label={
                logoUploading
                  ? "Enviando..."
                  : hasLogo
                    ? "Trocar logo"
                    : "Enviar logo"
              }
              onClick={() => logoInputRef.current?.click()}
              preview={
                logoUploading ? (
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : (
                  <InitialsImage
                    name={startup?.nome ?? "Startup"}
                    src={logoUrl}
                    alt="Logo da startup"
                    className="h-20 w-20 rounded-2xl border border-primary/20"
                    fallbackClassName="bg-primary/10"
                    fallbackTextClassName="text-lg font-black"
                  />
                )
              }
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="label-tag">Cover / Banner (16:9, JPG ou PNG)</label>
          <div className="relative">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleCoverUpload}
              className="hidden"
            />
            <UploadZone
              label={
                coverUploading
                  ? "Enviando..."
                  : hasCover
                    ? "Trocar banner"
                    : "Enviar banner"
              }
              onClick={() => coverInputRef.current?.click()}
              preview={
                coverUploading ? (
                  <div className="w-full h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : coverUrl ? (
                  <img
                    src={coverUrl}
                    alt="Banner da startup"
                    className="w-full h-20 rounded-2xl object-cover border border-primary/20"
                  />
                ) : null
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
