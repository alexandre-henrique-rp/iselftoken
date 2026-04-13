import type { ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie");
  const uploadHeaders: Record<string, string> = {};
  if (cookieHeader) {
    uploadHeaders["Cookie"] = cookieHeader;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const tipo = formData.get("tipo") as string | null;

    if (!file || !tipo) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Arquivo e tipo são obrigatórios",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Tipo de arquivo não permitido. Use PDF, PNG ou JPG.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Arquivo muito grande. Máximo 5MB.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const apiFormData = new FormData();
    apiFormData.append("file", file);
    apiFormData.append("tipo", tipo);

    const apiResponse = await fetch(`${process.env.API_URL}/uploads`, {
      method: "POST",
      headers: uploadHeaders,
      body: apiFormData,
    });

    const responseData = await apiResponse.json();

    if (!apiResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.message || "Erro ao fazer upload",
          details: responseData,
        }),
        {
          status: apiResponse.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: responseData.id || responseData.data?.id,
          url: responseData.url || responseData.data?.url,
          tipo: tipo,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Erro interno ao processar upload",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
