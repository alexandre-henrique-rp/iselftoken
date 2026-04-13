# Perfil

## **rota:** /profile
## **path:** app/routes/private/profile/index.tsx
## **component únicos:** app/routes/private/profile/components/index.tsx
## **api route:** userApi.me()
## **Type:** private

## **funcionalidade:**
- página de perfil e validação KYC do usuário
- layout em seções com cards e formulários longos

### **Seção 1: Dados pessoais**
- formulário com campos:
  - Nome completo (obrigatório)
  - E-mail (com status "E-mail verificado")
  - Telefone/WhatsApp + botão **Verificar número**
  - Data de nascimento (dia/mês/ano em campos separados)
  - Sexo (select)
  - Estado civil (select)
- bloco **Endereço** com campos:
  - Endereço (rua/avenida)
  - Número
  - Bairro
  - País (select)
  - Estado (select)
  - Cidade (select)
  - Complemento (opcional)
  - Profissão/Ocupação

### **Seção 2: Documentação**
- card informativo com documentos aceitos (brasileiros/estrangeiros)
- seleção do tipo de documento (RG, CNH, Passaporte, DNI)
- campo para número do documento
- campo para data de emissão

### **Upload do documento**
- card com requisitos (nitidez, formato, tamanho máximo)
- área de upload com drag-and-drop
- botão **Escolher arquivo**

### **Selfie com documento (prova de vida)**
- card com dicas para boa selfie
- área de envio com botões:
  - **Enviar foto**
  - **Tirar selfie**
- fluxo para **Tirar selfie**:
  - abre modal com pré-visualização da câmera
  - solicita permissão de acesso à câmera
  - botão **Capturar** gera a imagem
  - pré-visualização para confirmar ou refazer
  - ao confirmar, salva a imagem e fecha o modal

### **Comprovante de residência (últimos 3 meses)**
- lista de documentos aceitos (brasileiros/estrangeiros)
- área de upload com drag-and-drop
- botão **Escolher arquivo**

### **Ações finais**
- botão principal **Salvar informações**
- botão secundário **Cancelar**

### **Possíveis funcionalidades adicionais**
- salvar progresso automático (draft) ao preencher campos
- validação em tempo real de CPF/telefone/e-mail
- máscara automática para telefone e datas
- status de verificação KYC (pendente, em análise, aprovado, reprovado)
- exibir motivo de reprovação e permitir reenvio de documentos
- pré-visualização dos arquivos enviados
- limite de tamanho e formatos permitidos por tipo (JPG, PNG, PDF)
- botão para remover/substituir arquivos enviados
- histórico de atualizações do perfil
