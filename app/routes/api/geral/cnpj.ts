import type { LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import type { ApiCnpj } from "~/types/api-cnpj";

const cnpjParamSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9]{14}$|^[0-9]{2}\.[0-9]{3}\.[0-9]{3}\/[0-9]{4}-[0-9]{2}$/,
    "CNPJ inválido. Use 14 dígitos ou formato 00.000.000/0000-00.",
  );

/**
 * @name loader
 * @description Consulta dados de CNPJ na BrasilAPI e repassa o payload original da API.
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const headers = new Headers({ "Content-Type": "application/json" });
  const rawCnpj = params.cnpj ?? "";
  const parsedCnpj = cnpjParamSchema.safeParse(rawCnpj);

  if (!parsedCnpj.success) {
    const errorPayload: ApiCnpj.ErrorResponse = {
      name: "BadRequestError",
      message: "CNPJ deve conter exatamente 14 dígitos.",
      type: "bad_request",
    };

    return new Response(JSON.stringify(errorPayload), {
      status: 400,
      headers,
    });
  }

  const normalizedCnpj = parsedCnpj.data.replace(/\D/g, "");

  if (!normalizedCnpj || normalizedCnpj.length !== 14) {
    const errorPayload: ApiCnpj.ErrorResponse = {
      name: "BadRequestError",
      message: "CNPJ deve conter exatamente 14 dígitos.",
      type: "bad_request",
    };

    return new Response(JSON.stringify(errorPayload), {
      status: 400,
      headers,
    });
  }

  const apiResponse = await fetch(
    `${process.env.API_BRASIL}/api/cnpj/v1/${normalizedCnpj}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "iselftoken-router-v7/1.0 (+https://iselftoken.com)",
      },
    },
  );

  const data = (await apiResponse.json()) as ApiCnpj.Response;

  if (!apiResponse.ok) {
    return new Response(JSON.stringify(data), {
      status: apiResponse.status,
      headers,
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers,
  });
}
