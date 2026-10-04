const IPV4_PATTERN =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const IPV6_PATTERN = /^[0-9a-fA-F:]+$/;

export interface ClientIpLookup {
  hostname: string | null;
  ip: string;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  local: string | null;
  provedor: string | null;
  timezone: string | null;
  horário: Date;
}

function isValidIp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const ip = value.trim();
  return (
    (IPV4_PATTERN.test(ip) || (ip.includes(":") && IPV6_PATTERN.test(ip))) &&
    ip.length <= 45
  );
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function coordinates(lat: unknown, lon: unknown): string | null {
  return typeof lat === "number" && typeof lon === "number"
    ? `${lat}, ${lon}`
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function fromIpinfo(data: unknown): ClientIpLookup | null {
  if (!isRecord(data) || !isValidIp(data.ip)) return null;

  return {
    hostname: stringOrNull(data.hostname),
    ip: data.ip.trim(),
    cidade: stringOrNull(data.city),
    estado: stringOrNull(data.region),
    pais: stringOrNull(data.country),
    local: stringOrNull(data.loc),
    provedor: stringOrNull(data.org),
    timezone: stringOrNull(data.timezone),
    horário: new Date(),
  };
}

function fromIpApi(data: unknown): ClientIpLookup | null {
  if (!isRecord(data) || data.status !== "success" || !isValidIp(data.query)) {
    return null;
  }

  return {
    hostname: stringOrNull(data.isp),
    ip: data.query.trim(),
    cidade: stringOrNull(data.city),
    estado: stringOrNull(data.regionName),
    pais: stringOrNull(data.countryCode),
    local: coordinates(data.lat, data.lon),
    provedor: stringOrNull(data.as),
    timezone: stringOrNull(data.timezone),
    horário: new Date(),
  };
}

/**
 * Consulta o IP público exclusivamente no navegador. O retorno segue o
 * formato normalizado usado pelo fluxo de 2FA; o backend valida o IP antes
 * de decidir se ele pode ser usado como fallback para req.ip.
 */
export async function fetchClientIp(): Promise<ClientIpLookup | null> {
  if (typeof window === "undefined") return null;

  const providers: Array<{
    url: string;
    parse: (data: unknown) => ClientIpLookup | null;
  }> = [
    {
      url: "https://ipinfo.io/json",
      parse: fromIpinfo,
    },
    {
      url: "https://ip-api.com/json",
      parse: fromIpApi,
    },
  ];

  for (const provider of providers) {
    try {
      const response = await window.fetch(provider.url, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) continue;

      const lookup = provider.parse(await response.json());
      if (lookup) return lookup;
    } catch {
      // Consulta best-effort; tenta a próxima API sem exibir erro na UI.
    }
  }

  return null;
}
