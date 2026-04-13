import type { ActionFunctionArgs } from "react-router";
import { createSessionHeaders } from "~/lib/session-headers";

export async function action({ request }: ActionFunctionArgs) {
  const headers = createSessionHeaders(request);

  const meResponse = await fetch(`${process.env.API_URL}/users/me`, {
    method: "GET",
    headers,
  });

  const meData = await meResponse.json();

  if (!meResponse.ok || !meData.data?.id) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Não foi possível identificar o usuário",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const userId = meData.data.id;
  const formData = await request.json();

  const apiResponse = await fetch(`${process.env.API_URL}/users/${userId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(formData),
  });

  const responseData = await apiResponse.json();

  if (!apiResponse.ok) {
    return new Response(
      JSON.stringify({
        success: false,
        error: responseData.message || "Erro ao atualizar perfil",
        details: responseData,
      }),
      {
        status: apiResponse.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: responseData,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
