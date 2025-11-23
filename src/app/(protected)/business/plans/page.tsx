'use client';

import { getPlanosVisiveis } from '@/data/planosData';
import { useSession } from '@/hooks/useSession';
import CheckoutStorageService from '@/services/CheckoutStorageService';
import { CheckoutData } from '@/types/Checkout';
import { IconePlano } from '@/types/planos';
import { getIconePlano } from '@/utils/planosIcons';
import { Check, Star } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

// Força renderização dinâmica para evitar erro de static generation com cookies
export const dynamic = 'force-dynamic';

/**
 * Página responsável por exibir os planos disponíveis e redirecionar o usuário ao checkout.
 */
const BusinessPlansPage = () => {
  const { apiUser } = useSession();
  const planos = useMemo(() => getPlanosVisiveis(), []);
  const [cardsVisiveis, setCardsVisiveis] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    setCardsVisiveis({});

    const baseDelayMs = 1000;

    const timeouts = planos.map((plano, index) => {
      const delay = baseDelayMs + index * 500;

      return window.setTimeout(() => {
        setCardsVisiveis((estadoAnterior) => ({
          ...estadoAnterior,
          [plano.id]: true,
        }));
      }, delay);
    });

    return () => {
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, [planos]);

  const handleSelecionarPlano = useCallback(
    (planoId: string) => {
      const plano = planos.find((p) => p.id === planoId);

      if (!plano || !apiUser) {
        console.error('Plano ou usuário não encontrado');
        return;
      }

      // Preparar dados do checkout
      const checkoutData: CheckoutData = {
        userName: apiUser.nome || '',
        userId: String(apiUser.id || ''),
        valor: plano.preco || 'R$ 0,00',
        productName: plano.nome || '',
        productType: 'plano',
        productDescription: plano.descricao || '',
        validity: 12,
        obs: plano.beneficios.join(', '),
      };

      // Calcular posição centralizada da janela
      const windowWidth = 1024;
      const windowHeight = 768;
      const windowLeft = window.screenX + (window.outerWidth - windowWidth) / 2;
      const windowTop =
        window.screenY + (window.outerHeight - windowHeight) / 2;

      // Abrir checkout usando o serviço
      const checkoutWindow = CheckoutStorageService.abrirCheckout(
        checkoutData,
        `width=${windowWidth},height=${windowHeight},left=${windowLeft},top=${windowTop},resizable=yes,scrollbars=yes`,
      );

      if (!checkoutWindow) {
        console.error('Não foi possível abrir a janela de checkout');
        alert('Por favor, permita popups para este site.');
      }
    },
    [apiUser, planos],
  );

  const gridTemplateColumns = useMemo(
    () => (planos.length === 2 ? '1fr 1fr' : '1fr 1.2fr 1fr'),
    [planos.length],
  );
  const gridMaxWidth = useMemo(
    () => (planos.length === 2 ? '800px' : '1200px'),
    [planos.length],
  );

  return (
    <div
      style={{
        height: '100vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'relative',
      }}
    >
      {/* Header Sofisticado */}
      <header
        style={{
          textAlign: 'center',
          marginBottom: '16px',
          maxWidth: '800px',
          marginLeft: 'auto',
          marginRight: 'auto',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {/* Título display */}
        <h1
          style={{
            color: 'oklch(0.980 0.004 49.25)',
            fontSize: '32px',
            fontWeight: '300',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            lineHeight: '1.2',
            marginBottom: '8px',
          }}
        >
          ESCOLHA SUA TAXA DE ADESÃO
        </h1>

        {/* Subtítulo terciário */}
        <p
          style={{
            color: 'oklch(0.650 0.004 49.25)',
            fontSize: '14px',
            fontWeight: '500',
            lineHeight: '1.5',
            margin: '0 0 16px 0',
          }}
        >
          A taxa de adesão terá validade de 1 ano
        </p>

        {/* Divisor elegante */}
        <div
          style={{
            width: '80px',
            height: '1px',
            background: 'oklch(0.180 0.004 49.25)',
            margin: '0 auto',
          }}
        ></div>
      </header>

      {/* Grid de Cards Premium */}
      <main
        style={{
          display: 'grid',
          gridTemplateColumns,
          gap: '24px',
          maxWidth: gridMaxWidth,
          margin: '0 auto',
          alignItems: 'center',
          paddingTop: '16px',
          paddingBottom: '24px',
          justifyContent: planos.length === 2 ? 'center' : 'normal',
          flex: 1,
          minHeight: 0,
        }}
      >
        {planos.map((plano) => {
          const cardVisivel = Boolean(cardsVisiveis[plano.id]);
          const transformFinal = plano.recomendado
            ? 'translateY(-10px) scale(1.15)'
            : 'translateY(0) scale(0.92)';

          return (
            <article
              key={plano.id}
              style={{
                background: 'oklch(0.140 0.004 49.25)',
                border: plano.recomendado
                  ? '1px solid #d500f9'
                  : '1px solid oklch(0.180 0.004 49.25)',
                borderRadius: '12px',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition:
                  'opacity 0.6s ease, transform 0.6s ease, box-shadow 0.3s ease, border-color 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: plano.recomendado
                  ? '0 8px 32px rgba(213, 0, 249, 0.2)'
                  : 'none',
                opacity: cardVisivel ? 1 : 0,
                transform: cardVisivel ? transformFinal : 'translateY(30px)',
              }}
              onMouseOver={(e) => {
                if (!plano.recomendado) {
                  e.currentTarget.style.borderColor = '#d500f9';
                  e.currentTarget.style.transform =
                    'translateY(-4px) scale(0.95)';
                  e.currentTarget.style.boxShadow =
                    '0 12px 40px rgba(213, 0, 249, 0.15)';
                  e.currentTarget.style.background = 'oklch(0.160 0.004 49.25)';
                } else {
                  e.currentTarget.style.transform =
                    'translateY(-14px) scale(1.18)';
                  e.currentTarget.style.boxShadow =
                    '0 16px 50px rgba(213, 0, 249, 0.25)';
                }
              }}
              onMouseOut={(e) => {
                if (!plano.recomendado) {
                  e.currentTarget.style.borderColor =
                    'oklch(0.180 0.004 49.25)';
                  e.currentTarget.style.transform = 'translateY(0) scale(0.92)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.background = 'oklch(0.140 0.004 49.25)';
                } else {
                  e.currentTarget.style.transform =
                    'translateY(-10px) scale(1.15)';
                  e.currentTarget.style.boxShadow =
                    '0 8px 32px rgba(213, 0, 249, 0.2)';
                }
              }}
              role="article"
              aria-label={`Plano ${plano.nome}`}
              tabIndex={0}
            >
              {/* Badge "Recomendado" */}
              {plano.recomendado && (
                <div
                  style={{
                    position: 'absolute',
                    top: '6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#d500f9',
                    color: 'oklch(0.980 0.004 49.25)',
                    padding: '4px 16px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 10,
                  }}
                >
                  <Star size={9} />
                  RECOMENDADO
                </div>
              )}

              {/* Nome do plano com cor principal */}
              <h3
                style={{
                  color: '#d500f9',
                  fontSize: '18px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  letterSpacing: '0.5px',
                  margin: `${plano.recomendado ? '12px' : '0'} 0 12px 0`,
                }}
              >
                {plano.nome}
              </h3>

              {/* Ícone representativo */}
              <div
                style={{
                  marginBottom: '12px',
                  color: '#d500f9',
                  transition: 'transform 0.3s ease',
                }}
              >
                {getIconePlano(plano.icone as IconePlano)}
              </div>

              {/* Preço display */}
              <div
                style={{
                  color: 'oklch(0.980 0.004 49.25)',
                  fontSize: '28px',
                  fontWeight: '300',
                  marginBottom: '4px',
                  lineHeight: '1',
                  textAlign: 'center',
                }}
              >
                {plano.preco}
                <span
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    fontSize: '13px',
                    marginLeft: '4px',
                  }}
                >
                  {plano.periodo}
                </span>
              </div>

              {/* Divisor elegante */}
              <div
                style={{
                  width: '100%',
                  height: '1px',
                  background: 'oklch(0.180 0.004 49.25)',
                  margin: '12px 0',
                }}
              ></div>

              {/* Descrição do plano */}
              {plano.descricao && (
                <div
                  style={{
                    color: 'oklch(0.750 0.004 49.25)',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    marginBottom: '14px',
                    textAlign: 'center',
                  }}
                >
                  {plano.descricao}
                </div>
              )}

              {/* Label benefícios */}
              <div
                style={{
                  color: 'oklch(0.850 0.004 49.25)',
                  fontSize: '13px',
                  fontWeight: '500',
                  marginBottom: '10px',
                  alignSelf: 'flex-start',
                }}
              >
                Benefícios:
              </div>

              {/* Lista de benefícios */}
              <ul
                style={{
                  width: '100%',
                  margin: '0 0 16px 0',
                  padding: 0,
                  listStyle: 'none',
                  flex: 1,
                }}
              >
                {plano.beneficios.map((beneficio, index) => (
                  <li
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      marginBottom: '8px',
                      color: 'oklch(0.850 0.004 49.25)',
                      fontSize: '13px',
                      lineHeight: '1.4',
                    }}
                  >
                    <span
                      style={{
                        color: 'oklch(0.650 0.006 150)',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                      aria-hidden="true"
                    >
                      <Check size={14} />
                    </span>
                    {beneficio}
                  </li>
                ))}
              </ul>

              {/* Botão selecionar */}
              <button
                style={{
                  width: '100%',
                  height: '48px',
                  background: plano.recomendado
                    ? '#d500f9'
                    : 'oklch(0.980 0.004 49.25)',
                  color: plano.recomendado
                    ? 'oklch(0.980 0.004 49.25)'
                    : 'oklch(0.090 0.004 49.25)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  marginTop: 'auto',
                  letterSpacing: '0.5px',
                  opacity: '1',
                }}
                onClick={() => handleSelecionarPlano(plano.id)}
                // disabled={bloqueado}
                onMouseOver={(e) => {
                  if (!e.currentTarget.disabled) {
                    if (plano.recomendado) {
                      e.currentTarget.style.background =
                        'oklch(0.980 0.004 49.25)';
                      e.currentTarget.style.color = '#d500f9';
                    } else {
                      e.currentTarget.style.background = '#d500f9';
                      e.currentTarget.style.color = 'oklch(0.980 0.004 49.25)';
                    }
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow =
                      '0 8px 25px rgba(213, 0, 249, 0.25)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!e.currentTarget.disabled) {
                    if (plano.recomendado) {
                      e.currentTarget.style.background = '#d500f9';
                      e.currentTarget.style.color = 'oklch(0.980 0.004 49.25)';
                    } else {
                      e.currentTarget.style.background =
                        'oklch(0.980 0.004 49.25)';
                      e.currentTarget.style.color = 'oklch(0.090 0.004 49.25)';
                    }
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
                aria-describedby={`preco-${plano.id}`}
              >
                SELECIONAR PLANO
              </button>

              {/* Preço para screen readers */}
              <div
                id={`preco-${plano.id}`}
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  padding: '0',
                  margin: '-1px',
                  overflow: 'hidden',
                  clip: 'rect(0, 0, 0, 0)',
                  whiteSpace: 'nowrap',
                  border: '0',
                }}
              >
                {plano.preco}
                {plano.periodo}
              </div>
            </article>
          );
        })}
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
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* Responsivo - Tablet */
        @media (max-width: 1200px) {
          main {
            gap: 20px !important;
            max-width: 900px !important;
          }

          article {
            padding: 24px 20px !important;
          }
        }

        /* Responsivo - Mobile Landscape/Tablet Portrait */
        @media (max-width: 1024px) {
          div[style*='height: 100vh'] {
            padding: 20px !important;
          }

          header {
            margin-bottom: 12px !important;
          }

          h1 {
            font-size: 24px !important;
            margin-bottom: 6px !important;
          }

          p[style*='font-size: 14px'] {
            font-size: 13px !important;
            margin: 0 0 12px 0 !important;
          }

          main {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
            max-width: 600px !important;
            padding-top: 12px !important;
            padding-bottom: 20px !important;
          }

          article {
            padding: 20px 18px !important;
            transform: translateY(0) scale(1) !important;
          }

          h3 {
            font-size: 16px !important;
            margin: 20px 0 12px 0 !important;
          }

          div[style*='font-size: 28px'] {
            font-size: 24px !important;
          }

          button {
            height: 44px !important;
            font-size: 13px !important;
          }
        }

        /* Responsivo - Mobile */
        @media (max-width: 767px) {
          div[style*='height: 100vh'] {
            padding: 16px !important;
          }

          header {
            margin-bottom: 10px !important;
          }

          h1 {
            font-size: 20px !important;
            margin-bottom: 4px !important;
          }

          p[style*='font-size'] {
            font-size: 12px !important;
            margin: 0 0 10px 0 !important;
          }

          main {
            gap: 12px !important;
            padding-top: 10px !important;
            padding-bottom: 16px !important;
          }

          article {
            padding: 16px !important;
          }

          h3 {
            font-size: 15px !important;
            margin: 16px 0 10px 0 !important;
          }

          div[style*='font-size: 28px'],
          div[style*='font-size: 24px'] {
            font-size: 20px !important;
          }

          span[style*='font-size: 13px'] {
            font-size: 11px !important;
          }

          div[style*='font-size: 13px'] {
            font-size: 12px !important;
          }

          li {
            font-size: 12px !important;
            margin-bottom: 8px !important;
          }

          button {
            height: 42px !important;
            font-size: 12px !important;
          }

          ul {
            margin: 0 0 16px 0 !important;
          }
        }

        /* Responsivo - Small Mobile */
        @media (max-width: 480px) {
          div[style*='height: 100vh'] {
            padding: 12px !important;
          }

          h1 {
            font-size: 18px !important;
          }

          article {
            padding: 14px !important;
          }

          div[style*='padding: 6px 20px'] {
            padding: 4px 12px !important;
            font-size: 10px !important;
          }
        }

        /* Acessibilidade */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }

        /* Melhorias para impressão */
        @media print {
          div[style*='height: 100vh'] {
            height: auto !important;
          }

          article {
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BusinessPlansPage;
