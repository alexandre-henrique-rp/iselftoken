import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { createSessionHeaders } from "~/lib/session-headers";
import { createPlanCheckoutToken } from "~/lib/special-functions";

const subscriptionSchema = z.object({
  userId: z.coerce.number(),
  planId: z.coerce.number(),
  subscriptionId: z.coerce.number().optional(),
  planName: z.string().min(1),
  description: z.string().min(1),
  unitPrice: z.coerce.number().positive(),
  quantity: z.coerce.number().positive().optional(),
  currency: z.string().min(1).optional(),
  buyer: z.object({
    id: z.coerce.number().optional(),
    name: z.string().min(1),
    email: z.string().email(),
    document: z.string().min(11),
  }),
});

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.json();
  const parsedBody = subscriptionSchema.safeParse(body);

  if (!parsedBody.success) {
    const issues = parsedBody.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(" | ");
    return Response.json(
      {
        error: true,
        message: "Dados inválidos",
        detail: issues,
      },
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const payload = parsedBody.data;
  const headers = createSessionHeaders(request);

  const api = await fetch(`${process.env.API_URL}/subscriptions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      userId: Number(payload.userId),
      planId: Number(payload.planId),
      status: "PENDING",
    }),
  });

  const data = await api.json();

  if (!api.ok || data.error) {
    return new Response(JSON.stringify(data), {
      status: api.status,
      headers,
    });
  }

  const subscriptionId = data.data.id;

  const tokenHash = await createPlanCheckoutToken({
    subscriptionId,
    planName: payload.planName,
    description: payload.description,
    unitPrice: payload.unitPrice,
    quantity: payload.quantity,
    currency: payload.currency,
    buyer: payload.buyer,
  });

  return new Response(JSON.stringify({ ...data, token: tokenHash }), {
    status: 200,
    headers,
  });
}
