import type { ActionFunctionArgs } from "react-router";
import { serverFetch } from "~/lib/server-fetch";

type AdminBffResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function callAdminBff(
  request: Request,
  path: string,
  method: string,
  body?: unknown,
): Promise<AdminBffResult> {
  const response = await serverFetch(request, path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.error === true) {
    return {
      ok: false,
      error: payload?.message ?? "Não foi possível concluir a operação.",
    };
  }
  return { ok: true, message: payload?.message };
}

export async function adminStartupAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const startupId = String(formData.get("startupId") ?? "");

  if (!startupId || !/^\d+$/.test(startupId)) {
    return Response.json(
      { success: false, error: "ID da startup inválido." },
      { status: 400 },
    );
  }

  if (intent === "approve-startup" || intent === "reject-startup") {
    const justification = String(formData.get("justification") ?? "").trim();
    if (intent === "reject-startup" && !justification) {
      return Response.json(
        { success: false, error: "Informe o motivo da rejeição." },
        { status: 400 },
      );
    }
    // Fase (1, 2, 3) — enviada pelo <input type="hidden" name="phase"> do
    // PhaseApprovalActions. Sem ela o backend grava com phase=0 (legado) e
    // o frontend `useLatestReviewDecision(startupId, phase)` não encontra
    // a decisão para mostrar o card "Aprovado por X em ..." e esconder
    // os botões. Validação: aceita 1|2|3 apenas.
    const phaseRaw = String(formData.get("phase") ?? "").trim();
    const phaseNum = Number(phaseRaw);
    const phase =
      phaseRaw && Number.isInteger(phaseNum) && phaseNum >= 1 && phaseNum <= 3
        ? phaseNum
        : undefined;
    const result = await callAdminBff(
      request,
      `/api/admin/startups/${startupId}/status`,
      "PUT",
      {
        status: intent === "approve-startup" ? "APPROVED" : "REJECTED",
        ...(phase !== undefined ? { phase } : {}),
        ...(justification ? { justification } : {}),
      },
    );
    return Response.json(
      result.ok
        ? {
            success: true,
            message:
              result.message ??
              (intent === "approve-startup"
                ? "Startup aprovada com sucesso."
                : "Startup rejeitada com sucesso."),
          }
        : { success: false, error: result.error },
      { status: result.ok ? 200 : 400 },
    );
  }

  if (intent === "edit-startup") {
    const nome = String(formData.get("nome") ?? "").trim();
    const score = Number(String(formData.get("score") ?? ""));
    if (!nome) {
      return Response.json(
        { success: false, error: "O nome da startup é obrigatório." },
        { status: 400 },
      );
    }
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      return Response.json(
        {
          success: false,
          error: "O score deve ser um número inteiro entre 0 e 100.",
        },
        { status: 400 },
      );
    }

    const update = await callAdminBff(
      request,
      `/api/admin/startups/${startupId}`,
      "PATCH",
      {
        nome,
        area_atuacao: String(formData.get("area_atuacao") ?? "").trim(),
        estagio: String(formData.get("estagio") ?? "").trim(),
        // Campos do registro editáveis pelo admin. Enviados apenas quando
        // preenchidos; o backend (startupService.update) aplica as regras
        // T034 (bloqueio de campos críticos após rodada finalizada).
        ...(String(formData.get("razaoSocial") ?? "").trim()
          ? { razaoSocial: String(formData.get("razaoSocial")).trim() }
          : {}),
        ...(String(formData.get("cnpj") ?? "").trim()
          ? { cnpj: String(formData.get("cnpj")).trim() }
          : {}),
        ...(formData.has("descricao")
          ? { descricao: String(formData.get("descricao") ?? "").trim() }
          : {}),
        ...(formData.has("site")
          ? { site: String(formData.get("site") ?? "").trim() }
          : {}),
        ...(formData.has("telefone")
          ? { telefone: String(formData.get("telefone") ?? "").trim() }
          : {}),
      },
    );
    if (!update.ok) {
      return Response.json(
        { success: false, error: update.error },
        { status: 400 },
      );
    }

    const scoreUpdate = await callAdminBff(
      request,
      `/api/admin/startups/${startupId}/score`,
      "PATCH",
      { score },
    );
    return Response.json(
      scoreUpdate.ok
        ? { success: true, message: "Startup atualizada com sucesso." }
        : { success: false, error: scoreUpdate.error },
      { status: scoreUpdate.ok ? 200 : 400 },
    );
  }

  if (intent === "assign-seal") {
    const sealSlug = String(formData.get("sealSlug") ?? "").trim();
    if (!sealSlug) {
      return Response.json(
        { success: false, error: "Selecione um selo válido." },
        { status: 400 },
      );
    }
    const result = await callAdminBff(
      request,
      `/api/admin/seals/startup/${startupId}`,
      "POST",
      { sealSlug },
    );
    return Response.json(
      result.ok
        ? {
            success: true,
            message: result.message ?? "Selo aplicado com sucesso.",
          }
        : { success: false, error: result.error },
      { status: result.ok ? 200 : 400 },
    );
  }

  if (intent === "remove-seal") {
    const sealId = String(formData.get("sealId") ?? "");
    if (!/^\d+$/.test(sealId)) {
      return Response.json(
        { success: false, error: "ID do selo inválido." },
        { status: 400 },
      );
    }
    const result = await callAdminBff(
      request,
      `/api/admin/seals/startup/${startupId}/${sealId}`,
      "DELETE",
    );
    return Response.json(
      result.ok
        ? {
            success: true,
            message: result.message ?? "Selo removido com sucesso.",
          }
        : { success: false, error: result.error },
      { status: result.ok ? 200 : 400 },
    );
  }

  // Ação "Coroar" — incrementa o score de marketplace em +/-N pontos.
  // O backend valida Fase 3 APPROVED (defesa em profundidade) e grava em
  // AuditLog. O delta é clampado em 0..100 no service.
  if (intent === "increment-score") {
    const rawDelta = String(formData.get("delta") ?? "");
    const delta = Number(rawDelta);
    if (!Number.isInteger(delta) || delta < -100 || delta > 100 || delta === 0) {
      return Response.json(
        {
          success: false,
          error: "Delta inválido. Use inteiro entre -100 e 100, diferente de 0.",
        },
        { status: 400 },
      );
    }
    const reason = String(formData.get("reason") ?? "").trim() || undefined;
    const result = await callAdminBff(
      request,
      `/api/admin/startups/${startupId}/score/increment`,
      "PATCH",
      { delta, ...(reason ? { reason } : {}) },
    );
    return Response.json(
      result.ok
        ? {
            success: true,
            message: result.message ?? "Score atualizado com sucesso.",
          }
        : { success: false, error: result.error },
      { status: result.ok ? 200 : 400 },
    );
  }

  return Response.json(
    { success: false, error: "Operação administrativa desconhecida." },
    { status: 400 },
  );
}
