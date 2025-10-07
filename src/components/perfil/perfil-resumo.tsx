"use client";

import { TrText } from "@/components/tr-text";

/**
 * Componente de resumo do perfil do usuário.
 * Responsabilidade única: apresentar dados básicos (nome, email, role, localização, país, telefone).
 * i18n via TrText. Não faz fetch; recebe dados via props.
 */
export type PerfilResumoProps = {
  nome?: string;
  email?: string;
  role?: string;
  cidade?: string;
  uf?: string;
  pais?: string;
  telefone?: string;
};

export function PerfilResumo({ nome, email, role, cidade, uf, pais, telefone }: PerfilResumoProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-2">
      <div>
        <p>
          <strong>
            <TrText k="perfil.summary.name" />:
          </strong>{" "}
          {nome ?? "-"}
        </p>
        <p>
          <strong>
            <TrText k="perfil.summary.email" />:
          </strong>{" "}
          {email ?? "-"}
        </p>
        <p>
          <strong>
            <TrText k="perfil.summary.role" />:
          </strong>{" "}
          {role ?? "-"}
        </p>
      </div>
      <div>
        <p>
          <strong>
            <TrText k="perfil.summary.city_state" />:
          </strong>{" "}
          {(cidade ?? "-") + " / " + (uf ?? "-")}
        </p>
        <p>
          <strong>
            <TrText k="perfil.summary.country" />:
          </strong>{" "}
          {pais ?? "-"}
        </p>
        <p>
          <strong>
            <TrText k="perfil.summary.phone" />:
          </strong>{" "}
          {telefone ?? "-"}
        </p>
      </div>
    </div>
  );
}
