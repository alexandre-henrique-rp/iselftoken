import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

const ALLOWED_DECISIONS = new Set([
  "APPROVED",
  "REJECTED",
  "NEEDS_RESUBMISSION",
  "REVOKE",
]);

export async function action({ params, request }: ActionFunctionArgs) {
  const id = params.id;
  if (!id) {
    return Response.json({ error: "id obrigatório" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !ALLOWED_DECISIONS.has(body.decision)) {
    return Response.json(
      {
        error:
          "decision obrigatório (APPROVED | REJECTED | NEEDS_RESUBMISSION | REVOKE)",
      },
      { status: 400 },
    );
  }

  if (
    (body.decision === "REJECTED" || body.decision === "NEEDS_RESUBMISSION") &&
    !String(body.reason ?? "").trim()
  ) {
    return Response.json(
      { error: "reason é obrigatório para rejeição ou reenvio" },
      { status: 400 },
    );
  }

  const cookie = request.headers.get("cookie") ?? "";
  const response = await fetch(
    `${BACKEND_URL}/admin/kyc/${encodeURIComponent(id)}/decide`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify({
        decision: body.decision,
        reason: body.reason,
      }),
    },
  );

  const data = await response.json().catch(() => ({ error: true }));
  return Response.json(data, { status: response.status });
}
