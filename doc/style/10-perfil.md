# **Documentação Técnica \- Perfil & KYC**

## **Informações Gerais**

| Propriedade | Valor |
| :---- | :---- |
| **Rota** | /profile |
| **Path** | /app/routes/private/profile/index.tsx |
| **Componentes Únicos** | /app/routes/private/profile/components/index.tsx |
| **API Route** | userApi.me(), userApi.updateProfile(), userApi.uploadDoc() |
| **Type** | Private (Requer autenticação) |
| **Status KYC** | Gerenciado via estado global ou prop do usuário |

## **Dependências**

### **Ícones (Lucide React)**

import {   
  User, Mail, Phone, Calendar, MapPin, Briefcase,   
  FileText, Upload, Camera, CheckCircle, AlertCircle,   
  X, ChevronDown, Save, Loader2, Image as ImageIcon   
} from 'lucide-react';

## **Estrutura da Página**

A página é dividida em **3 grandes blocos verticais**:

1. **Header de Status:** Resumo do perfil e status atual da verificação (Pendente/Aprovado).  
2. **Formulário de Dados (Seção 1):** Informações pessoais e endereço.  
3. **Validação Documental (Seção 2):** Uploads e Captura de foto.

## **1\. Formulário de Dados Pessoais**

### **Inputs Especiais**

| Campo | Tipo | Comportamento |
| :---- | :---- | :---- |
| **E-mail** | Read-only | Exibe badge "Verificado" se email\_verified: true. |
| **Telefone** | Input \+ Action | Botão "Verificar" envia OTP se não verificado. |
| **Nascimento** | Split Fields | 3 inputs numéricos (DD / MM / AAAA) para evitar erros de formato. |

### **Endereço e Profissão**

Utiliza Grid Responsivo (grid-cols-1 md:grid-cols-3) para organizar os campos de logradouro, número, cidade, etc.

## **2\. Documentação e Uploads**

### **Componente FileUpload**

Área de arrastar e soltar arquivos.

* **Estados:** Ocioso, Arrastando (Highlight), Carregado (Preview), Erro.  
* **Formatos:** JPG, PNG, PDF (Max 5MB).

### **Componente WebcamModal (Selfie)**

Modal para captura de prova de vida em tempo real.

**Fluxo:**

1. Usuário clica em "Tirar Selfie".  
2. Modal abre solicitando permissão (simulado via UI).  
3. Preview do vídeo é exibido.  
4. Botão "Capturar" congela o frame.  
5. Usuário confirma ("Usar foto") ou refaz ("Tirar outra").

## **3\. Barra de Ações (Sticky Footer)**

Uma barra fixa ou no final do fluxo que permite salvar o progresso.

* **Salvar Informações:** Envia payload JSON para API.  
* **Cancelar:** Reseta alterações ou volta para Home.

## **Mock Data Structure (API)**

{  
  "full\_name": "Ricardo Mendes",  
  "email": "ricardo@finflow.com.br",  
  "email\_verified": true,  
  "phone": "+55 11 99999-9999",  
  "phone\_verified": false,  
  "kyc\_status": "pending", // pending, analysis, approved, rejected  
  "kyc\_step": 1 // Controle de progresso  
}  
