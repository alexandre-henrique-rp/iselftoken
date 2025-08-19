---
Descrição: Mapeamento de Componentes do Projeto iSelfToken
---

# Mapeamento de Componentes

## Componentes UI Base (Shadcn-inspired)

- **Avatar**
  - Localização: `src/components/ui/avatar.tsx`
  - Responsabilidade: Exibir imagem ou placeholder de perfil do usuário.
  - Dependências: Nenhuma específica.
  - Props: `src` (opcional, URL da imagem), `alt` (texto alternativo).
  - Exemplo de Uso: `<Avatar src='/user.jpg' alt='Usuário' />`

- **Badge**
  - Localização: `src/components/ui/badge.tsx`
  - Responsabilidade: Exibir etiquetas ou status com estilo consistente.
  - Dependências: `class-variance-authority` para variantes.
  - Props: `variant` (estilo da etiqueta).
  - Exemplo de Uso: `<Badge variant='default'>Novo</Badge>`

- **Button**
  - Localização: `src/components/ui/button.tsx`
  - Responsabilidade: Botão interativo com variantes de estilo.
  - Dependências: `class-variance-authority`, `clsx`.
  - Props: `variant`, `size`, `asChild` (para renderizar como outro elemento).
  - Exemplo de Uso: `<Button variant='destructive' size='lg'>Excluir</Button>`

- **Card**
  - Localização: `src/components/ui/card.tsx`
  - Responsabilidade: Container estilizado para conteúdo agrupado.
  - Dependências: Nenhuma específica.
  - Props: Nenhuma específica, aceita children.
  - Exemplo de Uso: `<Card><CardHeader>Título</CardHeader><CardContent>Conteúdo</CardContent></Card>`

- **Dialog**
  - Localização: `src/components/ui/dialog.tsx`
  - Responsabilidade: Sistema de modal para interações.
  - Dependências: `@radix-ui/react-dialog`.
  - Props: `open`, `onOpenChange`.
  - Exemplo de Uso: `<Dialog open={isOpen} onOpenChange={setIsOpen}><DialogContent>Conteúdo do Modal</DialogContent></Dialog>`

- **Form**
  - Localização: `src/components/ui/form.tsx`
  - Responsabilidade: Componentes para formulários com validação.
  - Dependências: `react-hook-form`.
  - Props: `form`, `onSubmit`.
  - Exemplo de Uso: `<Form {...form}><FormField control={form.control} name='email' render={({ field }) => <Input {...field} />} /></Form>`

- **Input**
  - Localização: `src/components/ui/input.tsx`
  - Responsabilidade: Campo de entrada de texto estilizado.
  - Dependências: Nenhuma específica.
  - Props: Padrões de input HTML (`type`, `placeholder`, etc.).
  - Exemplo de Uso: `<Input type='email' placeholder='Digite seu e-mail' />`

- **Label**
  - Localização: `src/components/ui/label.tsx`
  - Responsabilidade: Rótulo para campos de formulário.
  - Dependências: `@radix-ui/react-label`.
  - Props: `htmlFor` (associação com input).
  - Exemplo de Uso: `<Label htmlFor='email'>E-mail</Label>`

- **Progress**
  - Localização: `src/components/ui/progress.tsx`
  - Responsabilidade: Indicador de progresso linear.
  - Dependências: Nenhuma específica.
  - Props: `value` (percentual de progresso).
  - Exemplo de Uso: `<Progress value={50} />`

- **Switch**
  - Localização: `src/components/ui/switch.tsx`
  - Responsabilidade: Interruptor para opções binárias.
  - Dependências: Nenhuma específica.
  - Props: `checked`, `onCheckedChange`.
  - Exemplo de Uso: `<Switch checked={isActive} onCheckedChange={setIsActive} />`

- **Tabs**
  - Localização: `src/components/ui/tabs.tsx`
  - Responsabilidade: Sistema de abas para navegação de conteúdo.
  - Dependências: Nenhuma específica.
  - Props: `defaultValue`, `value`, `onValueChange`.
  - Exemplo de Uso: `<Tabs defaultValue='tab1'><TabsList><TabsTrigger value='tab1'>Tab 1</TabsTrigger></TabsList><TabsContent value='tab1'>Conteúdo 1</TabsContent></Tabs>`

## Componentes de Negócio

- **Carousel**
  - Localização: `src/components/carousel.tsx`
  - Responsabilidade: Exibir oportunidades em carrossel interativo.
  - Dependências: Bibliotecas de carrossel específicas (ex.: Embla).
  - Props: `items` (array de dados para slides).
  - Exemplo de Uso: `<Carousel items={oportunidades} />`

- **ProfileCard**
  - Localização: `src/components/profile-card.tsx`
  - Responsabilidade: Exibir informações de perfil de usuário.
  - Dependências: Componentes UI base (`Card`, `Avatar`).
  - Props: `name`, `description`, `imageUrl`.
  - Exemplo de Uso: `<ProfileCard name='João' description='Investidor' imageUrl='/joao.jpg' />`

- **StartupCard**
  - Localização: `src/components/startup-card.tsx`
  - Responsabilidade: Exibir informações de startups em destaque.
  - Dependências: Componentes UI base (`Card`, `Badge`).
  - Props: `name`, `sector`, `description`.
  - Exemplo de Uso: `<StartupCard name='TechStartup' sector='Tecnologia' description='Solução inovadora' />`

## Componentes de Formulário (Autenticação)

- **InvestorForm**
  - Localização: `src/components/register/InvestorForm.tsx`
  - Responsabilidade: Formulário de registro para investidores.
  - Dependências: `react-hook-form`, `zod`, `remask` (máscaras).
  - Props: Nenhuma específica, gerencia estado interno.
  - Exemplo de Uso: `<InvestorForm />`

- **StartupForm**
  - Localização: `src/components/register/StartupForm.tsx`
  - Responsabilidade: Formulário de registro para startups.
  - Dependências: `react-hook-form`, `zod`, `remask` (máscaras).
  - Props: Nenhuma específica, gerencia estado interno.
  - Exemplo de Uso: `<StartupForm />`

- **LoginForm**
  - Localização: `src/components/login-form.tsx`
  - Responsabilidade: Formulário de login de usuário.
  - Dependências: `react-hook-form`, `zod`.
  - Props: Nenhuma específica, gerencia estado interno.
  - Exemplo de Uso: `<LoginForm />`
