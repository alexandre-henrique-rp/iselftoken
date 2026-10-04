import type { ActionFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function action({ request, params }: ActionFunctionArgs) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const body = await request.text();
  const res = await fetch(
    `${BACKEND_URL}/admin/payouts/installments/${params.installmentId}/scheduled-date`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        ...(cookieHeader && { cookie: cookieHeader }),
      },
      body,
    },
  );
  const data = await res.json().catch(() => null);
  return Response.json(data ?? { error: true }, { status: res.status });
}
