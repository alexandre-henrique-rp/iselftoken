# Documentação Técnica - UsersService

## Visão Geral

O `UsersService` é a camada de aplicação responsável por orquestrar operações CRUD de usuários no sistema. Segue os princípios de **Clean Architecture** e **Single Responsibility Principle (SRP)**.

## Padrão de Documentação

Este serviço utiliza o padrão **"Comentários Inline"** com **JSDoc Tags**:

- **JSDoc no topo**: Tags `@name`, `@description` e `@param` para documentação formal
- **Comentários inline**: Explicam o fluxo passo-a-passo dentro do código

### Exemplo do Padrão

```typescript
/**
 * Lista todos os usuários com paginação
 * @name findAll
 * @description Busca todos os usuários do sistema com paginação e campos limitados
 *
 * @param query Objeto com parâmetros de paginação
 * @param query.page Número da página (padrão: 1)
 * @param query.limit Itens por página (padrão: 25)
 */
async findAll(query: { page?: number; limit?: number }) {
  try {
    // pagina a de consulta
    const page = query.page || 1;
    
    // itens por pagina
    const limit = query.limit || 25;
    
    // consulta os usuários
    const users = await this.prisma.user.findMany({
      // limita a quantidade de itens
      take: limit,
      // pula os itens anteriores
      skip: (page - 1) * limit,
      // seleciona os campos para exibição
      select: {
        id: true,
        email: true,
        nome: true,
        subscriptions: true,
        createdAt: true,
        avatar: {
          // seleciona os campos para exibição do relacionamento avatar
          select: {
            url_sm: true,
          },
        },
      },
    });
    
    // retorna os usuários
    return ResponseDto.success('Usuários retornados com sucesso', 200, users, page, limit);
  } catch (error) {
    // retorna erro
    return ResponseDto.error('Erro ao buscar usuários', 500, error);
  }
}
```

### Estrutura das Tags JSDoc

- **@name**: Nome do método
- **@description**: Descrição detalhada do que o método faz
- **@param**: Documentação de cada parâmetro (tipo é inferido pelo TypeScript)

---

## Arquitetura

### Camada: Application Layer (Casos de Uso)

**Responsabilidade Única**: Orquestrar operações de negócio relacionadas a usuários.

### Dependências

- **PrismaService**: Acesso ao banco de dados (Infrastructure Layer)
- **ResponseDto**: Padronização de respostas HTTP
- **PayloadEntity**: Entidade do usuário autenticado (Domain Layer)

### Fluxo de Dados

```bash
Controller → UsersService → PrismaService → Database
                ↓
           ResponseDto
```

---

## Métodos Públicos

### 1. `getMe(user: PayloadEntity)`

Retorna os dados do usuário autenticado extraídos do token JWT.

**Observações**:

- Não consulta o banco (dados já vêm do token)
- Senha já foi removida pelo `PayloadEntity.fromPrisma()`

---

### 2. `findAll(query: { page?: number; limit?: number })`

Lista todos os usuários com paginação.

**Decisões Arquiteturais**:

- **Segurança**: Retorna apenas campos não-sensíveis (sem senha, documentos)
- **Performance**: Usa `select` ao invés de `include` para limitar dados
- **UX**: Avatar retorna apenas thumbnail (url_sm) para otimizar tráfego

**Correção Aplicada (v1.1)**:

```typescript
// ❌ ANTES: Bug NaN quando page é undefined
skip: (query.page - 1) * (query.limit || 25)

// ✅ DEPOIS: Normaliza valores antes do cálculo
const page = query.page || 1;
const limit = query.limit || 25;
skip: (page - 1) * limit
```

---

### 3. `findOne(id: number)`

Busca um usuário específico por ID com todas as relações.

**Relações Incluídas**:

- Financeiro: `payments`, `subscriptions`, `wallet`, `investments`
- Tokens: `tokens`, `tokenHistory`
- Documentos KYC: `avatar`, `comprovante`, `documento`, `biofacial`
- Outros: `startups`, `auditLogs`

**Observações**:

- Não retorna 404 quando usuário não existe (retorna `data: null`)
- Carrega todas as relações (pode ser pesado para usuários com muitos dados)

---

### 4. `update(id: number, updateUserDto: UpdateUserDto)`

Atualiza dados de um usuário.

**Observações**:

- Se usuário não existe, Prisma lança `PrismaClientKnownRequestError` (P2025)
- Retorna 500 ao invés de 404 para usuário não encontrado

---

### 5. `remove(id: number)`

Remove um usuário do sistema (hard delete).

**Observações**:

- **Operação Irreversível**: Hard delete permanente
- Pode falhar se houver restrições de chave estrangeira

---

## Melhorias Recomendadas

### 1. Validação de Existência (404)

**Problema Atual**: Métodos retornam 500 quando usuário não existe.

**Solução**:

```typescript
async findOne(id: number) {
  try {
    const user = await this.prisma.user.findUnique({ ... });
    
    if (!user) {
      return ResponseDto.error('Usuário não encontrado', 404);
    }
    
    return ResponseDto.success('Usuário encontrado com sucesso', 200, user);
  } catch (error) {
    return ResponseDto.error('Erro ao buscar usuário', 500, error);
  }
}
```

### 2. Tratamento de Erros Específicos do Prisma

**Problema**: Todos os erros retornam 500 genérico.

**Solução**:

```typescript
import { Prisma } from '@prisma/client';

async update(id: number, updateUserDto: UpdateUserDto) {
  try {
    // ...
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return ResponseDto.error('Usuário não encontrado', 404);
      }
    }
    return ResponseDto.error('Erro ao atualizar usuário', 500, error);
  }
}
```

### 3. Soft Delete

**Problema**: `remove()` faz hard delete irreversível.

**Solução**:

```typescript
async remove(id: number) {
  try {
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
    return ResponseDto.success('Usuário removido com sucesso', 200);
  } catch (error) {
    // ...
  }
}
```

### 4. Filtrar Senha no Update

**Problema**: `update()` retorna todos os dados, incluindo potencialmente a senha.

**Solução**:

```typescript
async update(id: number, updateUserDto: UpdateUserDto) {
  try {
    const update = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        nome: true,
        // ... outros campos exceto senha
      }
    });
    return ResponseDto.success('Usuário atualizado com sucesso', 200, update);
  } catch (error) {
    // ...
  }
}
```

### 5. Paginação com Total de Registros

**Problema**: `findAll()` não retorna total de registros para UI de paginação.

**Solução**:

```typescript
async findAll(query: { page?: number; limit?: number }) {
  try {
    const page = query.page || 1;
    const limit = query.limit || 25;
    
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ ... }),
      this.prisma.user.count()
    ]);
    
    return ResponseDto.success(
      'Usuários retornados com sucesso',
      200,
      users,
      total,
      page
    );
  } catch (error) {
    // ...
  }
}
```

---

## Princípios de Clean Code Aplicados

### 1. Single Responsibility Principle (SRP)

- Cada método tem uma única responsabilidade
- Serviço não lida com validação de DTOs (feito pelo NestJS)
- Não lida com autenticação (feito pelo AuthGuard)

### 2. Nomes Descritivos

- `getMe`: Claramente retorna dados do usuário autenticado
- `findAll`: Lista todos com paginação
- `findOne`: Busca um específico
- `update`: Atualiza dados
- `remove`: Remove usuário

### 3. Abstração de Complexidade

- Usa `PrismaService` para abstrair SQL
- Usa `ResponseDto` para padronizar respostas
- Usa `PayloadEntity` para abstrair dados do token

### 4. Fail-Safe

- Todos os métodos assíncronos usam try-catch
- Retorna sempre `ResponseDto` padronizado
- Valores padrão para paginação (page: 1, limit: 25)

---

## Testes Recomendados

### Testes Unitários

```typescript
describe('UsersService', () => {
  describe('findAll', () => {
    it('deve usar valores padrão quando page e limit não são fornecidos', async () => {
      // Testa correção do bug de paginação
    });
    
    it('deve calcular skip corretamente para página 2', async () => {
      // Testa: (2 - 1) * 25 = 25
    });
  });
  
  describe('findOne', () => {
    it('deve retornar null quando usuário não existe', async () => {
      // Testa comportamento atual
    });
  });
  
  describe('update', () => {
    it('deve lançar erro quando usuário não existe', async () => {
      // Testa erro P2025 do Prisma
    });
  });
});
```

---

## Dependências Externas

- **@nestjs/common**: Decorators e injeção de dependência
- **@prisma/client**: ORM para acesso ao banco
- **PrismaService**: Serviço customizado do Prisma
- **ResponseDto**: DTO de resposta padronizada
- **PayloadEntity**: Entidade do usuário autenticado

---

## Histórico de Mudanças

### v1.1 (2026-01-13)

- ✅ Corrigido bug de paginação no `findAll` (NaN quando page é undefined)
- ✅ Adicionada documentação completa em JSDoc
- ✅ Normalização de parâmetros de paginação

### v1.0 (Data Original)

- Implementação inicial dos métodos CRUD
- Integração com PrismaService
- Padronização de respostas com ResponseDto
