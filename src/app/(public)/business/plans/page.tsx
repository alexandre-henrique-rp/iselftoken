/**
 * Página de Planos Anuais - Design Minimalista & Alto Padrão
 * Segue exatamente o specification do doc/prompt/plans.md
 * Cor principal: #d500f9 - MAGENTA ELEGANTE
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Star } from 'lucide-react';
import { LocalStorageService, RegistroPendenteData } from '@/types/localStorage';
import { IconePlano } from '@/types/planos';
import { getPlanosVisiveis } from '@/data/planosData';
import { getIconePlano } from '@/utils/planosIcons';

const BusinessPlansPage: React.FC = () => {
  const router = useRouter();
  const [planoSelecionado, setPlanoSelecionado] = useState<string | null>(null);
  const [registroData, setRegistroData] = useState<RegistroPendenteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Obtém apenas planos visíveis da camada de dados
  const planos = getPlanosVisiveis();

  useEffect(() => {
    // Recuperar dados do registro
    const registro = LocalStorageService.recuperarRegistroPendente();
    if (registro) {
      setRegistroData(registro);
    } else {
      // Se não há dados, redirecionar para registro
      router.replace('/register');
    }
    setIsLoading(false);
  }, [router]);

  const handleSelecionarPlano = (planoId: string) => {
    setPlanoSelecionado(planoId);
    
    // Encontrar o plano selecionado
    const plano = planos.find(p => p.id === planoId);
    if (plano && registroData) {
      // 1. Atualizar registro do formulário com o parâmetro plano
      LocalStorageService.salvarRegistroPendente({
        ...registroData,
        plano: planoId as 'investidor' | 'fundador' | 'afiliado'
      });
      
      // 2. Salvar dados do plano separadamente
      const planoNome = plano.nome.toLowerCase() as 'iself-investidor' | 'iself-fundador' | 'iself-afiliado';
      LocalStorageService.salvarPlanoSelecionado({
        plano: planoNome,
        valor: plano.preco,
        validade: plano.validade || 12, // Usa validade do plano ou padrão 12 meses
        produto: plano.nome, // Nome completo do produto
        obs: `Acesso completo à plataforma ISELF Token com ${plano.validade || 12} meses de validade` // Observação padrão
      });
    }
    
    // 3. Redirecionar para checkout após 2 segundos
    setTimeout(() => {
      router.push('/checkout');
    }, 2000);
  };

  if (isLoading) {
    return (
      <div style={{ 
        background: 'oklch(0.090 0.004 49.25)', 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '2px solid #d500f9',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: 'oklch(0.650 0.004 49.25)' }}>Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'oklch(0.090 0.004 49.25)', 
      minHeight: '100vh',
      padding: '80px 40px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative'
    }}>
      {/* Header Sofisticado */}
      <header style={{
        textAlign: 'center',
        marginBottom: '80px',
        maxWidth: '800px',
        marginLeft: 'auto',
        marginRight: 'auto',
        position: 'relative'
      }}>
        {/* Logo com cor principal - canto superior esquerdo */}
        <Link 
          href="/" 
          style={{
            position: 'fixed',
            top: '40px',
            left: '40px',
            color: '#d500f9',
            fontSize: '24px',
            fontWeight: '300',
            letterSpacing: '1px',
            textDecoration: 'none',
            transition: 'opacity 0.3s ease',
            zIndex: 100
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          iSelfToken
        </Link>

        {/* Título display */}
        <h1 style={{
          color: 'oklch(0.980 0.004 49.25)',
          fontSize: '40px',
          fontWeight: '300',
          marginBottom: '16px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          lineHeight: '1.2'
        }}>
          ESCOLHA SUA TAXA DE ADESÃO
        </h1>

        {/* Subtítulo terciário */}
        <p style={{
          color: 'oklch(0.650 0.004 49.25)',
          fontSize: '16px',
          fontWeight: '500',
          lineHeight: '1.5',
          margin: '0 0 32px 0'
        }}>
          A taxa de adesão terá validade de 1 ano
        </p>

        {/* Divisor elegante */}
        <div style={{
          width: '80px',
          height: '1px',
          background: 'oklch(0.180 0.004 49.25)',
          margin: '0 auto'
        }}></div>
      </header>

      {/* Grid de Cards Premium */}
      <main style={{
        display: 'grid',
        gridTemplateColumns: planos.length === 2 ? '1fr 1fr' : '1fr 1.2fr 1fr',
        gap: '40px',
        maxWidth: planos.length === 2 ? '800px' : '1200px',
        margin: '0 auto',
        alignItems: 'center', /* Cards centralizados */
        paddingTop: '20px', /* Espaço extra para card central */
        justifyContent: planos.length === 2 ? 'center' : 'normal'
      }}>
        {planos.map((plano, index) => (
          <article
            key={plano.id}
            style={{
              background: 'oklch(0.140 0.004 49.25)',
              border: plano.recomendado ? '1px solid #d500f9' : '1px solid oklch(0.180 0.004 49.25)',
              borderRadius: '12px',
              padding: plano.recomendado ? '56px 32px' : '40px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden',
              minHeight: plano.recomendado ? '702px' : '500px',
              boxShadow: plano.recomendado ? '0 8px 32px rgba(213, 0, 249, 0.2)' : 'none',
              animation: `fadeInUp 0.6s ease-out forwards`,
              animationDelay: `${index * 0.1}s`,
              opacity: 0,
              transform: plano.recomendado ? 'translateY(-20px)' : 'translateY(0)'
            }}
            onMouseOver={(e) => {
              if (!plano.recomendado) {
                e.currentTarget.style.borderColor = '#d500f9';
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(213, 0, 249, 0.15)';
                e.currentTarget.style.background = 'oklch(0.160 0.004 49.25)';
              } else {
                e.currentTarget.style.transform = 'translateY(-28px)';
                e.currentTarget.style.boxShadow = '0 16px 50px rgba(213, 0, 249, 0.25)';
              }
            }}
            onMouseOut={(e) => {
              if (!plano.recomendado) {
                e.currentTarget.style.borderColor = 'oklch(0.180 0.004 49.25)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.background = 'oklch(0.140 0.004 49.25)';
              } else {
                e.currentTarget.style.transform = 'translateY(-20px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(213, 0, 249, 0.2)';
              }
            }}
            role="article"
            aria-label={`Plano ${plano.nome}`}
            tabIndex={0}
          >
            {/* Badge "Recomendado" */}
            {plano.recomendado && (
              <div style={{
                position: 'absolute',
                top: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#d500f9',
                color: 'oklch(0.980 0.004 49.25)',
                padding: '6px 20px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: '600',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                zIndex: 10
              }}>
                <Star size={10} />
                RECOMENDADO
              </div>
            )}

            {/* Nome do plano com cor principal */}
            <h3 style={{
              color: '#d500f9',
              fontSize: '20px',
              fontWeight: '600',
              textTransform: 'uppercase',
              marginBottom: plano.recomendado ? '32px' : '24px',
              textAlign: 'center',
              letterSpacing: '0.5px',
              margin: `${plano.recomendado ? '40px' : '0'} 0 24px 0`
            }}>
              {plano.nome}
            </h3>

            {/* Ícone representativo */}
            <div style={{
              marginBottom: '24px',
              color: '#d500f9',
              transition: 'transform 0.3s ease'
            }}>
              {getIconePlano(plano.icone as IconePlano)}
            </div>

            {/* Preço display */}
            <div style={{
              color: 'oklch(0.980 0.004 49.25)',
              fontSize: '32px',
              fontWeight: '300',
              marginBottom: '8px',
              lineHeight: '1',
              textAlign: 'center'
            }}>
              {plano.preco}
              <span style={{
                color: 'oklch(0.650 0.004 49.25)',
                fontSize: '14px',
                marginLeft: '4px'
              }}>
                {plano.periodo}
              </span>
            </div>

            {/* Divisor elegante */}
            <div style={{
              width: '100%',
              height: '1px',
              background: 'oklch(0.180 0.004 49.25)',
              margin: '24px 0'
            }}></div>

            {/* Label benefícios */}
            <div style={{
              color: 'oklch(0.850 0.004 49.25)',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '16px',
              alignSelf: 'flex-start'
            }}>
              Benefícios:
            </div>

            {/* Lista de benefícios */}
            <ul style={{
              width: '100%',
              margin: '0 0 32px 0',
              padding: 0,
              listStyle: 'none'
            }}>
              {plano.beneficios.map((beneficio, index) => (
                <li key={index} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '12px',
                  color: 'oklch(0.850 0.004 49.25)',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  <span style={{
                    color: 'oklch(0.650 0.006 150)',
                    flexShrink: 0,
                    marginTop: '2px'
                  }} aria-hidden="true">
                    <Check size={16} />
                  </span>
                  {beneficio}
                </li>
              ))}
            </ul>

            {/* Botão selecionar */}
            <button
              style={{
                width: '100%',
                height: '56px',
                background: plano.recomendado ? '#d500f9' : 'oklch(0.980 0.004 49.25)',
                color: plano.recomendado ? 'oklch(0.980 0.004 49.25)' : 'oklch(0.090 0.004 49.25)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: planoSelecionado !== null && planoSelecionado !== plano.id ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                marginTop: 'auto',
                letterSpacing: '0.5px',
                opacity: planoSelecionado !== null && planoSelecionado !== plano.id ? '0.5' : '1'
              }}
              onClick={() => planoSelecionado === null || planoSelecionado === plano.id ? handleSelecionarPlano(plano.id) : null}
              disabled={planoSelecionado !== null && planoSelecionado !== plano.id}
              onMouseOver={(e) => {
                if (!e.currentTarget.disabled) {
                  if (plano.recomendado) {
                    e.currentTarget.style.background = 'oklch(0.980 0.004 49.25)';
                    e.currentTarget.style.color = '#d500f9';
                  } else {
                    e.currentTarget.style.background = '#d500f9';
                    e.currentTarget.style.color = 'oklch(0.980 0.004 49.25)';
                  }
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(213, 0, 249, 0.25)';
                }
              }}
              onMouseOut={(e) => {
                if (!e.currentTarget.disabled) {
                  if (plano.recomendado) {
                    e.currentTarget.style.background = '#d500f9';
                    e.currentTarget.style.color = 'oklch(0.980 0.004 49.25)';
                  } else {
                    e.currentTarget.style.background = 'oklch(0.980 0.004 49.25)';
                    e.currentTarget.style.color = 'oklch(0.090 0.004 49.25)';
                  }
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
              aria-describedby={`preco-${plano.id}`}
            >
              {planoSelecionado === plano.id ? '✓ REDIRECIONANDO...' : 
               planoSelecionado !== null ? 'INDISPONÍVEL' : 'SELECIONAR PLANO'}
            </button>

            {/* Preço para screen readers */}
            <div id={`preco-${plano.id}`} style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              padding: '0',
              margin: '-1px',
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: '0'
            }}>
              {plano.preco}{plano.periodo}
            </div>
          </article>
        ))}
      </main>

      {/* CSS Global para Animações */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsivo */
        @media (max-width: 1024px) {
          main {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
            max-width: 600px !important;
            alignItems: stretch !important;
            paddingTop: '0px' !important;
            justifyContent: normal !important;
          }
          
          article {
            padding: 32px 24px !important;
            min-height: auto !important;
            transform: translateY(0) !important;
          }
          
          article[style*="min-height: 702px"] {
            padding: 36px 24px !important;
            min-height: auto !important;
            transform: translateY(0) !important;
          }

          a[style*="position: fixed"] {
            position: absolute !important;
            top: '40px' !important;
            left: '40px' !important;
          }
        }

        @media (max-width: 767px) {
          div[style*="padding: 80px 40px"] {
            padding: 40px 16px !important;
          }
          
          h1 {
            font-size: 28px !important;
            font-weight: 400 !important;
          }
          
          p[style*="font-size: 16px"] {
            font-size: 14px !important;
          }
          
          article {
            padding: 20px !important;
            min-height: auto !important;
            transform: translateY(0) !important;
          }
          
          article[style*="min-height: 702px"] {
            padding: 28px 20px !important;
            min-height: auto !important;
            transform: translateY(0) !important;
          }
          
          h3 {
            font-size: 18px !important;
          }
          
          div[style*="font-size: 32px"] {
            font-size: 24px !important;
          }
          
          button {
            height: 52px !important;
            font-size: 15px !important;
          }
          
          a[style*="position: fixed"] {
            position: static !important;
            display: block !important;
            text-align: center !important;
            margin-bottom: 20px !important;
            top: auto !important;
            left: auto !important;
          }

          main {
            justifyContent: normal !important;
          }
        }

        /* Acessibilidade */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BusinessPlansPage;