import type { ActionFunctionArgs } from "react-router";
import { encryptPayload } from "~/lib/special-functions";
import type { PayloadAf2Type } from "~/types/payloadAf2";

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.json();

  const payloadAf2: PayloadAf2Type = {
    codigo: body.codigo,
    path: body.path,
    email: body.email,
    createdAt: new Date(),
    expiresAt: new Date(new Date().getTime() + 5 * 60 * 1000),
  };

  // expira em 5 minutos
  const hash = await encryptPayload(payloadAf2, { expiresIn: "5m" });

  const api = await fetch(`${process.env.API_URL}/auth/newcode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...body, urlRedirect: body.urlRedirect + "/auth/" + hash }),
  });

  const data = await api.json();

  return data;
}
