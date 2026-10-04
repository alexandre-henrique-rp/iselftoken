# Wallet

**Propósito:** Carteira digital do usuário com saldo em BRL, depósito via PIX (gera QR Code) e saque para conta bancária.

**Dependências:**
- `[../../prisma/prisma.service]` (acesso a Wallet, WalletTransaction, Payment, User)
- `[../../auth/auth.guard]` (AuthGuard obrigatório em todas as rotas)
- `[../../common/dto/response.dto]` (wrapper padrão ResponseDto)

**Mapa de Arquivos:**
- [wallet.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/wallet/wallet.module.ts) - módulo com WalletController e WalletService
- [wallet.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/wallet/wallet.controller.ts) - rotas GET /wallet, POST /wallet/deposit, POST /wallet/withdraw
- [wallet.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/wallet/wallet.service.ts) - lógica de saldo, PIX EMV, approve/reject de saques
- [dto/wallet.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/wallet/dto/wallet.dto.ts) - DepositDto e WithdrawDto (class-validator)
- [wallet.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/wallet/wallet.service.spec.ts) - testes unitários do service
