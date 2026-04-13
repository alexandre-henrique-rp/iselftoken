import React, { useState, useRef, useEffect } from 'react';
import { 
  User, Mail, Phone, Calendar, MapPin, Briefcase, 
  FileText, Upload, Camera, CheckCircle, AlertCircle, 
  X, ChevronDown, Save, Loader2, Image as ImageIcon,
  Video, RefreshCw
} from 'lucide-react';

// ============================================
// COMPONENTES UI (DESIGN SYSTEM - DARK THEME)
// ============================================

const Card = ({ title, description, children, className = "" }) => (
  <div className={`bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-sm ${className}`}>
    {(title || description) && (
      <div className="mb-6 border-b border-stone-800 pb-4">
        {title && <h3 className="text-xl font-bold text-stone-50 flex items-center gap-2">{title}</h3>}
        {description && <p className="text-sm text-stone-400 mt-1">{description}</p>}
      </div>
    )}
    {children}
  </div>
);

const InputLabel = ({ label, required }) => (
  <label className="block text-sm font-medium text-stone-400 mb-1.5">
    {label} {required && <span className="text-red-400">*</span>}
  </label>
);

const InputField = ({ icon: Icon, rightElement, readOnly, className = "", ...props }) => (
  <div className="relative group">
    {Icon && (
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-blue-400 transition-colors">
        <Icon className="w-4 h-4" />
      </div>
    )}
    <input
      readOnly={readOnly}
      className={`
        w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-lg 
        ${Icon ? 'pl-10' : 'pl-4'} ${rightElement ? 'pr-24' : 'pr-4'} py-2.5
        placeholder:text-stone-600 
        ${readOnly ? 'opacity-60 cursor-not-allowed text-stone-500' : 'focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600'}
        transition-all text-sm shadow-inner ${className}
      `}
      {...props}
    />
    {rightElement && (
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        {rightElement}
      </div>
    )}
  </div>
);

const SelectField = ({ options, ...props }) => (
  <div className="relative">
    <select
      className="w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 appearance-none text-sm cursor-pointer shadow-inner"
      {...props}
    >
      {options.map((opt, i) => (
        <option key={i} value={opt.value} className="bg-stone-900 text-stone-100">{opt.label}</option>
      ))}
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
  </div>
);

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 border-transparent",
    secondary: "bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700 hover:border-stone-600",
    outline: "bg-transparent border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-600 hover:bg-stone-800/50",
    ghost: "bg-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800",
    success: "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 border-transparent"
  };
  return (
    <button 
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 border ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// ============================================
// COMPONENTE: FILE UPLOAD
// ============================================

const FileUpload = ({ label, acceptedTypes, onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file) => {
    setFile(file);
    if (onFileSelect) onFileSelect(file);
  };

  return (
    <div className="w-full">
      {file ? (
        <div className="flex items-center justify-between p-4 bg-stone-950 border border-stone-800 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-200">{file.name}</p>
              <p className="text-xs text-stone-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <button 
            onClick={() => setFile(null)} 
            className="p-2 hover:bg-stone-900 rounded-lg text-stone-500 hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div 
          className={`
            border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
            ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-stone-700 hover:border-stone-500 bg-stone-950/50 hover:bg-stone-950'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={inputRef} 
            className="hidden" 
            accept={acceptedTypes}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="w-12 h-12 bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-stone-700">
            <Upload className="w-6 h-6 text-stone-400" />
          </div>
          <p className="text-stone-300 font-medium mb-1">{label}</p>
          <p className="text-xs text-stone-500">Arraste ou clique para selecionar</p>
          <p className="text-xs text-stone-600 mt-2 uppercase">{acceptedTypes.replace(/,/g, ', ')} • Max 5MB</p>
        </div>
      )}
    </div>
  );
};

// ============================================
// COMPONENTE: WEBCAM MODAL
// ============================================

const WebcamModal = ({ isOpen, onClose, onCapture }) => {
  const [step, setStep] = useState('permission');
  const [imgSrc, setImgSrc] = useState(null);

  if (!isOpen) return null;

  const handleCapture = () => {
    setImgSrc("https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop"); 
    setStep('review');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-stone-800 bg-stone-900/50">
          <h3 className="text-lg font-semibold text-stone-50">Prova de Vida</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'permission' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20 animate-pulse">
                <Video className="w-8 h-8 text-blue-400" />
              </div>
              <h4 className="text-xl font-bold text-stone-50 mb-2">Permitir acesso à câmera?</h4>
              <p className="text-stone-400 mb-8 max-w-xs mx-auto leading-relaxed">
                Precisamos acessar sua câmera temporariamente para validar sua identidade com segurança.
              </p>
              <Button onClick={() => setStep('camera')} className="w-full">
                Permitir e Continuar
              </Button>
            </div>
          )}

          {step === 'camera' && (
            <div className="relative">
              <div className="aspect-4/3 bg-black rounded-lg overflow-hidden relative mb-6 border border-stone-800 shadow-inner">
                {/* Simulação Feed */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <User className="w-32 h-32 text-stone-800 opacity-50" />
                  <p className="absolute bottom-4 text-stone-500 text-xs font-mono animate-pulse">● REC</p>
                </div>
                {/* Guia Visual */}
                <div className="absolute inset-0 border-2 border-dashed border-stone-600/50 rounded-full m-12 pointer-events-none"></div>
              </div>
              <div className="flex justify-center">
                <button 
                  onClick={handleCapture}
                  className="w-16 h-16 rounded-full border-4 border-stone-700 bg-stone-200 hover:bg-white transition-all duration-200 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95"
                >
                  <div className="w-14 h-14 bg-white rounded-full border-2 border-stone-300"></div>
                </button>
              </div>
            </div>
          )}

          {step === 'review' && imgSrc && (
            <div className="text-center">
              <div className="aspect-4/3 bg-black rounded-lg overflow-hidden relative mb-6 border border-stone-800">
                <img src={imgSrc} alt="Selfie" className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep('camera')} className="flex-1">
                  <RefreshCw className="w-4 h-4" />
                  Refazer
                </Button>
                <Button variant="success" onClick={() => { onCapture(imgSrc); onClose(); }} className="flex-1">
                  <CheckCircle className="w-4 h-4" />
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// PÁGINA PRINCIPAL
// ============================================

export default function ProfilePage() {
  const [kycStatus, setKycStatus] = useState('pending');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selfie, setSelfie] = useState(null);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-50 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8 pb-24">
        
        {/* 0. Header da Página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-stone-50 tracking-tight">Meu Perfil</h1>
            <p className="text-stone-400 mt-1">Gerencie seus dados pessoais e verificação de identidade.</p>
          </div>
          <div className="flex items-center gap-3 bg-stone-900 p-2 pr-4 rounded-xl border border-stone-800 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
              kycStatus === 'approved' 
                ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              {kycStatus === 'approved' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-bold tracking-wider">Status da Conta</p>
              <p className={`text-sm font-bold ${kycStatus === 'approved' ? 'text-green-400' : 'text-amber-400'}`}>
                {kycStatus === 'approved' ? 'Verificada' : 'Verificação Pendente'}
              </p>
            </div>
          </div>
        </div>

        {/* 1. Seção: Dados Pessoais */}
        <Card title="Dados Pessoais" description="Informações básicas para identificação na plataforma.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="md:col-span-2">
              <InputLabel label="Nome Completo" required />
              <InputField icon={User} placeholder="Seu nome completo" defaultValue="Ricardo Mendes" />
            </div>

            <div>
              <InputLabel label="E-mail" required />
              <InputField 
                icon={Mail} 
                defaultValue="ricardo@finflow.com.br" 
                readOnly
                rightElement={
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                    <CheckCircle className="w-3 h-3" /> VERIFICADO
                  </span>
                }
              />
            </div>

            <div>
              <InputLabel label="Telefone / WhatsApp" required />
              <div className="flex gap-2">
                <InputField icon={Phone} placeholder="(00) 00000-0000" className="flex-1" />
                <Button variant="secondary" className="px-3">Verificar</Button>
              </div>
            </div>

            <div>
              <InputLabel label="Data de Nascimento" required />
              <div className="flex gap-2">
                <InputField placeholder="Dia" className="text-center" />
                <InputField placeholder="Mês" className="text-center" />
                <InputField placeholder="Ano" className="text-center flex-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <InputLabel label="Sexo" required />
                <SelectField options={[
                  {label: 'Selecione', value: ''},
                  {label: 'Masculino', value: 'm'},
                  {label: 'Feminino', value: 'f'},
                  {label: 'Outro', value: 'o'}
                ]} />
              </div>
              <div>
                <InputLabel label="Estado Civil" required />
                <SelectField options={[
                  {label: 'Selecione', value: ''},
                  {label: 'Solteiro(a)', value: 's'},
                  {label: 'Casado(a)', value: 'c'},
                  {label: 'Divorciado(a)', value: 'd'}
                ]} />
              </div>
            </div>
          </div>

          <div className="border-t border-stone-800 pt-6">
            <h4 className="text-stone-50 font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-500" /> Endereço e Ocupação
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <InputLabel label="Endereço (Rua/Avenida)" required />
                <InputField placeholder="Ex: Av. Paulista" />
              </div>
              <div>
                <InputLabel label="Número" required />
                <InputField placeholder="1234" />
              </div>
              <div className="md:col-span-2">
                <InputLabel label="Bairro" required />
                <InputField placeholder="Bairro" />
              </div>
              <div className="md:col-span-2">
                <InputLabel label="Complemento" />
                <InputField placeholder="Ap 101, Bloco B" />
              </div>
              <div>
                <InputLabel label="País" required />
                <SelectField options={[{label: 'Brasil', value: 'br'}]} />
              </div>
              <div>
                <InputLabel label="Estado" required />
                <SelectField options={[{label: 'SP', value: 'sp'}, {label: 'RJ', value: 'rj'}]} />
              </div>
              <div className="md:col-span-2">
                <InputLabel label="Cidade" required />
                <SelectField options={[{label: 'São Paulo', value: 'sp'}]} />
              </div>
              <div className="md:col-span-4">
                <InputLabel label="Profissão / Ocupação" required />
                <InputField icon={Briefcase} placeholder="Ex: Engenheiro de Software" />
              </div>
            </div>
          </div>
        </Card>

        {/* 2. Seção: Documentação */}
        <Card title="Documentação" description="Envie seus documentos para validação de identidade (KYC).">
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4 mb-6 flex gap-3">
            <FileText className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-100 font-medium">Documentos Aceitos</p>
              <p className="text-xs text-blue-300 mt-1 leading-relaxed">
                Aceitamos RG, CNH, Passaporte ou RNE/RNM (para estrangeiros). O documento deve estar válido e em bom estado de conservação.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <InputLabel label="Tipo de Documento" required />
              <SelectField options={[
                {label: 'RG (Carteira de Identidade)', value: 'rg'},
                {label: 'CNH (Carteira de Motorista)', value: 'cnh'},
                {label: 'Passaporte', value: 'passaporte'}
              ]} />
            </div>
            <div>
              <InputLabel label="Número do Documento" required />
              <InputField placeholder="00.000.000-0" />
            </div>
            <div>
              <InputLabel label="Data de Emissão" required />
              <InputField type="date" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <InputLabel label="Frente do Documento" required />
              <FileUpload label="Frente" acceptedTypes=".jpg,.png,.pdf" />
            </div>
            <div>
              <InputLabel label="Verso do Documento" required />
              <FileUpload label="Verso" acceptedTypes=".jpg,.png,.pdf" />
            </div>
          </div>
        </Card>

        {/* 3. Seção: Selfie (Prova de Vida) */}
        <Card 
          title={<span className="flex items-center gap-2"><Camera className="w-5 h-5 text-[#d500f9]" /> Selfie com Documento</span>} 
          description="Para garantir que é você mesmo, tire uma foto segurando seu documento ao lado do rosto."
          className="relative overflow-hidden"
        >
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center text-xs font-bold text-stone-400">1</div>
                <p className="text-sm text-stone-400">Esteja em um ambiente bem iluminado.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center text-xs font-bold text-stone-400">2</div>
                <p className="text-sm text-stone-400">Segure o documento próximo ao rosto, sem cobrir informações.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center text-xs font-bold text-stone-400">3</div>
                <p className="text-sm text-stone-400">Mantenha expressão neutra e remova acessórios.</p>
              </div>
            </div>

            <div className="flex-1 w-full flex flex-col items-center gap-4 p-6 bg-stone-950 rounded-xl border border-stone-800 border-dashed">
              {selfie ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden group border border-stone-800">
                  <img src={selfie} alt="Selfie" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <Button variant="secondary" onClick={() => setSelfie(null)}>Remover</Button>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1 shadow-lg">
                    <CheckCircle className="w-3 h-3" /> Capturada
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 bg-stone-900 rounded-full flex items-center justify-center border border-stone-800">
                    <User className="w-10 h-10 text-stone-600" />
                  </div>
                  <div className="flex gap-3 w-full">
                    <Button variant="outline" className="flex-1" onClick={() => document.getElementById('selfie-upload').click()}>
                      <Upload className="w-4 h-4" /> Upload
                    </Button>
                    <input id="selfie-upload" type="file" className="hidden" accept="image/*" />
                    
                    <Button className="flex-1" onClick={() => setIsCameraOpen(true)}>
                      <Camera className="w-4 h-4" /> Tirar Selfie
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* 4. Seção: Comprovante de Residência */}
        <Card title="Comprovante de Residência" description="Documento recente (últimos 3 meses) em seu nome.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <p className="text-sm text-stone-400 leading-relaxed">
                Aceitamos contas de consumo (água, luz, gás, internet), fatura de cartão de crédito ou contrato de aluguel.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Conta de Luz', 'Conta de Água', 'Internet/Telefone', 'Fatura Cartão'].map(doc => (
                  <span key={doc} className="px-2 py-1 bg-stone-950 border border-stone-800 rounded text-xs text-stone-500">
                    {doc}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <FileUpload label="Comprovante" acceptedTypes=".pdf,.jpg,.png" />
            </div>
          </div>
        </Card>

        {/* Sticky Footer Actions */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-stone-950/80 backdrop-blur-xl border-t border-stone-800 z-40">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <p className="text-sm text-stone-500 hidden md:block">
              <span className="text-blue-400 font-medium">Rascunho salvo</span> às 14:30
            </p>
            <div className="flex gap-4 w-full md:w-auto">
              <Button variant="ghost" className="flex-1 md:flex-none">Cancelar</Button>
              <Button className="flex-1 md:flex-none gap-2 px-8">
                <Save className="w-4 h-4" />
                Salvar e Enviar
              </Button>
            </div>
          </div>
        </div>

        {/* Modais */}
        <WebcamModal 
          isOpen={isCameraOpen} 
          onClose={() => setIsCameraOpen(false)} 
          onCapture={(img) => setSelfie(img)} 
        />

      </div>
    </div>
  );
}
