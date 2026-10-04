import type { LoaderFunctionArgs } from "react-router";

const ALLOWED_HOST = "iselftoken-prod-document.s3.us-east-1.amazonaws.com";

export async function loader({ request }: LoaderFunctionArgs) {
  const source = new URL(request.url).searchParams.get("url");
  if (!source) {
    return new Response("URL do PDF não informada", { status: 400 });
  }

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return new Response("URL do PDF inválida", { status: 400 });
  }

  if (sourceUrl.protocol !== "https:" || sourceUrl.hostname !== ALLOWED_HOST) {
    return new Response("Origem do PDF não permitida", { status: 403 });
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    return new Response("Não foi possível carregar o PDF", {
      status: response.status,
    });
  }

  return new Response(await response.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": response.headers.get("content-type") ?? "application/pdf",
    },
  });
}
