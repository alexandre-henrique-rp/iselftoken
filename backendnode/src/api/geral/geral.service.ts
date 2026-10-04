import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { CnpjLookupResponseDto } from './dto/cnpj-lookup-response.dto';
import { BancoDto, BancosListResponseDto } from './dto/banco-response.dto';

/**
 * Consulta CNPJ na BrasilAPI com cache Redis e throttle de saída.
 *
 * BrasilAPI (gratuita): https://brasilapi.com.br
 *   - Limite oficial: **1 requisição por segundo por IP** (plano free).
 *   - Cacheamos cada CNPJ por 24h: dados da Receita mudam raramente.
 *   - Cache negativo (CNPJ inexistente) por 10 min para evitar replay de erros.
 *
 * Throttle interno:
 *   - Aplicado APENAS no caminho de cache miss (cache hit responde livremente).
 *   - Contador global em Redis (`brasilapi:cnpj:slot`) com TTL de 1s.
 *   - Implementação atômica via Lua script (INCR + PEXPIRE numa transação).
 *   - Se o contador ficar > 1 no mesmo segundo, retorna 503.
 *
 * Headers de rate limit retornados pela BrasilAPI:
 *   - X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 *   - Logamos quando remaining < 50 para visibilidade.
 */
@Injectable()
export class GeralService {
  private readonly logger = new Logger(GeralService.name);
  private readonly brasilApiBase = 'https://brasilapi.com.br/api';
  private readonly userAgent =
    'iSelfToken/1.0 (+https://iselftoken.com; backend NestJS)';
  private readonly cnpjCacheTtlSeconds = 60 * 60 * 24; // 24h
  private readonly cnpjNegativeCacheTtlSeconds = 60 * 10; // 10min
  private readonly bancosCacheTtlSeconds = 60 * 60 * 24 * 7; // 7 dias
  private readonly fetchTimeoutMs = 8000;

  constructor(@InjectRedis() private readonly redis: Redis) {}

  // ============================================================================
  // BANCOS — lista todos os bancos brasileiros via BrasilAPI
  // ============================================================================

  async listBancos(): Promise<BancosListResponseDto> {
    const cacheKey = 'brasilapi:bancos';
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const bancos = JSON.parse(cached) as BancoDto[];
      return { bancos, total: bancos.length, cached: true };
    }

    await this.acquireUpstreamSlot();
    const bancos = await this.fetchBancosFromBrasilApi();
    await this.redis.set(
      cacheKey,
      JSON.stringify(bancos),
      'EX',
      this.bancosCacheTtlSeconds,
    );
    return { bancos, total: bancos.length, cached: false };
  }

  private async fetchBancosFromBrasilApi(): Promise<BancoDto[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.fetchTimeoutMs);
    try {
      const response = await fetch(`${this.brasilApiBase}/banks/v1`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': this.userAgent,
        },
        signal: controller.signal,
      });
      this.logRateLimit(response);

      if (!response.ok) {
        this.logger.warn(`BrasilAPI /banks/v1 respondeu ${response.status}`);
        throw new BadGatewayException({
          error: 'upstream_error',
          message: 'Serviço de bancos temporariamente indisponível',
        });
      }

      const data = (await response.json()) as Array<{
        ispb?: string;
        name?: string;
        code?: number | null;
        fullName?: string;
      }>;

      // Filtramos entidades sem code (ex: Selic, sistemas internos do BCB) —
      // o consumidor (BankingDetails) precisa de bancos comerciais identificáveis.
      return data
        .filter((b) => typeof b.code === 'number' && b.code !== null)
        .map((b) => ({
          ispb: b.ispb ?? '',
          code: b.code as number,
          name: b.name ?? '',
          fullName: b.fullName ?? b.name ?? '',
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    } catch (err: unknown) {
      if (err instanceof BadGatewayException) throw err;
      const name = (err as { name?: string } | undefined)?.name;
      if (name === 'AbortError') {
        throw new GatewayTimeoutException({
          error: 'timeout',
          message: 'Consulta de bancos demorou demais. Tente novamente.',
        });
      }
      this.logger.error(`Erro ao consultar BrasilAPI /banks: ${String(err)}`);
      throw new BadGatewayException({
        error: 'fetch_failed',
        message: 'Erro ao consultar lista de bancos.',
      });
    } finally {
      clearTimeout(timer);
    }
  }

  // ============================================================================
  // CNPJ — consulta dados de CNPJ via BrasilAPI
  // ============================================================================

  async lookupCnpj(rawCnpj: string): Promise<CnpjLookupResponseDto> {
    // Bloqueia CNPJ Alfanumérico — BrasilAPI não suporta lookup alfa ainda
    if (/[A-Za-z]/.test(rawCnpj ?? '')) {
      throw new UnprocessableEntityException(
        'Lookup de CNPJ Alfanumérico ainda não está disponível na integração. ' +
          'Preencha os dados da empresa manualmente até a migração da integração.',
      );
    }
    const digits = rawCnpj.replace(/\D/g, '');
    if (digits.length !== 14) {
      throw new NotFoundException({
        error: 'invalid_cnpj',
        message: 'CNPJ deve ter 14 dígitos',
      });
    }

    const cacheKey = `cnpj:${digits}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as
        | (CnpjLookupResponseDto & { __negative?: never })
        | { __negative: true };
      if ('__negative' in parsed) {
        throw new NotFoundException({
          error: 'cnpj_not_found',
          message: 'CNPJ não encontrado na Receita Federal',
        });
      }
      return { ...parsed, cached: true };
    }

    await this.acquireUpstreamSlot();
    const fresh = await this.fetchCnpjFromBrasilApi(digits);
    await this.redis.set(
      cacheKey,
      JSON.stringify(fresh),
      'EX',
      this.cnpjCacheTtlSeconds,
    );
    return { ...fresh, cached: false };
  }

  /**
   * Adquire um "slot" de saída para a BrasilAPI. Garante 1 chamada upstream/s
   * **compartilhada entre todos os endpoints** (cnpj, banks, etc) e todos os
   * requesters — o limite oficial da BrasilAPI é por IP, não por endpoint.
   *
   * Atomicidade via Lua: INCR sempre, e só seta PEXPIRE quando o contador é 1
   * (primeira chamada do slot). Contadores subsequentes (> 1) caracterizam
   * burst e retornam 503.
   */
  private async acquireUpstreamSlot(): Promise<void> {
    const lua =
      "local c = redis.call('INCR', KEYS[1]); " +
      "if c == 1 then redis.call('PEXPIRE', KEYS[1], 1000); end; " +
      'return c;';
    const current = (await this.redis.eval(lua, 1, 'brasilapi:slot')) as number;
    if (current > 1) {
      this.logger.warn(`Throttle interno (1 req/s) acionado: slot=${current}`);
      throw new ServiceUnavailableException({
        error: 'rate_limited_internal',
        message:
          'Muitas consultas à BrasilAPI no momento. Tente novamente em 1 segundo.',
      });
    }
  }

  private async fetchCnpjFromBrasilApi(
    digits: string,
  ): Promise<Omit<CnpjLookupResponseDto, 'cached'>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.fetchTimeoutMs);
    try {
      const response = await fetch(`${this.brasilApiBase}/cnpj/v1/${digits}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': this.userAgent,
        },
        signal: controller.signal,
      });

      this.logRateLimit(response);

      if (response.status === 404 || response.status === 400) {
        await this.redis.set(
          `cnpj:${digits}`,
          JSON.stringify({ __negative: true }),
          'EX',
          this.cnpjNegativeCacheTtlSeconds,
        );
        throw new NotFoundException({
          error: 'cnpj_not_found',
          message: 'CNPJ não encontrado na Receita Federal',
        });
      }

      if (response.status === 429) {
        this.logger.warn(
          `BrasilAPI rate limit excedido ao consultar CNPJ ${digits}`,
        );
        throw new ServiceUnavailableException({
          error: 'rate_limited',
          message:
            'Muitas consultas de CNPJ neste momento. Tente novamente em alguns segundos.',
        });
      }

      if (!response.ok) {
        this.logger.warn(
          `BrasilAPI respondeu ${response.status} para CNPJ ${digits}`,
        );
        throw new BadGatewayException({
          error: 'upstream_error',
          message: 'Serviço de CNPJ temporariamente indisponível',
        });
      }

      const data = (await response.json()) as {
        cnpj?: string;
        razao_social?: string;
        nome_fantasia?: string | null;
        data_inicio_atividade?: string | null;
        descricao_situacao_cadastral?: string | null;
        municipio?: string | null;
        uf?: string | null;
        cep?: string | null;
        logradouro?: string | null;
        numero?: string | null;
        complemento?: string | null;
        bairro?: string | null;
        cnae_fiscal_descricao?: string | null;
        porte?: string | null;
      };

      const situacao = (data.descricao_situacao_cadastral ?? '')
        .toUpperCase()
        .trim();
      const anoMatch = /^(\d{4})/.exec(data.data_inicio_atividade ?? '');
      const anoFundacao = anoMatch ? Number(anoMatch[1]) : undefined;

      return {
        cnpj: digits,
        razaoSocial: data.razao_social ?? '',
        nomeFantasia:
          data.nome_fantasia && data.nome_fantasia.trim().length > 0
            ? data.nome_fantasia.trim()
            : (data.razao_social ?? ''),
        anoFundacao,
        situacaoCadastral: situacao || undefined,
        ativa: situacao === 'ATIVA',
        cidade: data.municipio?.trim() || undefined,
        uf: data.uf?.trim() || undefined,
        cep: data.cep?.replace(/\D/g, '') || undefined,
        logradouro: data.logradouro?.trim() || undefined,
        numero: data.numero?.trim() || undefined,
        complemento: data.complemento?.trim() || undefined,
        bairro: data.bairro?.trim() || undefined,
        cnaeDescricao: data.cnae_fiscal_descricao?.trim() || undefined,
        porte: data.porte?.trim() || undefined,
      };
    } catch (err: unknown) {
      if (
        err instanceof NotFoundException ||
        err instanceof ServiceUnavailableException ||
        err instanceof BadGatewayException
      ) {
        throw err;
      }
      const name = (err as { name?: string } | undefined)?.name;
      if (name === 'AbortError') {
        this.logger.warn(
          `Timeout (${this.fetchTimeoutMs}ms) ao consultar BrasilAPI para CNPJ ${digits}`,
        );
        throw new GatewayTimeoutException({
          error: 'timeout',
          message: 'Consulta de CNPJ demorou demais. Tente novamente.',
        });
      }
      this.logger.error(`Erro ao consultar BrasilAPI: ${String(err)}`);
      throw new BadGatewayException({
        error: 'fetch_failed',
        message: 'Erro ao consultar CNPJ. Preencha manualmente.',
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private logRateLimit(response: Response): void {
    const remaining = Number(response.headers.get('x-ratelimit-remaining'));
    const limit = Number(response.headers.get('x-ratelimit-limit'));
    if (Number.isFinite(remaining) && remaining > 0 && remaining < 50) {
      this.logger.warn(
        `BrasilAPI rate limit baixo: ${remaining}/${limit} requisições restantes`,
      );
    }
  }
}
