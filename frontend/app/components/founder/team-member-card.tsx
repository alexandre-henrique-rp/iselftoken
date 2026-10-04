import { Trash2 } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import type { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { toast } from "sonner";
import { useUploadMutation } from "~/hooks/use-upload";
import { UploadZone } from "~/components/ui/upload-zone";

interface TeamMemberCardProps {
  index: number;
  fieldPrefix: string; // ex: "members.0"
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  withBio: boolean;
  onRemove: () => void;
  initialPhoto?: boolean;
  photoUrl?: string;
  memberName?: string;
}

export function TeamMemberCard({
  index,
  fieldPrefix,
  register,
  setValue,
  withBio,
  onRemove,
  initialPhoto = false,
  photoUrl,
  memberName,
}: TeamMemberCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadMutation();
  const [previewUrl, setPreviewUrl] = useState(photoUrl ?? "");

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error("A foto deve estar no formato JPG ou PNG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 5 MB.");
      return;
    }
    try {
      const result = await uploadMutation.mutateAsync({
        file,
        filename: file.name,
        kind: "startup-team-photo",
      });
      const url = result.url_web ?? result.url;
      if (!url) throw new Error("O servidor não retornou a URL da foto.");
      setPreviewUrl(url);
      setValue(`${fieldPrefix}.fotoUrl`, url, {
        shouldDirty: true,
        shouldValidate: true,
      });
      toast.success("Foto do membro enviada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar foto.");
    }
  };

  return (
    <div className="relative rounded-2xl border border-white/5 bg-background/40 p-6 space-y-4">
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover membro ${index + 1}`}
        className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <div className="flex gap-6">
        <div className="shrink-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={handlePhotoChange}
          />
          <UploadZone
            label={uploadMutation.isPending ? "Enviando..." : previewUrl ? "Trocar foto" : "Enviar foto"}
            className="!p-3 !min-w-0"
            onClick={() => inputRef.current?.click()}
            preview={
              previewUrl ? (
                <img
                  src={previewUrl}
                  alt={memberName ? `Foto de ${memberName}` : "Foto do membro"}
                  className="h-20 w-20 rounded-2xl object-cover"
                />
              ) : initialPhoto ? (
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-black text-2xl italic">
                    {index + 1}
                  </span>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-dashed border-white/10" />
              )
            }
          />
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="label-tag">Nome</label>
            <input
              className="input-field"
              {...register(`${fieldPrefix}.nome`)}
            />
          </div>
          <div className="space-y-2">
            <label className="label-tag">Cargo</label>
            <input
              className="input-field"
              {...register(`${fieldPrefix}.cargo`)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="label-tag">LinkedIn</label>
            <input
              className="input-field"
              placeholder="https://linkedin.com/in/..."
              {...register(`${fieldPrefix}.linkedin`)}
            />
          </div>
          {withBio ? (
            <div className="space-y-2 md:col-span-2">
              <label className="label-tag">Bio curta (máx 160 chars)</label>
              <textarea
                className="input-field min-h-[80px] resize-y"
                rows={2}
                maxLength={160}
                {...register(`${fieldPrefix}.bio`)}
              />
            </div>
          ) : null}
          {withBio ? (
            <div className="space-y-2 md:col-span-2">
              <label className="label-tag">
                Participação (%)
                <span className="text-[10px] text-muted-foreground/60 ml-2 font-normal">
                  Soma dos sócios deve totalizar 100%
                </span>
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                className="input-field"
                placeholder="0"
                {...register(`${fieldPrefix}.participacao`, {
                  valueAsNumber: true,
                })}
              />
            </div>
          ) : null}
          <div className="space-y-2 md:col-span-2">
            <label className="label-tag">Dedicação</label>
            <select
              className="input-field"
              {...register(`${fieldPrefix}.dedicacao`)}
            >
              <option value="">Selecione...</option>
              <option value="integral">Tempo Integral</option>
              <option value="parcial">Tempo Parcial / Definido</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
