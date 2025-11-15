'use client';

import { useState, useEffect } from 'react';
import { PerfilData } from '@/app/(protected)/perfil/page';
import { ListDoc } from '@/data/type_doc';
import Image from 'next/image';

// Componente de Divisor Elegante
const ElegantDivider = () => (
  <div 
    className="h-px my-12"
    style={{
      background: 'linear-gradient(90deg, transparent 0%, oklch(0.180 0.004 49.25) 20%, oklch(0.180 0.004 49.25) 80%, transparent 100%)'
    }}
  />
);

// Componente de Seção com Acento Magenta
const SectionHeader = ({ icon, title }: { icon: string; title: string }) => (
  <div 
    className="rounded-lg p-4 mb-8 border-l-4"
    style={{
      background: 'linear-gradient(90deg, rgba(213, 0, 249, 0.12), transparent)',
      borderLeftColor: '#d500f9'
    }}
  >
    <h2 className="text-xl font-semibold flex items-center gap-3" style={{ color: '#d500f9' }}>
      <span className="text-2xl">{icon}</span>
      {title}
    </h2>
  </div>
);

// Componente de Box Informativo
const InfoBox = ({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) => (
  <div 
    className="rounded-lg p-6 mb-8 border-l-4"
    style={{
      background: 'rgba(255, 152, 0, 0.08)',
      borderColor: '#ff9800',
      borderLeftWidth: '3px'
    }}
  >
    <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#ff9800' }}>
      <span>{icon}</span> {title}
    </h3>
    {children}
  </div>
);

interface PerfilFormProps {
  initialPerfil: PerfilData | undefined;
}

interface Pais {
  capital: string;
  currency: string;
  currency_name: string;
  currency_symbol: string;
  emoji: string;
  emojiU: string;
  id: number;
  iso2: string;
  iso3: string;
  latitude: string;
  longitude: string;
  name: string;
  nationality: string;
  native: string;
  numeric_code: string;
  phonecode: string;
  region: string;
  region_id: string;
  subregion: string;
  subregion_id: string;
  timezones: string;
  tld: string;
}

interface Estado {
  country_code: string;
  country_id: number;
  country_name: string;
  fips_code: string;
  id: number;
  iso2: string;
  iso3166_2: string;
  latitude: string;
  level: string;
  longitude: string;
  name: string;
  parent_id: string;
  timezone: string;
  type: string;
}

interface Cidade {
  country_code: string;
  country_id: number;
  country_name: string;
  id: number;
  latitude: string;
  longitude: string;
  name: string;
  state_code: string;
  state_id: number;
  state_name: string;
  timezone: string;
  wikiDataId: string;
}

export default function PerfilForm({ initialPerfil }: PerfilFormProps) {
  // console.log("🚀 ~ PerfilForm ~ initialPerfil:", initialPerfil)
const [FormPerfil, setFormPerfil] = useState<PerfilData | null>(initialPerfil || null);

  // Estados para localização
  const [countries, setCountries] = useState<Array<Pais>>([]);
  const [states, setStates] = useState<Array<Estado>>([]);
  const [cities, setCities] = useState<Array<Cidade>>([]);
  console.log("🚀 ~ PerfilForm ~ cities:", cities)
  const [selectedCountry, setSelectedCountry] = useState(initialPerfil?.pais || '');
  const [selectedState, setSelectedState] = useState(initialPerfil?.uf || '');
  const [selectedCity, setSelectedCity] = useState(initialPerfil?.cidade || '');
  const [loadingLocation, setLoadingLocation] = useState(false);

  const SetFormItem = (key: string, value: string) => {
    setFormPerfil({ ...FormPerfil, [key]: value });
  };

  /**
   * Função para processar arquivo de documento
   * - Converte Blob para URL temporária
   * - Atualiza estados para exibir imagem
   */
  const handleDocumentFile = (file: File) => {
    SetFormItem('documento', file.name);
    
    // Criar URL temporária para exibição
    const url = URL.createObjectURL(file);
    SetFormItem('documento_url', url);
  };

  /**
   * Função para processar arquivo de prova de vida (bio facial)
   * - Converte Blob para URL temporária
   * - Atualiza estados para exibir imagem
   */
  const handleBioFacialFile = (file: File) => {
    SetFormItem('bio_facial', file.name);
    
    // Criar URL temporária para exibição
    const url = URL.createObjectURL(file);
    SetFormItem('bio_facial_url', url);
  };

  /**
   * Função para processar arquivo de comprovante de residência
   * - Converte Blob para URL temporária
   * - Atualiza estados para exibir imagem
   */
  const handleComprovanteFile = (file: File) => {
    SetFormItem('comprovante_residencia', file.name);
    
    // Criar URL temporária para exibição
    const url = URL.createObjectURL(file);
    SetFormItem('comprovante_residencia_url', url);
  };

  // Carregar países
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await fetch('/api/location/countries');
        const data = await response.json();
        if (!data.error) {
          setCountries(data.data);
        }
      } catch (error) {
        console.error('Erro ao carregar países:', error);
      }
    };
    loadCountries();
  }, []);

  // Carregar estados quando país for selecionado
  useEffect(() => {
    if (selectedCountry) {
      const loadStates = async () => {
        try {
          setLoadingLocation(true);
          const response = await fetch(`/api/location/states?country=${encodeURIComponent(selectedCountry)}`);
          const data = await response.json();
          if (!data.error) {
            setStates(data.data);
            setCities([]); // Limpar cidades quando mudar país
            setSelectedState('');
            setSelectedCity('');
          }
        } catch (error) {
          console.error('Erro ao carregar estados:', error);
        } finally {
          setLoadingLocation(false);
        }
      };
      loadStates();
    } else {
      setStates([]);
      setCities([]);
      setSelectedState('');
      setSelectedCity('');
    }
  }, [selectedCountry]);

  // Carregar cidades quando estado for selecionado
  useEffect(() => {
    if (selectedState) {
      const loadCities = async () => {
        try {
          setLoadingLocation(true);
          const response = await fetch(
            `/api/location/cities?country=${encodeURIComponent(selectedCountry)}&state=${encodeURIComponent(selectedState)}`,
          );
          const data = await response.json();
          if (!data.error) {
            setCities(data.data);
            setSelectedCity('');
          }
        } catch (error) {
          console.error('Erro ao carregar cidades:', error);
        } finally {
          setLoadingLocation(false);
        }
      };
      loadCities();
    } else {
      setCities([]);
      setSelectedCity('');
    }
  }, [selectedCountry, selectedState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Implementar lógica de salvamento
    console.log('Salvando dados do perfil...');
  };

  /**
   * Função para capturar imagem da webcam
   * - Abre o modal de webcam
   * - Processa a imagem capturada em base64
   * - Atualiza o formulário com a imagem
   */
  const handleWebcamCapture = () => {
    // Criar modal de webcam customizado
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: oklch(0.090 0.004 49.25);
      border-radius: 16px;
      padding: 24px;
      max-width: 600px;
      width: 90%;
      border: 1px solid oklch(0.180 0.004 49.25);
    `;
    
    modalContent.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="color: oklch(0.850 0.004 49.25); font-size: 18px; font-weight: 600;">📸 Capturar Documento</h3>
        <button id="closeModal" style="background: none; border: none; color: oklch(0.650 0.004 49.25); font-size: 24px; cursor: pointer;">×</button>
      </div>
      <video id="webcam" style="width: 100%; border-radius: 8px; background: black;" autoplay></video>
      <canvas id="canvas" style="display: none;"></canvas>
      <div style="display: flex; gap: 12px; margin-top: 20px; justify-content: center;">
        <button id="captureBtn" style="background: #d500f9; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">📸 Tirar Foto</button>
        <button id="cancelBtn" style="background: oklch(0.140 0.004 49.25); color: oklch(0.850 0.004 49.25); border: 1px solid oklch(0.180 0.004 49.25); padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">Cancelar</button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    const video = modalContent.querySelector('#webcam') as HTMLVideoElement;
    const canvas = modalContent.querySelector('#canvas') as HTMLCanvasElement;
    const closeBtn = modalContent.querySelector('#closeModal') as HTMLButtonElement;
    const captureBtn = modalContent.querySelector('#captureBtn') as HTMLButtonElement;
    const cancelBtn = modalContent.querySelector('#cancelBtn') as HTMLButtonElement;
    
    let stream: MediaStream | null = null;
    
    // Iniciar webcam
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((mediaStream) => {
        stream = mediaStream;
        video.srcObject = stream;
      })
      .catch(() => {
        alert('Não foi possível acessar a câmera. Verifique as permissões.');
        document.body.removeChild(modal);
      });
    
    // Capturar foto
    const capturePhoto = () => {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Converter canvas para Blob
        canvas.toBlob((blob) => {
          if (blob) {
            // Criar arquivo a partir do Blob
            const file = new File([blob], `webcam_capture_${Date.now()}.png`, { type: 'image/png' });
            handleDocumentFile(file);
          }
        }, 'image/png');
        
        // Limpar stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        // Fechar modal
        document.body.removeChild(modal);
      }
    };
    
    // Event listeners
    closeBtn.onclick = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      document.body.removeChild(modal);
    };
    
    captureBtn.onclick = capturePhoto;
    cancelBtn.onclick = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      document.body.removeChild(modal);
    };
    
    // Fechar modal ao clicar fora
    modal.onclick = (e) => {
      if (e.target === modal) {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        document.body.removeChild(modal);
      }
    };
  };

  /**
   * Função para capturar imagem da webcam (prova de vida)
   * - Abre o modal de webcam
   * - Processa a imagem capturada em base64
   * - Atualiza o formulário com a imagem
   */
  const handleBioFacialWebcamCapture = () => {
    // Criar modal de webcam customizado
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: oklch(0.090 0.004 49.25);
      border-radius: 16px;
      padding: 24px;
      max-width: 600px;
      width: 90%;
      border: 1px solid oklch(0.180 0.004 49.25);
    `;
    
    modalContent.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="color: oklch(0.850 0.004 49.25); font-size: 18px; font-weight: 600;">📸 Prova de Vida - Selfie</h3>
        <button id="closeModal" style="background: none; border: none; color: oklch(0.650 0.004 49.25); font-size: 24px; cursor: pointer;">×</button>
      </div>
      <video id="webcam" style="width: 100%; border-radius: 8px; background: black;" autoplay></video>
      <canvas id="canvas" style="display: none;"></canvas>
      <div style="display: flex; gap: 12px; margin-top: 20px; justify-content: center;">
        <button id="captureBtn" style="background: #d500f9; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">📸 Tirar Selfie</button>
        <button id="cancelBtn" style="background: oklch(0.140 0.004 49.25); color: oklch(0.850 0.004 49.25); border: 1px solid oklch(0.180 0.004 49.25); padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">Cancelar</button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    const video = modalContent.querySelector('#webcam') as HTMLVideoElement;
    const canvas = modalContent.querySelector('#canvas') as HTMLCanvasElement;
    const closeBtn = modalContent.querySelector('#closeModal') as HTMLButtonElement;
    const captureBtn = modalContent.querySelector('#captureBtn') as HTMLButtonElement;
    const cancelBtn = modalContent.querySelector('#cancelBtn') as HTMLButtonElement;
    
    let stream: MediaStream | null = null;
    
    // Iniciar webcam
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((mediaStream) => {
        stream = mediaStream;
        video.srcObject = stream;
      })
      .catch(() => {
        alert('Não foi possível acessar a câmera. Verifique as permissões.');
        document.body.removeChild(modal);
      });
    
    // Capturar foto
    const capturePhoto = () => {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Converter canvas para Blob
        canvas.toBlob((blob) => {
          if (blob) {
            // Criar arquivo a partir do Blob
            const file = new File([blob], `bio_facial_${Date.now()}.png`, { type: 'image/png' });
            handleBioFacialFile(file);
          }
        }, 'image/png');
        
        // Limpar stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        // Fechar modal
        document.body.removeChild(modal);
      }
    };
    
    // Event listeners
    closeBtn.onclick = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      document.body.removeChild(modal);
    };
    
    captureBtn.onclick = capturePhoto;
    cancelBtn.onclick = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      document.body.removeChild(modal);
    };
    
    // Fechar modal ao clicar fora
    modal.onclick = (e) => {
      if (e.target === modal) {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        document.body.removeChild(modal);
      }
    };
  };

  return (
    <div
      className="mx-auto w-full max-w-6xl rounded-2xl p-10"
      style={{
        background: 'oklch(0.090 0.004 49.25)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
      }}
    >
      {/* Título Principal */}
      <div className="mb-10">
        <h1
          className="mb-4 text-5xl leading-tight font-light"
          style={{
            color: 'oklch(0.980 0.004 49.25)',
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          COMPLETE SEU CADASTRO
        </h1>
        <p
          className="max-w-3xl text-base leading-relaxed font-medium"
          style={{ color: 'oklch(0.650 0.004 49.25)' }}
        >
          Para investir em tokens e operar na plataforma, é necessário completar
          sua identificação conforme regulamentação da CVM (Comissão de Valores
          Mobiliários).
        </p>
      </div>

      <ElegantDivider />

      {/* Card de Progresso */}
      <div
        className="mb-10 rounded-2xl p-8"
        style={{
          background:
            'linear-gradient(135deg, rgba(213, 0, 249, 0.08), rgba(213, 0, 249, 0.02))',
          border: '1px solid oklch(0.180 0.004 49.25)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <h2 className="text-lg font-semibold" style={{ color: '#d500f9' }}>
            Progresso do Cadastro
          </h2>
        </div>

        <div
          className="mb-3 text-2xl font-semibold"
          style={{ color: 'oklch(0.980 0.004 49.25)' }}
        >
          40% Concluído
        </div>

        {/* Barra de Progresso */}
        <div
          className="mb-6 h-2 w-full overflow-hidden rounded-full"
          style={{ background: 'oklch(0.160 0.004 49.25)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: '40%',
              background: 'linear-gradient(90deg, #d500f9, #e91e63)',
              boxShadow: '0 0 20px rgba(213, 0, 249, 0.4)',
            }}
          />
        </div>

        {/* Status Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span
              className="flex items-center gap-2"
              style={{ color: 'oklch(0.850 0.004 49.25)' }}
            >
              <span>✅</span> Dados pessoais
            </span>
            <span style={{ color: 'oklch(0.650 0.006 150)' }}>Completo</span>
          </div>
          <div className="flex items-center justify-between">
            <span
              className="flex items-center gap-2"
              style={{ color: 'oklch(0.850 0.004 49.25)' }}
            >
              <span>⚠️</span> Documentação
            </span>
            <span style={{ color: '#ff9800' }}>Pendente</span>
          </div>
          <div className="flex items-center justify-between">
            <span
              className="flex items-center gap-2"
              style={{ color: 'oklch(0.850 0.004 49.25)' }}
            >
              <span>⬜</span> Endereço
            </span>
            <span style={{ color: 'oklch(0.450 0.004 49.25)' }}>
              Não iniciado
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span
              className="flex items-center gap-2"
              style={{ color: 'oklch(0.850 0.004 49.25)' }}
            >
              <span>⬜</span> Informações financeiras
            </span>
            <span style={{ color: 'oklch(0.450 0.004 49.25)' }}>
              Não iniciado
            </span>
          </div>
        </div>
      </div>

      <ElegantDivider />

      {/* SEÇÃO 1: DADOS PESSOAIS */}
      <SectionHeader icon="🔹" title="SEÇÃO 1: DADOS PESSOAIS" />

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Nome Completo */}
        <div>
          <label
            className="mb-2 block text-sm font-semibold"
            style={{ color: 'oklch(0.850 0.004 49.25)' }}
          >
            Nome completo
            <span style={{ color: '#e91e63', marginLeft: '4px' }}>
              *Obrigatório
            </span>
          </label>
          <input
            type="text"
            placeholder="Digite seu nome completo"
            value={FormPerfil?.nome}
            className="h-12 w-full rounded-lg px-4 text-sm font-medium transition-all duration-300"
            style={{
              background: 'oklch(0.140 0.004 49.25)',
              border: '1px solid oklch(0.180 0.004 49.25)',
              color: 'oklch(0.980 0.004 49.25)',
            }}
            onChange={(e) => {
              SetFormItem('nome', e.target.value);
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#d500f9';
              e.target.style.boxShadow = '0 0 0 3px rgba(213, 0, 249, 0.1)';
              e.target.style.background = 'oklch(0.160 0.004 49.25)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'oklch(0.180 0.004 49.25)';
              e.target.style.boxShadow = 'none';
              e.target.style.background = 'oklch(0.140 0.004 49.25)';
            }}
          />
        </div>

        {/* Email */}
        <div>
          <label
            className="mb-2 block text-sm font-semibold"
            style={{ color: 'oklch(0.850 0.004 49.25)' }}
          >
            E-mail
          </label>
          <input
            type="email"
            placeholder="seu@email.com"
            value={FormPerfil?.email}
            onChange={(e) => {
              SetFormItem('email', e.target.value);
            }}
            className="h-12 w-full rounded-lg px-4 text-sm font-medium"
            style={{
              background: 'oklch(0.140 0.004 49.25)',
              border: '1px solid oklch(0.180 0.004 49.25)',
              color: 'oklch(0.980 0.004 49.25)',
            }}
            readOnly
          />
          <span
            className="mt-2 flex items-center gap-1 text-sm font-medium"
            style={{ color: 'oklch(0.650 0.006 150)' }}
          >
            <span>✓</span> E-mail verificado
          </span>
        </div>

        {/* Telefone/WhatsApp */}
        <div>
          <label
            className="mb-2 block text-sm font-semibold"
            style={{ color: 'oklch(0.850 0.004 49.25)' }}
          >
            Telefone/WhatsApp
          </label>
          <div className="flex gap-3">
            <input
              type="tel"
              placeholder="(00) 00000-0000"
              value={FormPerfil?.telefone}
              onChange={(e) => {
                SetFormItem('telefone', e.target.value);
              }}
              className="h-12 flex-1 rounded-lg px-4 text-sm font-medium transition-all duration-300"
              style={{
                background: 'oklch(0.140 0.004 49.25)',
                border: '1px solid oklch(0.180 0.004 49.25)',
                color: 'oklch(0.980 0.004 49.25)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#d500f9';
                e.target.style.boxShadow = '0 0 0 3px rgba(213, 0, 249, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'oklch(0.180 0.004 49.25)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              type="button"
              className="h-12 rounded-lg px-6 text-sm font-semibold transition-all duration-300"
              style={{
                background: 'transparent',
                border: '1px solid #d500f9',
                color: '#d500f9',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(213, 0, 249, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow =
                  '0 4px 20px rgba(213, 0, 249, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Verificar número
            </button>
          </div>
        </div>

        {/* Grid 3 colunas: Data de Nascimento */}
        <div>
          <label
            className="mb-2 block text-sm font-semibold"
            style={{ color: 'oklch(0.850 0.004 49.25)' }}
          >
            Data de nascimento
          </label>
          <div className="grid grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="DD"
              className="h-12 rounded-lg px-4 text-center text-sm font-medium transition-all duration-300"
              style={{
                background: 'oklch(0.140 0.004 49.25)',
                border: '1px solid oklch(0.180 0.004 49.25)',
                color: 'oklch(0.980 0.004 49.25)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#d500f9';
                e.target.style.boxShadow = '0 0 0 3px rgba(213, 0, 249, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'oklch(0.180 0.004 49.25)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <input
              type="text"
              placeholder="MM"
              className="h-12 rounded-lg px-4 text-center text-sm font-medium transition-all duration-300"
              style={{
                background: 'oklch(0.140 0.004 49.25)',
                border: '1px solid oklch(0.180 0.004 49.25)',
                color: 'oklch(0.980 0.004 49.25)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#d500f9';
                e.target.style.boxShadow = '0 0 0 3px rgba(213, 0, 249, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'oklch(0.180 0.004 49.25)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <input
              type="text"
              placeholder="AAAA"
              className="h-12 rounded-lg px-4 text-center text-sm font-medium transition-all duration-300"
              style={{
                background: 'oklch(0.140 0.004 49.25)',
                border: '1px solid oklch(0.180 0.004 49.25)',
                color: 'oklch(0.980 0.004 49.25)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#d500f9';
                e.target.style.boxShadow = '0 0 0 3px rgba(213, 0, 249, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'oklch(0.180 0.004 49.25)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-4">
            <span
              className="text-center text-xs"
              style={{ color: 'oklch(0.450 0.004 49.25)' }}
            >
              Dia
            </span>
            <span
              className="text-center text-xs"
              style={{ color: 'oklch(0.450 0.004 49.25)' }}
            >
              Mês
            </span>
            <span
              className="text-center text-xs"
              style={{ color: 'oklch(0.450 0.004 49.25)' }}
            >
              Ano
            </span>
          </div>
        </div>

        {/* Grid 2 colunas: Sexo e Estado Civil */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label
              className="mb-2 block text-sm font-semibold"
              style={{ color: 'oklch(0.850 0.004 49.25)' }}
            >
              Sexo
            </label>
            <select
              className="h-12 w-full cursor-pointer appearance-none rounded-lg px-4 pr-12 text-sm font-medium transition-all duration-300"
              style={{
                background: 'oklch(0.140 0.004 49.25)',
                border: '1px solid oklch(0.180 0.004 49.25)',
                color: 'oklch(0.980 0.004 49.25)',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23a0a0a0' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 16px center',
              }}
              value={FormPerfil?.genero}
              onChange={(e) => {
                SetFormItem('genero', e.target.value);
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#d500f9';
                e.target.style.boxShadow = '0 0 0 3px rgba(213, 0, 249, 0.1)';
                e.target.style.backgroundImage = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23d500f9' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'oklch(0.180 0.004 49.25)';
                e.target.style.boxShadow = 'none';
                e.target.style.backgroundImage = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23a0a0a0' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`;
              }}
            >
              <option value="">Selecione</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-semibold"
              style={{ color: 'oklch(0.850 0.004 49.25)' }}
            >
              Estado civil
            </label>
            <select
              className="h-12 w-full cursor-pointer appearance-none rounded-lg px-4 pr-12 text-sm font-medium transition-all duration-300"
              style={{
                background: 'oklch(0.140 0.004 49.25)',
                border: '1px solid oklch(0.180 0.004 49.25)',
                color: 'oklch(0.980 0.004 49.25)',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23a0a0a0' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 16px center',
              }}
              value={FormPerfil?.estadoCivil}
              onChange={(e) => {
                SetFormItem('estadoCivil', e.target.value);
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#d500f9';
                e.target.style.boxShadow = '0 0 0 3px rgba(213, 0, 249, 0.1)';
                e.target.style.backgroundImage = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23d500f9' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'oklch(0.180 0.004 49.25)';
                e.target.style.boxShadow = 'none';
                e.target.style.backgroundImage = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23a0a0a0' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`;
              }}
            >
              <option value="">Selecione</option>
              <option value="solteiro">Solteiro(a)</option>
              <option value="casado">Casado(a)</option>
              <option value="divorciado">Divorciado(a)</option>
              <option value="viuvo">Viúvo(a)</option>
            </select>
          </div>
        </div>

        {/* Endereço Completo */}
        <div className="space-y-6">
          <h3
            className="mb-4 text-lg font-semibold"
            style={{ color: 'oklch(0.980 0.004 49.25)' }}
          >
            📍 Endereço
          </h3>

          {/* Endereço */}
          <div>
            <label
              className="mb-2 block text-sm font-semibold"
              style={{ color: 'oklch(0.850 0.004 49.25)' }}
            >
              Endereço
            </label>
            <input
              type="text"
              placeholder="Rua, Avenida, Praça, etc."
              value={FormPerfil?.endereco}
              onChange={(e) => {
                SetFormItem('endereco', e.target.value);
              }}
              className="h-12 w-full rounded-lg px-4 text-sm font-medium transition-all duration-300"
              style={{
                background: 'oklch(0.140 0.004 49.25)',
                border: '1px solid oklch(0.180 0.004 49.25)',
                color: 'oklch(0.980 0.004 49.25)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#d500f9';
                e.target.style.boxShadow = '0 0 0 3px rgba(213, 0, 249, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'oklch(0.180 0.004 49.25)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Grid 2 colunas: Número e Bairro */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label
                className="mb-2 block text-sm font-semibold"
                style={{ color: 'oklch(0.850 0.004 49.25)' }}
              >
                Número
              </label>
              <input
                type="text"
                placeholder="123"
                value={FormPerfil?.numero}
                onChange={(e) => {
                  SetFormItem('numero', e.target.value);
                }}
                className="h-12 w-full rounded-lg px-4 text-sm font-medium transition-all duration-300"
                style={{
                  background: 'oklch(0.140 0.004 49.25)',
                  border: '1px solid oklch(0.180 0.004 49.25)',
                  color: 'oklch(0.980 0.004 49.25)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#d500f9';
                  e.target.style.boxShadow = '0 0 0 3px rgba(213, 0, 249, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'oklch(0.180 0.004 49.25)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-semibold"
                style={{ color: 'oklch(0.850 0.004 49.25)' }}
              >
                Bairro
              </label>
              <input
                type="text"
                placeholder="Centro"
                value={FormPerfil?.bairro}
                onChange={(e) => {
                  SetFormItem('bairro', e.target.value);
                }}
                className="h-12 w-full rounded-lg px-4 text-sm font-medium transition-all duration-300"
                style={{
                  background: 'oklch(0.140 0.004 49.25)',
                  border: '1px solid oklch(0.180 0.004 49.25)',
                  color: 'oklch(0.980 0.004 49.25)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#d500f9';
                  e.target.style.boxShadow = '0 0 0 3px rgba(213, 0, 249, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'oklch(0.180 0.004 49.25)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* País */}
          <div>
            <label
              className="mb-2 block text-sm font-semibold"
              style={{ color: 'oklch(0.850 0.004 49.25)' }}
            >
              País
            </label>
            <select
              className="h-12 w-full cursor-pointer appearance-none rounded-lg px-4 pr-12 text-sm font-medium transition-all duration-300"
              style={{
                background: 'oklch(0.140 0.004 49.25)',
                border: '1px solid oklch(0.180 0.004 49.25)',
                color: 'oklch(0.980 0.004 49.25)',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23a0a0a0' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 16px center',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#d500f9';
                e.target.style.boxShadow = '0 0 0 3px rgba(213, 0, 249, 0.1)';
                e.target.style.backgroundImage = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23d500f9' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'oklch(0.180 0.004 49.25)';
                e.target.style.boxShadow = 'none';
                e.target.style.backgroundImage = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23a0a0a0' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`;
              }}
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                SetFormItem('pais', e.target.value);
              }}
            >
              <option value="">Selecione um país</option>
              {countries.map((country) => (
                <option key={country.id} value={country.iso3}>
                  {country.emoji} {country.native}
                </option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label
              className="mb-2 block text-sm font-semibold"
              style={{ color: 'oklch(0.850 0.004 49.25)' }}
            >
              Estado
            </label>
            <select
              className="h-12 w-full cursor-pointer appearance-none rounded-lg px-4 pr-12 text-sm font-medium transition-all duration-300"
              style={{
                background: 'oklch(0.140 0.004 49.25)',
                border: '1px solid oklch(0.180 0.004 49.25)',
                color: 'oklch(0.980 0.004 49.25)',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23a0a0a0' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 16px center',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#d500f9';
                e.target.style.boxShadow = '0 0 0 3px rgba(213, 0, 249, 0.1)';
                e.target.style.backgroundImage = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23d500f9' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'oklch(0.180 0.004 49.25)';
                e.target.style.boxShadow = 'none';
                e.target.style.backgroundImage = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23a0a0a0' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`;
              }}
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                SetFormItem('estado', e.target.value);
              }}
              disabled={!selectedCountry || loadingLocation}
            >
              <option value="">
                {loadingLocation ? 'Carregando...' : 'Selecione um estado'}
              </option>
              {states.map((state) => (
                <option key={state.id} value={state.name}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cidade */}
          <div>
            <label
              className="mb-2 block text-sm font-semibold"
              style={{ color: 'oklch(0.850 0.004 49.25)' }}
            >
              Cidade
            </label>
            <select
              className="h-12 w-full cursor-pointer appearance-none rounded-lg px-4 pr-12 text-sm font-medium transition-all duration-300"
              style={{
                background: 'oklch(0.140 0.004 49.25)',
                border: '1px solid oklch(0.180 0.004 49.25)',
                color: 'oklch(0.980 0.004 49.25)',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23a0a0a0' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 16px center',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#d500f9';
                e.target.style.boxShadow = '0 0 0 3px rgba(213, 0, 249, 0.1)';
                e.target.style.backgroundImage = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23d500f9' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'oklch(0.180 0.004 49.25)';
                e.target.style.boxShadow = 'none';
                e.target.style.backgroundImage = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23a0a0a0' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`;
              }}
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              disabled={!selectedState || loadingLocation}
            >
              <option value="">
                {loadingLocation ? 'Carregando...' : 'Selecione uma cidade'}
              </option>
              {cities.map((city) => (
                <option key={city.id} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          {/* Complemento */}
          <div>
            <label
              className="mb-2 block text-sm font-semibold"
              style={{ color: 'oklch(0.850 0.004 49.25)' }}
            >
              Complemento (opcional)
            </label>
            <input
              type="text"
              placeholder="Apto, Bloco, Casa, etc."
              className="h-12 w-full rounded-lg px-4 text-sm font-medium transition-all duration-300"
              value={FormPerfil?.complemento}
              onChange={(e) => SetFormItem('complemento', e.target.value)}
              style={{
                background: 'oklch(0.140 0.004 49.25)',
                border: '1px solid oklch(0.180 0.004 49.25)',
                color: 'oklch(0.980 0.004 49.25)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#d500f9';
                e.target.style.boxShadow = '0 0 0 3px rgba(213, 0, 249, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'oklch(0.180 0.004 49.25)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {/* Profissão */}
        <div>
          <label
            className="mb-2 block text-sm font-semibold"
            style={{ color: 'oklch(0.850 0.004 49.25)' }}
          >
            Profissão/Ocupação
          </label>
          <input
            type="text"
            placeholder="Ex: Engenheiro de Software"
            className="h-12 w-full rounded-lg px-4 text-sm font-medium transition-all duration-300"
            value={FormPerfil?.profissao}
            onChange={(e) => SetFormItem('profissao', e.target.value)}
            style={{
              background: 'oklch(0.140 0.004 49.25)',
              border: '1px solid oklch(0.180 0.004 49.25)',
              color: 'oklch(0.980 0.004 49.25)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#d500f9';
              e.target.style.boxShadow = '0 0 0 3px rgba(213, 0, 249, 0.1)';
              e.target.style.background = 'oklch(0.160 0.004 49.25)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'oklch(0.180 0.004 49.25)';
              e.target.style.boxShadow = 'none';
              e.target.style.background = 'oklch(0.140 0.004 49.25)';
            }}
          />
        </div>

        <ElegantDivider />

        {/* SEÇÃO 2: DOCUMENTAÇÃO */}
        <SectionHeader icon="🔹" title="SEÇÃO 2: DOCUMENTAÇÃO" />

        {/* Box Informativo sobre Documentos */}
        <InfoBox icon="ℹ️" title="IMPORTANTE: Documentos aceitos">
          <div
            style={{
              color: 'oklch(0.850 0.004 49.25)',
              fontSize: '14px',
              lineHeight: '1.8',
            }}
          >
            <div className="mb-4">
              <strong style={{ color: 'oklch(0.980 0.004 49.25)' }}>
                Para BRASILEIROS:
              </strong>
              <ul
                className="mt-2 space-y-1"
                style={{ paddingLeft: '0', listStyle: 'none' }}
              >
                <li
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    paddingLeft: '24px',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: '#d500f9',
                      fontSize: '18px',
                    }}
                  >
                    •
                  </span>
                  RG (Registro Geral) - frente e verso
                </li>
                <li
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    paddingLeft: '24px',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: '#d500f9',
                      fontSize: '18px',
                    }}
                  >
                    •
                  </span>
                  CNH (Carteira de Habilitação) - frente e verso juntos
                </li>
                <li
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    paddingLeft: '24px',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: '#d500f9',
                      fontSize: '18px',
                    }}
                  >
                    •
                  </span>
                  CNH Digital - formato digital aceito
                </li>
                <li
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    paddingLeft: '24px',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: '#d500f9',
                      fontSize: '18px',
                    }}
                  >
                    •
                  </span>
                  Passaporte brasileiro
                </li>
              </ul>
            </div>

            <div>
              <strong style={{ color: 'oklch(0.980 0.004 49.25)' }}>
                Para ESTRANGEIROS:
              </strong>
              <ul
                className="mt-2 space-y-1"
                style={{ paddingLeft: '0', listStyle: 'none' }}
              >
                <li
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    paddingLeft: '24px',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: '#d500f9',
                      fontSize: '18px',
                    }}
                  >
                    •
                  </span>
                  Passaporte - todas as páginas com dados
                </li>
                <li
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    paddingLeft: '24px',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: '#d500f9',
                      fontSize: '18px',
                    }}
                  >
                    •
                  </span>
                  DNI (Documento de Identidade) - países do Mercosul
                </li>
                <li
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    paddingLeft: '24px',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: '#d500f9',
                      fontSize: '18px',
                    }}
                  >
                    •
                  </span>
                  RNE (Registro Nacional de Estrangeiro)
                </li>
              </ul>
            </div>
          </div>
        </InfoBox>

        {/* Tabs de Tipo de Documento */}
        <div>
          <label
            className="mb-3 block text-sm font-semibold"
            style={{ color: 'oklch(0.850 0.004 49.25)' }}
          >
            Tipo de documento
          </label>
          <div className="mb-8 grid grid-cols-4 gap-3">
            {ListDoc.map((doc) => (
              <button
                key={doc.value}
                type="button"
                className={`h-14 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  FormPerfil?.tipo_documento === doc.value ? 'active' : ''
                }`}
                style={{
                  background:
                    FormPerfil?.tipo_documento === doc.value
                      ? 'rgba(213, 0, 249, 0.12)'
                      : 'oklch(0.140 0.004 49.25)',
                  border:
                    FormPerfil?.tipo_documento === doc.value
                      ? '1px solid #d500f9'
                      : '1px solid oklch(0.180 0.004 49.25)',
                  color: FormPerfil?.tipo_documento === doc.value ? '#d500f9' : 'oklch(0.450 0.004 49.25)',
                  boxShadow:
                    FormPerfil?.tipo_documento === doc.value ? '0 4px 20px rgba(213, 0, 249, 0.2)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (FormPerfil?.tipo_documento !== doc.value) {
                    e.currentTarget.style.borderColor = '#d500f9';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow =
                      '0 4px 20px rgba(213, 0, 249, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (FormPerfil?.tipo_documento !== doc.value) {
                    e.currentTarget.style.borderColor =
                      'oklch(0.180 0.004 49.25)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
                onClick={() => SetFormItem('tipo_documento', doc.value)}
              >
                {doc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Campos do Documento */}
        <div className="space-y-6">
          <div>
            <label
              className="mb-2 block text-sm font-semibold"
              style={{ color: 'oklch(0.850 0.004 49.25)' }}
            >
              Número do documento
            </label>
            <input
              type="text"
              placeholder="00.000.000-0"
              value={FormPerfil?.documento}
              onChange={(e) => SetFormItem('documento', e.target.value)}
              className="h-12 w-full rounded-lg px-4 text-sm font-medium transition-all duration-300"
              style={{
                background: 'oklch(0.140 0.004 49.25)',
                border: '1px solid oklch(0.180 0.004 49.25)',
                color: 'oklch(0.980 0.004 49.25)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#d500f9';
                e.target.style.boxShadow = '0 0 0 3px rgba(213, 0, 249, 0.1)';
                e.target.style.background = 'oklch(0.160 0.004 49.25)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'oklch(0.180 0.004 49.25)';
                e.target.style.boxShadow = 'none';
                e.target.style.background = 'oklch(0.140 0.004 49.25)';
              }}
            />
          </div>

          {/* Data de Emissão */}
          <div>
            <label
              className="mb-2 block text-sm font-semibold"
              style={{ color: 'oklch(0.850 0.004 49.25)' }}
            >
              Data de emissão
            </label>
            <input
              type="date"
              placeholder="DD/MM/AAAA"
              value={FormPerfil?.data_emissao}
              onChange={(e) => SetFormItem('data_emissao', e.target.value)}
              className="h-12 w-full rounded-lg px-4 text-sm font-medium transition-all duration-300"
              style={{
                background: 'oklch(0.140 0.004 49.25)',
                border: '1px solid oklch(0.180 0.004 49.25)',
                color: 'oklch(0.980 0.004 49.25)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#d500f9';
                e.target.style.boxShadow = '0 0 0 3px rgba(213, 0, 249, 0.1)';
                e.target.style.background = 'oklch(0.160 0.004 49.25)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'oklch(0.180 0.004 49.25)';
                e.target.style.boxShadow = 'none';
                e.target.style.background = 'oklch(0.140 0.004 49.25)';
              }}
            />
          </div>
        </div>

        <div
          className="mb-8 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, oklch(0.180 0.004 49.25) 20%, oklch(0.180 0.004 49.25) 80%, transparent 100%)',
          }}
        />

        {/* Upload do Documento */}
        <div className="mb-8">
          <h3
            className="mb-4 flex items-center gap-2 text-lg font-semibold"
            style={{ color: 'oklch(0.980 0.004 49.25)' }}
          >
            📸 Upload do Documento
          </h3>

          {/* Requisitos */}
          <InfoBox icon="⚠️" title="REQUISITOS PARA O DOCUMENTO:">
            <ul
              className="space-y-2"
              style={{ color: 'oklch(0.850 0.004 49.25)', fontSize: '14px' }}
            >
              <li className="flex items-start gap-2">
                <span style={{ color: 'oklch(0.650 0.006 150)' }}>✓</span>
                <span>Foto nítida e legível</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'oklch(0.650 0.006 150)' }}>✓</span>
                <span>Sem cortes, borrões ou reflexos</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'oklch(0.650 0.006 150)' }}>✓</span>
                <span>Todas as informações visíveis</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'oklch(0.650 0.006 150)' }}>✓</span>
                <span>CNH/DNI: frente e verso na mesma imagem</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'oklch(0.650 0.006 150)' }}>✓</span>
                <span>Passaporte: todas as páginas com dados</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'oklch(0.650 0.006 150)' }}>✓</span>
                <span>Formatos: JPG, PNG, PDF</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'oklch(0.650 0.006 150)' }}>✓</span>
                <span>Tamanho máximo: 5MB</span>
              </li>
            </ul>
          </InfoBox>

          {/* Área de Upload */}
          {/* Upload de Documento com Webcam */}
          <div className="mb-8">
            <h3
              className="mb-4 flex items-center gap-2 text-lg font-semibold"
              style={{ color: 'oklch(0.850 0.004 49.25)' }}
            >
              📄 Documento de identificação
            </h3>
            
            {FormPerfil?.documento_url ? (
              // Visualização da imagem quando URL existe
              <div className="relative">
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: 'oklch(0.140 0.004 49.25)',
                    border: '1px solid oklch(0.180 0.004 49.25)',
                  }}
                >
                  <Image
                    src={FormPerfil.documento_url}
                    alt="Documento de identificação"
                    width={800}
                    height={600}
                    className="w-full h-auto max-h-96 object-contain"
                    style={{ display: 'block' }}
                    priority={false}
                    unoptimized={true}
                  />
                </div>
                
                <div className="mt-4 flex gap-3 justify-center">
                  <button
                    type="button"
                    className="rounded-lg px-6 py-2 text-sm font-semibold transition-all duration-300"
                    style={{
                      background: 'rgba(213, 0, 249, 0.1)',
                      border: '1px solid #d500f9',
                      color: '#d500f9',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(213, 0, 249, 0.2)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(213, 0, 249, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    onClick={() => {
                      // Abrir imagem em nova aba
                      window.open(FormPerfil.documento_url, '_blank');
                    }}
                  >
                    🔍 Visualizar em tamanho real
                  </button>
                  
                  <button
                    type="button"
                    className="rounded-lg px-6 py-2 text-sm font-semibold transition-all duration-300"
                    style={{
                      background: 'transparent',
                      border: '1px solid oklch(0.180 0.004 49.25)',
                      color: 'oklch(0.850 0.004 49.25)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'oklch(0.180 0.004 49.25)';
                      e.currentTarget.style.borderColor = '#d500f9';
                      e.currentTarget.style.color = '#d500f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'oklch(0.180 0.004 49.25)';
                      e.currentTarget.style.color = 'oklch(0.850 0.004 49.25)';
                    }}
                    onClick={() => {
                      // Limpar apenas a URL do documento
                      SetFormItem('documento_url', '');
                    }}
                  >
                    🗑️ Remover documento
                  </button>
                </div>
              </div>
            ) : (
              // Área de upload quando não há URL
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl p-10 transition-all duration-300"
                style={{
                  background: 'oklch(0.140 0.004 49.25)',
                  border: '2px dashed oklch(0.180 0.004 49.25)',
                  minHeight: '200px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#d500f9';
                  e.currentTarget.style.background = 'rgba(213, 0, 249, 0.05)';
                  e.currentTarget.style.transform = 'scale(1.01)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'oklch(0.180 0.004 49.25)';
                  e.currentTarget.style.background = 'oklch(0.140 0.004 49.25)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <span className="mb-4 text-5xl" style={{ color: '#d500f9' }}>
                  📤
                </span>
                <p
                  className="mb-4 text-center text-base"
                  style={{ color: 'oklch(0.850 0.004 49.25)' }}
                >
                  Arraste o documento aqui
                  <br />
                  ou clique para selecionar
                </p>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="rounded-lg px-8 py-3 text-sm font-semibold transition-all duration-300"
                    style={{
                      background: 'transparent',
                      border: '1px solid #d500f9',
                      color: '#d500f9',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(213, 0, 249, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow =
                        '0 4px 20px rgba(213, 0, 249, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => {
                      // Abrir seletor de arquivos
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*,.pdf';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          handleDocumentFile(file);
                        }
                      };
                      input.click();
                    }}
                  >
                    📁 Escolher arquivo
                  </button>
                  
                  {/* <button
                    type="button"
                    className="rounded-lg px-8 py-3 text-sm font-semibold transition-all duration-300"
                    style={{
                      background: 'rgba(213, 0, 249, 0.1)',
                      border: '1px solid #d500f9',
                      color: '#d500f9',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(213, 0, 249, 0.2)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow =
                        '0 4px 20px rgba(213, 0, 249, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(213, 0, 249, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => {
                      // Abrir modal de webcam
                      handleWebcamCapture();
                    }}
                  >
                    📸 Tirar foto
                  </button> */}
                </div>
              </div>
            )}
            
            {FormPerfil?.documento && !FormPerfil?.documento_url && (
              <div 
                className="mt-4 rounded-lg p-4"
                style={{
                  background: 'rgba(213, 0, 249, 0.05)',
                  border: '1px solid rgba(213, 0, 249, 0.2)',
                }}
              >
                <p className="text-sm" style={{ color: 'oklch(0.850 0.004 49.25)' }}>
                  <span style={{ color: '#d500f9' }}>✓</span> Documento selecionado: {FormPerfil.documento}
                </p>
              </div>
            )}
          </div>
        </div>

        <ElegantDivider />

        {/* Selfie com Documento */}
        <div className="mb-8">
          <h3
            className="mb-4 flex items-center gap-2 text-lg font-semibold"
            style={{ color: 'oklch(0.980 0.004 49.25)' }}
          >
            📸 Selfie com Documento (Prova de Vida)
          </h3>

          <p
            className="mb-6 text-base"
            style={{ color: 'oklch(0.850 0.004 49.25)' }}
          >
            Para validar sua identidade, tire uma selfie segurando seu documento
            aberto ao lado do rosto.
          </p>

          {/* Dicas */}
          <InfoBox icon="💡" title="Dicas para uma boa selfie:">
            <ul
              className="space-y-2"
              style={{ color: 'oklch(0.850 0.004 49.25)', fontSize: '14px' }}
            >
              <li className="flex items-start gap-2">
                <span style={{ color: '#d500f9' }}>•</span>
                <span>Ambiente bem iluminado</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: '#d500f9' }}>•</span>
                <span>Rosto e documento visíveis</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: '#d500f9' }}>•</span>
                <span>Sem óculos escuros ou acessórios que cubram o rosto</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: '#d500f9' }}>•</span>
                <span>Segure o documento próximo ao rosto</span>
              </li>
            </ul>
          </InfoBox>

          {/* Área de Selfie */}
          {FormPerfil?.bio_facial_url ? (
            // Visualização da imagem quando URL existe
            <div className="relative">
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'oklch(0.140 0.004 49.25)',
                  border: '1px solid oklch(0.180 0.004 49.25)',
                }}
              >
                <Image
                  src={FormPerfil.bio_facial_url}
                  alt="Prova de vida - Selfie com documento"
                  width={800}
                  height={600}
                  className="w-full h-auto max-h-96 object-contain"
                  style={{ display: 'block' }}
                  priority={false}
                  unoptimized={true}
                />
              </div>
              
              <div className="mt-4 flex gap-3 justify-center">
                <button
                  type="button"
                  className="rounded-lg px-6 py-2 text-sm font-semibold transition-all duration-300"
                  style={{
                    background: 'rgba(213, 0, 249, 0.1)',
                    border: '1px solid #d500f9',
                    color: '#d500f9',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(213, 0, 249, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(213, 0, 249, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onClick={() => {
                    // Abrir imagem em nova aba
                    window.open(FormPerfil.bio_facial_url, '_blank');
                  }}
                >
                  🔍 Visualizar em tamanho real
                </button>
                
                <button
                  type="button"
                  className="rounded-lg px-6 py-2 text-sm font-semibold transition-all duration-300"
                  style={{
                    background: 'transparent',
                    border: '1px solid oklch(0.180 0.004 49.25)',
                    color: 'oklch(0.850 0.004 49.25)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'oklch(0.180 0.004 49.25)';
                    e.currentTarget.style.borderColor = '#d500f9';
                    e.currentTarget.style.color = '#d500f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'oklch(0.180 0.004 49.25)';
                    e.currentTarget.style.color = 'oklch(0.850 0.004 49.25)';
                  }}
                  onClick={() => {
                    // Limpar apenas a URL da prova de vida
                    SetFormItem('bio_facial_url', '');
                  }}
                >
                  🗑️ Remover selfie
                </button>
              </div>
            </div>
          ) : (
            // Área de upload quando não há URL
            <div
              className="flex flex-col items-center justify-center rounded-xl p-10 transition-all duration-300"
              style={{
                background: 'oklch(0.140 0.004 49.25)',
                border: '2px dashed oklch(0.180 0.004 49.25)',
                minHeight: '200px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#d500f9';
                e.currentTarget.style.background = 'rgba(213, 0, 249, 0.05)';
                e.currentTarget.style.transform = 'scale(1.01)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'oklch(0.180 0.004 49.25)';
                e.currentTarget.style.background = 'oklch(0.140 0.004 49.25)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <span className="mb-4 text-5xl" style={{ color: '#d500f9' }}>
                🤳
              </span>
              <p
                className="mb-4 text-center text-base"
                style={{ color: 'oklch(0.850 0.004 49.25)' }}
              >
                Tire ou envie sua selfie
                <br />
                com o documento
              </p>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  className="rounded-lg px-8 py-3 text-sm font-semibold transition-all duration-300"
                  style={{
                    background: 'transparent',
                    border: '1px solid #d500f9',
                    color: '#d500f9',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(213, 0, 249, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow =
                      '0 4px 20px rgba(213, 0, 249, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onClick={() => {
                    // Abrir seletor de arquivos
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        handleBioFacialFile(file);
                      }
                    };
                    input.click();
                  }}
                >
                  📁 Enviar foto
                </button>
                
                <button
                  type="button"
                  className="rounded-lg px-8 py-3 text-sm font-semibold transition-all duration-300"
                  style={{
                    background: 'rgba(213, 0, 249, 0.1)',
                    border: '1px solid #d500f9',
                    color: '#d500f9',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(213, 0, 249, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow =
                      '0 4px 20px rgba(213, 0, 249, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(213, 0, 249, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onClick={() => {
                    // Abrir modal de webcam
                    handleBioFacialWebcamCapture();
                  }}
                >
                  📸 Tirar selfie
                </button>
              </div>
            </div>
          )}
          
          {FormPerfil?.bio_facial && !FormPerfil?.bio_facial_url && (
            <div 
              className="mt-4 rounded-lg p-4"
              style={{
                background: 'rgba(213, 0, 249, 0.05)',
                border: '1px solid rgba(213, 0, 249, 0.2)',
              }}
            >
              <p className="text-sm" style={{ color: 'oklch(0.850 0.004 49.25)' }}>
                <span style={{ color: '#d500f9' }}>✓</span> Selfie selecionada: {FormPerfil.bio_facial}
              </p>
            </div>
          )}
        </div>

        <ElegantDivider />

        {/* Comprovante de Residência */}
        <div className="mb-12">
          <h3
            className="mb-4 flex items-center gap-2 text-lg font-semibold"
            style={{ color: 'oklch(0.980 0.004 49.25)' }}
          >
            📄 Comprovante de Residência (últimos 3 meses)
          </h3>

          <p
            className="mb-6 text-base"
            style={{ color: 'oklch(0.850 0.004 49.25)' }}
          >
            Documentos aceitos:
          </p>

          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <h4
                className="mb-3 font-semibold"
                style={{ color: 'oklch(0.980 0.004 49.25)' }}
              >
                BRASILEIROS:
              </h4>
              <ul
                className="space-y-2"
                style={{ paddingLeft: '0', listStyle: 'none' }}
              >
                <li
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    paddingLeft: '24px',
                    position: 'relative',
                    fontSize: '14px',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: '#d500f9',
                      fontSize: '18px',
                    }}
                  >
                    •
                  </span>
                  Conta de água, luz, gás ou telefone
                </li>
                <li
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    paddingLeft: '24px',
                    position: 'relative',
                    fontSize: '14px',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: '#d500f9',
                      fontSize: '18px',
                    }}
                  >
                    •
                  </span>
                  Extrato bancário com endereço
                </li>
                <li
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    paddingLeft: '24px',
                    position: 'relative',
                    fontSize: '14px',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: '#d500f9',
                      fontSize: '18px',
                    }}
                  >
                    •
                  </span>
                  Contrato de aluguel registrado
                </li>
                <li
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    paddingLeft: '24px',
                    position: 'relative',
                    fontSize: '14px',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: '#d500f9',
                      fontSize: '18px',
                    }}
                  >
                    •
                  </span>
                  Escritura de imóvel
                </li>
                <li
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    paddingLeft: '24px',
                    position: 'relative',
                    fontSize: '14px',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: '#d500f9',
                      fontSize: '18px',
                    }}
                  >
                    •
                  </span>
                  Declaração de residência de órgão oficial
                </li>
              </ul>
            </div>

            <div>
              <h4
                className="mb-3 font-semibold"
                style={{ color: 'oklch(0.980 0.004 49.25)' }}
              >
                ESTRANGEIROS:
              </h4>
              <ul
                className="space-y-2"
                style={{ paddingLeft: '0', listStyle: 'none' }}
              >
                <li
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    paddingLeft: '24px',
                    position: 'relative',
                    fontSize: '14px',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: '#d500f9',
                      fontSize: '18px',
                    }}
                  >
                    •
                  </span>
                  Atestado de residência do consulado
                </li>
                <li
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    paddingLeft: '24px',
                    position: 'relative',
                    fontSize: '14px',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: '#d500f9',
                      fontSize: '18px',
                    }}
                  >
                    •
                  </span>
                  Contas de serviços públicos (utility bills)
                </li>
                <li
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    paddingLeft: '24px',
                    position: 'relative',
                    fontSize: '14px',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: '#d500f9',
                      fontSize: '18px',
                    }}
                  >
                    •
                  </span>
                  Extrato bancário internacional
                </li>
                <li
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    paddingLeft: '24px',
                    position: 'relative',
                    fontSize: '14px',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: '#d500f9',
                      fontSize: '18px',
                    }}
                  >
                    •
                  </span>
                  Contrato de aluguel do país de residência
                </li>
              </ul>
            </div>
          </div>

          {/* Área de Upload do Comprovante */}
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl p-10 transition-all duration-300"
            style={{
              background: 'oklch(0.140 0.004 49.25)',
              border: '2px dashed oklch(0.180 0.004 49.25)',
              minHeight: '200px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#d500f9';
              e.currentTarget.style.background = 'rgba(213, 0, 249, 0.05)';
              e.currentTarget.style.transform = 'scale(1.01)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'oklch(0.180 0.004 49.25)';
              e.currentTarget.style.background = 'oklch(0.140 0.004 49.25)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onClick={() => {
              // Abrir seletor de arquivos
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*,.pdf';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  handleComprovanteFile(file);
                }
              };
              input.click();
            }}
          >
            <span className="mb-4 text-5xl" style={{ color: '#d500f9' }}>
              📄
            </span>
            <p
              className="mb-4 text-center text-base"
              style={{ color: 'oklch(0.850 0.004 49.25)' }}
            >
              Arraste o comprovante aqui
              <br />
              ou clique para selecionar
            </p>
            <button
              type="button"
              className="rounded-lg px-8 py-3 text-sm font-semibold transition-all duration-300"
              style={{
                background: 'transparent',
                border: '1px solid #d500f9',
                color: '#d500f9',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(213, 0, 249, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow =
                  '0 4px 20px rgba(213, 0, 249, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              📁 Escolher arquivo
            </button>
          </div>
          
          {FormPerfil?.comprovante_residencia && !FormPerfil?.comprovante_residencia_url && (
            <div 
              className="mt-4 rounded-lg p-4"
              style={{
                background: 'rgba(213, 0, 249, 0.05)',
                border: '1px solid rgba(213, 0, 249, 0.2)',
              }}
            >
              <p className="text-sm" style={{ color: 'oklch(0.850 0.004 49.25)' }}>
                <span style={{ color: '#d500f9' }}>✓</span> Comprovante selecionado: {FormPerfil.comprovante_residencia}
              </p>
            </div>
          )}
          
          {FormPerfil?.comprovante_residencia_url ? (
            // Visualização do arquivo quando URL existe
            <div className="relative mt-6">
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'oklch(0.140 0.004 49.25)',
                  border: '1px solid oklch(0.180 0.004 49.25)',
                }}
              >
                {FormPerfil.comprovante_residencia?.toLowerCase().endsWith('.pdf') ? (
                  // Visualização para PDF
                  <div className="p-8 text-center">
                    <span className="text-6xl mb-4 block" style={{ color: '#d500f9' }}>📄</span>
                    <p className="text-lg font-semibold mb-2" style={{ color: 'oklch(0.850 0.004 49.25)' }}>
                      Documento PDF
                    </p>
                    <p className="text-sm" style={{ color: 'oklch(0.650 0.004 49.25)' }}>
                      {FormPerfil.comprovante_residencia}
                    </p>
                  </div>
                ) : (
                  // Visualização para imagens
                  <Image
                    src={FormPerfil.comprovante_residencia_url}
                    alt="Comprovante de residência"
                    width={800}
                    height={600}
                    className="w-full h-auto max-h-96 object-contain"
                    style={{ display: 'block' }}
                    priority={false}
                    unoptimized={true}
                  />
                )}
              </div>
              
              <div className="mt-4 flex gap-3 justify-center">
                <button
                  type="button"
                  className="rounded-lg px-6 py-2 text-sm font-semibold transition-all duration-300"
                  style={{
                    background: 'rgba(213, 0, 249, 0.1)',
                    border: '1px solid #d500f9',
                    color: '#d500f9',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(213, 0, 249, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(213, 0, 249, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onClick={() => {
                    // Abrir arquivo em nova aba
                    window.open(FormPerfil.comprovante_residencia_url, '_blank');
                  }}
                >
                  🔍 Visualizar em tamanho real
                </button>
                
                <button
                  type="button"
                  className="rounded-lg px-6 py-2 text-sm font-semibold transition-all duration-300"
                  style={{
                    background: 'transparent',
                    border: '1px solid oklch(0.180 0.004 49.25)',
                    color: 'oklch(0.850 0.004 49.25)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'oklch(0.180 0.004 49.25)';
                    e.currentTarget.style.borderColor = '#d500f9';
                    e.currentTarget.style.color = '#d500f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'oklch(0.180 0.004 49.25)';
                    e.currentTarget.style.color = 'oklch(0.850 0.004 49.25)';
                  }}
                  onClick={() => {
                    // Limpar apenas a URL do comprovante
                    SetFormItem('comprovante_residencia_url', '');
                  }}
                >
                  🗑️ Remover comprovante
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Botões de Ação */}
        <div className="mt-12 mb-6 flex gap-6">
          <button
            type="submit"
            className="flex h-14 flex-1 items-center justify-center gap-3 rounded-lg text-base font-semibold tracking-wide uppercase transition-all duration-300"
            style={{
              background: '#d500f9',
              color: 'oklch(0.980 0.004 49.25)',
              border: 'none',
              letterSpacing: '0.6px',
              boxShadow: '0 6px 18px rgba(213, 0, 249, 0.35)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(135deg, #d500f9, #e400e5)';
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
              e.currentTarget.style.boxShadow =
                '0 10px 28px rgba(213, 0, 249, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#d500f9';
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow =
                '0 6px 18px rgba(213, 0, 249, 0.35)';
            }}
          >
            SALVAR INFORMAÇÕES
          </button>

          <button
            type="button"
            className="h-14 flex-1 rounded-lg text-base font-medium transition-all duration-300"
            style={{
              background: 'transparent',
              color: 'oklch(0.650 0.004 49.25)',
              border: '1px solid oklch(0.220 0.004 49.25)',
              letterSpacing: '0.4px',
              boxShadow:
                '0 0 0 1px oklch(0.220 0.004 49.25), 0 6px 16px rgba(0, 0, 0, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#d500f9';
              e.currentTarget.style.borderColor = '#d500f9';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow =
                '0 0 0 1px rgba(213, 0, 249, 0.4), 0 10px 24px rgba(213, 0, 249, 0.18)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'oklch(0.650 0.004 49.25)';
              e.currentTarget.style.borderColor = 'oklch(0.220 0.004 49.25)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow =
                '0 0 0 1px oklch(0.220 0.004 49.25), 0 6px 16px rgba(0, 0, 0, 0.3)';
            }}
          >
            CANCELAR
          </button>
        </div>
      </form>
    </div>
  );
}
