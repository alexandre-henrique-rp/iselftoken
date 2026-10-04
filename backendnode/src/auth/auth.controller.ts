import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Post,
  Query,
  Req,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import * as Sentry from '@sentry/nestjs';
import { Response } from 'express';
import { ResponseEntity } from 'src/common/entities/response.entity';
import { SkipSessionFilter } from '../common/decorators/skip-session-filter.decorator';
import { ErrorEntity } from '../common/dto/error.entity';
import { ResponseDto } from '../common/dto/response.dto';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CookiesService } from './cookies/cookies.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAuthDto } from './dto/create-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RecordAccessDto } from './dto/record-access.dto';
import { ValidateEmailDto } from './dto/validate-email.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { LoginResponseEntity } from './entities/login.entity';
import { ValidateEmailResponseEntity } from './entities/validate-email.entity';
import { SessionService } from './session/session.service';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly cookiesService: CookiesService,
  ) {}

  @Post()
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { ttl: 60000, limit: 10 },
    email: { ttl: 900000, limit: 5 },
  })
  @ApiOperation({
    summary: 'Login do usuário',
    description: `Realiza login com email e senha.

**Autenticação via Cookie HTTP-only**:
- Este endpoint seta automaticamente um cookie \`session_id\` no navegador
- O cookie é HTTP-only (não acessível via JavaScript) e SameSite=Strict
- Navegadores enviam automaticamente cookies em requisições subsequentes

**⚠️ IMPORTANTE - Como funciona no Swagger UI**:
- Após login bem-sucedido, o cookie é setado automaticamente pelo navegador
- O cadeado 🔒 do Swagger **NÃO** fecha visualmente (limitação do Swagger UI)
- Mas as requisições subsequentes funcionarão automaticamente!
- Para testar: faça login aqui, depois acesse \`GET /auth/me\` - funcionará automaticamente

**Fluxo**:
1. Execute este endpoint com email/senha válidos
2. Receba resposta 200 + cookie \`session_id\` setado automaticamente
3. Acesse endpoints protegidos (ex: \`GET /users/me\`) - o cookie será enviado automaticamente`,
  })
  @ApiBody({ type: LoginAuthDto })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso. Cookie session_id setado.',
    type: LoginResponseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciais inválidas.',
    type: ErrorEntity,
  })
  async login(
    @Body() data: LoginAuthDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(data, req);
    const sessionId = (result as ResponseDto<{ sessionId: string }>).data
      ?.sessionId;

    if (sessionId) {
      this.cookiesService.setSessionCookie(res, sessionId);
    }

    return result;
  }

  @Get('newcode')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @SkipSessionFilter()
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Novo código de verificação',
    description: `Envia um novo código de verificação via email para autenticação em duas etapas (2FA).

**Como funciona**:
- O usuário precisa estar autenticado (cookie session_id)
- Um código de 6 dígitos é enviado para o email cadastrado
- O código é válido por 5 minutos
- Use este código no endpoint /auth/verify-code para validar`,
  })
  @ApiResponse({
    status: 200,
    description: 'Novo código enviado com sucesso.',
    type: ResponseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado ou sessão expirada.',
    type: ErrorEntity,
  })
  async newcode(@Request() req: any) {
    const user = req.user;
    if (!user || !user.email) {
      throw new HttpException(
        ResponseDto.error('Usuário não encontrado', 404),
        404,
      );
    }

    const sessionId = this.cookiesService.getSessionId(req as any);
    return this.authService.newcode({ email: user.email }, sessionId);
  }

  @Post('verify-code')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @SkipSessionFilter()
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Verificar código 2FA',
    description: `Verifica o código de 6 dígitos digitado pelo usuário.

**Fluxo**:
1. Usuário fornece o código de 6 dígitos
2. Backend verifica se o código corresponde ao armazenado no Redis
3. Se válido: sessão marcada como 2FA verificada, cookie criado com mesmo período da sessão
4. Se inválido: retorna erro 401`,
  })
  @ApiBody({ type: VerifyCodeDto })
  @ApiResponse({
    status: 200,
    description: 'Código verificado com sucesso.',
    type: ResponseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Código inválido ou expirado.',
    type: ErrorEntity,
  })
  async verifyCode(
    @Request() req: any,
    @Body() data: VerifyCodeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = this.cookiesService.getSessionId(req as any);
    if (!sessionId) {
      throw new HttpException(
        ResponseDto.error('Sessão não encontrada', 401),
        401,
      );
    }

    const result = await this.authService.verifyCode(sessionId, data.codigo);

    const session = await this.sessionService.getSession(sessionId);
    if (session) {
      const ttl = await this.sessionService.getSessionTTL(sessionId);
      this.cookiesService.setTwoFaCookie(res, sessionId, ttl);
    }

    return result;
  }

  @Post('access')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiBody({ type: RecordAccessDto, required: false })
  @ApiOperation({
    summary: 'Registrar acesso autenticado',
    description:
      'Registra o acesso concluído após o 2FA. O IP do servidor é priorizado; o IP público informado pelo navegador só é usado como fallback quando o servidor recebe loopback, rede privada ou endereço ausente.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Acesso registrado. Um aviso pode ser enviado após 24 horas sem acesso.',
    type: ResponseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Sessão inválida ou 2FA pendente.',
    type: ErrorEntity,
  })
  async recordAccess(@Request() req: any, @Body() data: RecordAccessDto) {
    const sessionId = this.cookiesService.getSessionId(req as any);
    if (!sessionId) {
      throw new HttpException(
        ResponseDto.error('Sessão não encontrada', 401),
        401,
      );
    }
    return this.authService.recordAuthenticatedAccess(
      sessionId,
      req,
      data?.clientIp,
      data?.clientIpMetadata,
    );
  }

  @Post('register/user')
  @ApiOperation({
    summary: 'Criar registro de usuário',
    description: `Registra um novo usuário no sistema.

**Autenticação via Cookie**: Após o registro bem-sucedido, um cookie \`session_id\` é setado automaticamente, permitindo acesso imediato a endpoints protegidos.`,
  })
  @ApiBody({ type: CreateAuthDto })
  @ApiResponse({
    status: 201,
    description: 'Registro realizado com sucesso. Cookie session_id setado.',
    type: ResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Email já cadastrado ou senhas não coincidem.',
    type: ErrorEntity,
  })
  async create(
    @Body() data: CreateAuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.create(data);
    const sessionId = (result as ResponseDto<{ sessionId: string }>).data
      ?.sessionId;

    if (sessionId) {
      this.cookiesService.setSessionCookie(res, sessionId);
    }

    return result;
  }

  @Post('logout')
  @HttpCode(200)
  @SkipSessionFilter()
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Logout do usuário',
    description: `Realiza logout do usuário de forma idempotente.

**Efeito**: Remove a sessão do Redis, quando existir, e sempre limpa os cookies \`session_id\` e \`2fa_token\`.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Logout realizado com sucesso. Cookies de sessão removidos.',
    type: ResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Sessão inválida ou expirada.',
    type: ErrorEntity,
  })
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    return Sentry.startSpan({ op: 'auth.logout', name: 'Logout' }, async () => {
      const sessionId = this.cookiesService.getSessionId(req as any);
      const userId = req?.user?.id;

      this.cookiesService.clearSessionCookie(res);
      this.cookiesService.clearTwoFaCookie(res);

      if (sessionId) {
        await this.sessionService.deleteSession(sessionId);
      }
      if (userId) {
        await this.sessionService.deleteUserCache(String(userId));
      }
      Sentry.setTag('auth.logout.success', true);
      return ResponseDto.success('Logout realizado com sucesso');
    });
  }

  @Get('check-af2')
  @UseGuards(AuthGuard)
  @SkipSessionFilter()
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Verificar status 2FA',
    description: `Retorna o status de verificação 2FA do usuário.
    
**Retorno**:
- \`af2Verified: true\` - usuário já validou 2FA
- \`af2Verified: false\` - usuário precisa validar 2FA`,
  })
  @ApiResponse({
    status: 200,
    description: 'Status 2FA retornado.',
  })
  async checkAf2(@Request() req: any) {
    const sessionId = this.cookiesService.getSessionId(req as any);
    if (!sessionId) {
      throw new HttpException('Sessão não encontrada', 401);
    }
    const isVerified = await this.sessionService.is2FAVerified(sessionId);

    return ResponseDto.success('Status 2FA', 200, {
      af2Verified: isVerified,
    });
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Esqueci minha senha',
    description: `Inicia o processo de recuperação de senha.

**Fluxo**:
1. Envie o email cadastrado
2. O sistema verifica se o email existe e está ativo
3. Se válido, gera um token JWT de uso único (expira em 15 min) e envia por email
4. O usuário define nova senha através do endpoint \`/auth/reset-password?token=xxx\`

**Segurança**: Token JWT de uso único, expira em 15 minutos, hash armazenado no banco.`,
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Email encontrado.',
    type: ResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Email não encontrado.',
    type: ErrorEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário inativo.',
    type: ErrorEntity,
  })
  forgotPassword(@Body() data: ForgotPasswordDto) {
    return this.authService.forgotPassword(data);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Redefinir senha com token',
    description: `Altera a senha do usuário usando um token de redefinição válido.

**Query Parameters**:
- \`token\`: Token JWT de redefinição de senha (obtido via email)

**Body**:
- \`senha\`: Nova senha (mínimo 8 caracteres, com letra maiúscula e número)
- \`confirmarSenha\`: Confirmação da nova senha (deve ser igual a senha)

**Fluxo completo de recuperação**:
1. \`POST /auth/forgot-password\` → Envia token de redefinição por email (válido por 15 min)
2. \`POST /auth/reset-password?token=xxx\` → Altera a senha usando o token

**Segurança**:
- Token é de uso único (single-use)
- Token expira em 15 minutos
- Token é validado via JWT + verificação no banco`,
  })
  @ApiQuery({
    name: 'token',
    description: 'Token JWT de redefinição de senha',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    type: String,
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Senha alterada com sucesso.',
    type: ResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido, expirado ou já utilizado.',
    type: ErrorEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado.',
    type: ErrorEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário inativo.',
    type: ErrorEntity,
  })
  resetPassword(
    @Query('token') token: string,
    @Body() data: ChangePasswordDto,
  ) {
    if (!token) {
      throw new HttpException(
        ResponseDto.error('Token é obrigatório', 400),
        400,
      );
    }
    return this.authService.changePassword(token, data);
  }

  @Post('dev/create-admin')
  @HttpCode(201)
  @ApiOperation({
    summary: '[DEV-ONLY] Criar user ADMIN (bypass de subscription)',
    description: 'Gateado por NODE_ENV !== production.',
  })
  async createDevAdmin(
    @Body()
    data: {
      email: string;
      nome: string;
      senha: string;
      telefone: string;
    },
  ) {
    return this.authService.createDevAdmin(data);
  }

  @Post('validate-email')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { ttl: 60000, limit: 10 },
    email: { ttl: 3600000, limit: 3 },
  })
  @ApiOperation({
    summary: 'Validar ou solicitar token de validação de email',
    description: `Este endpoint pode ser usado de duas formas:

**1. Solicitar token de validação** (enviar email):
- Envie apenas o campo \`email\` no body
- Um token de validação será enviado para o email
- Tipo: REGISTRATION

**2. Validar token** (confirmar email):
- Envie o campo \`token\` no body
- O token verifica e valida o email
- Tipo: REGISTRATION ou UPDATE

**Rate limiting**:
- 10 requisições por minuto por IP
- 3 requisições por hora por email`,
  })
  @ApiBody({ type: ValidateEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Token enviado ou email validado com sucesso.',
    type: ValidateEmailResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Email já cadastrado ou token inválido.',
    type: ErrorEntity,
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit excedido.',
    type: ErrorEntity,
  })
  async validateEmail(@Body() data: ValidateEmailDto) {
    if (data.email) {
      return this.authService.requestValidationToken(data.email);
    }

    if (data.token) {
      return this.authService.validateEmailToken(data.token);
    }

    throw new HttpException(
      ResponseDto.error('Email ou token é obrigatório', 400),
      400,
    );
  }

  @Get('dev/2fa-code')
  @ApiOperation({
    summary: '[DEV-ONLY] Retorna codigo 2FA atual da sessao',
    description: 'Usado por testes E2E Playwright. Gateado por NODE_ENV.',
  })
  @ApiResponse({ status: 200, description: 'Codigo retornado' })
  @ApiResponse({ status: 403, description: 'Em producao' })
  @ApiResponse({ status: 401, description: 'Sessao invalida' })
  async getTwoFactorCode(@Request() req: any) {
    const sessionId = this.cookiesService.getSessionId(req as any);
    if (!sessionId) {
      throw new HttpException('Sessao nao encontrada', 401);
    }
    return this.authService.getCurrentTwoFactorCode(sessionId);
  }
}
