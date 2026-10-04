export class StartupOpinionEntity {
  id: number;
  startupId: number;
  mensagem: string;
  autor: string;
  cargos: string[] | null;
  youtube: string | null;
  site: string | null;
  linkedin: string | null;
  instagram: string | null;
  facebook: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
