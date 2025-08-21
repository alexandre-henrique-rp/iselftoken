---
Descrição: Página Pública /register
---

# Página `/register`

- Arquivo: `src/app/(public)/register/page.tsx`
- Objetivo: Cadastro público para dois perfis: investidor e startup.
- Modal inicial solicitando o usuario marcar a checkbox referente ao pais, então dever todo os países, depois de ter selecionado o pais o usuario deve selecionar o estado ou província, as opções deve ser carregadas conforme o pais selecionado, depois de selecionar o estado ou província o usuario deve selecionar a cidade, as opções deve ser carregadas conforme o estado ou província selecionado, depois um checkbox para confirmar que o usuario leu e aceita os termos de uso, e por ultimo um botão de cancelar que leva para / e um botão para proximo modal ou tela do modal, lembrando de respeitar o idioma do usuario, esse modal deve ser obrigatório.
- o proximo modal dee conter se a pessoa é investidor, afiliado ou Fundador de Startup, se selecionado investidor deve fechar o modal e carregar o componente de registro de investidor, se selecionado startup deve fechar o modal e carregar o componente de registro de startup, se selecionado afiliado deve fechar o modal e carregar o componente de registro de afiliado, e por ultimo um botão de cancelar que leva para / e um botão para proximo modal ou tela do modal, lembrando de respeitar o idioma do usuario, esse modal deve ser obrigatório.
- se clicar em termos de uso deve abrir uma janela modal com o termos de uso, e por ultimo um botão li os termos fecha a janela modal retornando para o modal anterior.
- se clicar em politica de privacidade deve abrir uma janela modal com a politica de privacidade, e por ultimo um botão li a politica fecha a janela modal retornando para o modal anterior.
- cada caompomente (investidor, startup, afiliado) deve utilizar e rect-form com zod para validação dos inputs, e tambem cada um deve ter seu proprio handlesubmit para dar um console log nas informaçoes preenchidas.

** inputs **

- investor ou fundador ou afiliado
  - nome
  - cpf
  - telefone
  - cep
  - endereco
  - bairro
  - cidade - deve ser preenchido conforme selecionado no modal 
  - uf - deve ser preenchido conforme selecionado no modal 
  - pais - deve ser preenchido conforme selecionado no modal 
  - numero
  - email
  - senha
  - confirmacaoSenha
  - termos
  - politica

** atenção **
- o modal deve ser obrigatório
- o modal deve ser fechado ao clicar em cancelar e redirecionar para /
- o modal deve ir para modal anterior ao clicar em voltar
- o modal deve ir para modal seguinte ao clicar em proximo
- o modal deve ser fechado ao clicar em finalizar
- respeitar o idioma do usuario
- respeitar tema do usuario


## Components

### **ModalSelecaoPaisEstadoCidade**
- **Descrição**: Modal inicial para seleção de país, estado/província e cidade.
- **Objetivo**: Capturar a localização do usuário de forma estruturada, respeitando o idioma e tema do usuário.
- **Lógica**: 
  - Exibe uma lista de países para seleção.
  - Carrega dinamicamente estados/províncias com base no país selecionado.
  - Carrega dinamicamente cidades com base no estado/província selecionado.
  - Inclui checkbox para aceitação dos termos de uso.
  - Botões de navegação: 'Cancelar' (redireciona para '/') e 'Próximo' (avança para o próximo modal).
- **Implementação**: Utiliza componentes de UI como `Dialog` e `Select` do Radix UI para seleção dinâmica. Integração com i18n para suporte multilíngue.

### **ModalSelecaoPerfil**
- **Descrição**: Modal para escolha do tipo de perfil do usuário.
- **Objetivo**: Direcionar o usuário para o formulário de registro correto com base no perfil selecionado (Investidor, Afiliado ou Fundador de Startup).
- **Lógica**: 
  - Exibe opções de perfil para seleção.
  - Fecha o modal e carrega o componente de registro correspondente ao perfil selecionado.
  - Botões de navegação: 'Cancelar' (redireciona para '/') e 'Próximo' (carrega formulário).
- **Implementação**: Utiliza estado local para gerenciar a seleção e redirecionamento com `useRouter` do Next.js.

### **ModalTermosDeUso**
- **Descrição**: Modal para exibição dos Termos de Uso.
- **Objetivo**: Permitir que o usuário leia os Termos de Uso antes de prosseguir com o registro.
- **Lógica**: 
  - Exibe o conteúdo dos Termos de Uso.
  - Botão 'Li os Termos' fecha o modal e retorna ao modal anterior.
- **Implementação**: Conteúdo carregado de um arquivo estático ou API, renderizado em um componente `Dialog`.

### **ModalPoliticaPrivacidade**
- **Descrição**: Modal para exibição da Política de Privacidade.
- **Objetivo**: Permitir que o usuário leia a Política de Privacidade antes de prosseguir.
- **Lógica**: 
  - Exibe o conteúdo da Política de Privacidade.
  - Botão 'Li a Política' fecha o modal e retorna ao modal anterior.
- **Implementação**: Similar ao `ModalTermosDeUso`, com conteúdo específico da política.

### **InvestorForm**
- **Descrição**: Formulário de registro para investidores.
- **Objetivo**: Capturar informações pessoais e de contato do investidor.
- **Lógica**: 
  - Campos: Nome, CPF, Telefone, CEP, Endereço, Bairro, Cidade, UF, País, Número, Email, Senha, Confirmação de Senha, Termos, Política.
  - Validação com Zod para garantir formato correto (ex.: CPF válido, senhas iguais).
  - `handleSubmit` exibe dados no console para testes.
- **Implementação**: Utiliza `react-hook-form` para gerenciamento de formulários e `Zod` para validação. Máscaras para CPF, telefone e CEP com `remask`.

### **StartupForm**
- **Descrição**: Formulário de registro para fundadores de startups.
- **Objetivo**: Capturar informações do fundador e da startup.
- **Lógica**: 
  - Campos semelhantes ao `InvestorForm`, com possíveis campos adicionais para dados da startup.
  - Validação rigorosa com Zod.
  - `handleSubmit` exibe dados no console.
- **Implementação**: Similar ao `InvestorForm`, com ajustes para campos específicos de startup.

### **AfiliadoForm**
- **Descrição**: Formulário de registro para afiliados.
- **Objetivo**: Capturar informações do afiliado.
- **Lógica**: 
  - Campos semelhantes aos outros formulários.
  - Validação com Zod.
  - `handleSubmit` exibe dados no console.
- **Implementação**: Similar aos outros formulários, adaptado para afiliados.

## Lógica Principal

- **Fluxo de Registro**: 
  1. Usuário acessa `/register` e é apresentado ao `ModalSelecaoPaisEstadoCidade`.
  2. Após selecionar localização e aceitar termos, avança para `ModalSelecaoPerfil`.
  3. Escolhe o perfil e é direcionado ao formulário correspondente (`InvestorForm`, `StartupForm` ou `AfiliadoForm`).
  4. Preenche o formulário, que é validado e submetido (atualmente, apenas console.log).
  5. Modais de Termos de Uso e Política de Privacidade podem ser acessados a qualquer momento.
- **Redirecionamentos**: 
  - 'Cancelar' em qualquer modal redireciona para '/'.
  - 'Voltar' retorna ao modal anterior.
  - 'Próximo' avança no fluxo.
- **Internacionalização**: Todo o conteúdo respeita o idioma do usuário via i18n.
- **Tema**: Interface adapta-se ao tema claro/escuro do usuário.

## Decisões de Implementação

- **Clean Architecture**: Componentes separados por responsabilidade (UI, formulários, modais), respeitando DDD ao modelar perfis como entidades distintas.
- **React Hook Form + Zod**: Escolhidos para validação robusta e integração com TypeScript, garantindo formulários tipados e reutilizáveis.
- **Remask**: Utilizado para máscaras de entrada (CPF, CEP, telefone), substituindo `react-input-mask` devido a compatibilidade com React 19.
- **Modais Obrigatórios**: Garantem que o usuário complete todas as etapas antes de prosseguir, melhorando a experiência e conformidade.
- **i18n**: Suporte a múltiplos idiomas para atender a uma base de usuários global.
- **Componentization**: Cada modal e formulário é um componente independente, promovendo reutilização e manutenção.

## Testes Recomendados

- **Testes de Unidade**: 
  - Validação de schemas Zod para cada formulário.
  - Funcionalidade de máscaras com `remask` para CPF, telefone, CEP.
  - Comportamento de `handleSubmit` em cada formulário.
- **Testes de Integração**: 
  - Fluxo completo de registro, desde a seleção de país até a submissão do formulário.
  - Interação entre modais (abertura, fechamento, navegação).
  - Redirecionamentos e comportamento de botões (Cancelar, Voltar, Próximo).
- **Testes de UI**: 
  - Responsividade dos modais e formulários em diferentes dispositivos.
  - Adaptação ao tema claro/escuro.
  - Tradução de textos via i18n em diferentes idiomas.
- **Testes de Acessibilidade**: 
  - Garantir que todos os campos e modais sejam acessíveis via teclado e leitores de tela.
