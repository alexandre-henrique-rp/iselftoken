'use client';

import { getPlanosVisiveis } from '@/data/planosData';
import { useSession } from '@/hooks/useSession';
import { IconePlano } from '@/types/planos';
import { getIconePlano } from '@/utils/planosIcons';
import { Check, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Página responsável por exibir os planos disponíveis e redirecionar o usuário ao checkout.
 */
const BusinessPlansPage = () => {
  const router = useRouter();
  const {user}= useSession()
  const planos = useMemo(() => getPlanosVisiveis(), []);
  const [cardsVisiveis, setCardsVisiveis] = useState<Record<string, boolean>>({});
  const [userData, setUserData] = useState(null);

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
      console.log(planoId);
      //
      router.push(`/checkout?plano=${planoId}`);
    },
    [router],
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
        padding: '40px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'relative',
      }}
    >
      {/* Header Sofisticado */}
      <header
        style={{
          textAlign: 'center',
          marginBottom: '20px',
          maxWidth: '800px',
          marginLeft: 'auto',
          marginRight: 'auto',
          position: 'relative',
        }}
      >
        {/* Título display */}
        <h1
          style={{
            color: 'oklch(0.980 0.004 49.25)',
            fontSize: '40px',
            fontWeight: '300',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            lineHeight: '1.2',
          }}
        >
          ESCOLHA SUA TAXA DE ADESÃO
        </h1>

        {/* Subtítulo terciário */}
        <p
          style={{
            color: 'oklch(0.650 0.004 49.25)',
            fontSize: '16px',
            fontWeight: '500',
            lineHeight: '1.5',
            margin: '0 0 32px 0',
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
          gap: '40px',
          maxWidth: gridMaxWidth,
          margin: '0 auto',
          alignItems: 'center',
          paddingTop: '20px',
          justifyContent: planos.length === 2 ? 'center' : 'normal',
        }}
      >
        {planos.map((plano) => {
          const cardVisivel = Boolean(cardsVisiveis[plano.id]);
          const transformFinal = plano.recomendado
            ? 'translateY(-20px)'
            : 'translateY(0)';

          return (
            <article
              key={plano.id}
              style={{
                background: 'oklch(0.140 0.004 49.25)',
                border: plano.recomendado
                  ? '1px solid #d500f9'
                  : '1px solid oklch(0.180 0.004 49.25)',
                borderRadius: '12px',
                padding: plano.recomendado ? '56px 32px' : '40px 32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition:
                  'opacity 0.6s ease, transform 0.6s ease, box-shadow 0.3s ease, border-color 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                minHeight: plano.recomendado ? '702px' : '500px',
                boxShadow: plano.recomendado
                  ? '0 8px 32px rgba(213, 0, 249, 0.2)'
                  : 'none',
                opacity: cardVisivel ? 1 : 0,
                transform: cardVisivel ? transformFinal : 'translateY(30px)',
              }}
              onMouseOver={(e) => {
                if (!plano.recomendado) {
                  e.currentTarget.style.borderColor = '#d500f9';
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow =
                    '0 12px 40px rgba(213, 0, 249, 0.15)';
                  e.currentTarget.style.background = 'oklch(0.160 0.004 49.25)';
                } else {
                  e.currentTarget.style.transform = 'translateY(-28px)';
                  e.currentTarget.style.boxShadow =
                    '0 16px 50px rgba(213, 0, 249, 0.25)';
                }
              }}
              onMouseOut={(e) => {
                if (!plano.recomendado) {
                  e.currentTarget.style.borderColor =
                    'oklch(0.180 0.004 49.25)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.background = 'oklch(0.140 0.004 49.25)';
                } else {
                  e.currentTarget.style.transform = 'translateY(-20px)';
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
                    zIndex: 10,
                  }}
                >
                  <Star size={10} />
                  RECOMENDADO
                </div>
              )}

              {/* Nome do plano com cor principal */}
              <h3
                style={{
                  color: '#d500f9',
                  fontSize: '20px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  marginBottom: plano.recomendado ? '32px' : '24px',
                  textAlign: 'center',
                  letterSpacing: '0.5px',
                  margin: `${plano.recomendado ? '40px' : '0'} 0 24px 0`,
                }}
              >
                {plano.nome}
              </h3>

              {/* Ícone representativo */}
              <div
                style={{
                  marginBottom: '24px',
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
                  fontSize: '32px',
                  fontWeight: '300',
                  marginBottom: '8px',
                  lineHeight: '1',
                  textAlign: 'center',
                }}
              >
                {plano.preco}
                <span
                  style={{
                    color: 'oklch(0.650 0.004 49.25)',
                    fontSize: '14px',
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
                  margin: '24px 0',
                }}
              ></div>

              {/* Label benefícios */}
              <div
                style={{
                  color: 'oklch(0.850 0.004 49.25)',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '16px',
                  alignSelf: 'flex-start',
                }}
              >
                Benefícios:
              </div>

              {/* Lista de benefícios */}
              <ul
                style={{
                  width: '100%',
                  margin: '0 0 32px 0',
                  padding: 0,
                  listStyle: 'none',
                }}
              >
                {plano.beneficios.map((beneficio, index) => (
                  <li
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      marginBottom: '12px',
                      color: 'oklch(0.850 0.004 49.25)',
                      fontSize: '14px',
                      lineHeight: '1.5',
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
                  background: plano.recomendado
                    ? '#d500f9'
                    : 'oklch(0.980 0.004 49.25)',
                  color: plano.recomendado
                    ? 'oklch(0.980 0.004 49.25)'
                    : 'oklch(0.090 0.004 49.25)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
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

        /* Responsivo */
        @media (max-width: 1024px) {
          main {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
            max-width: 600px !important;
            alignitems: stretch !important;
            paddingtop: '0px' !important;
            justifycontent: normal !important;
          }

          article {
            padding: 32px 24px !important;
            min-height: auto !important;
            transform: translateY(0) !important;
          }

          article[style*='min-height: 702px'] {
            padding: 36px 24px !important;
            min-height: auto !important;
            transform: translateY(0) !important;
          }

          a[style*='position: fixed'] {
            position: absolute !important;
            top: '40px' !important;
            left: '40px' !important;
          }
        }

        @media (max-width: 767px) {
          div[style*='padding: 80px 40px'] {
            padding: 40px 16px !important;
          }

          h1 {
            font-size: 28px !important;
            font-weight: 400 !important;
          }

          p[style*='font-size: 16px'] {
            font-size: 14px !important;
          }

          article {
            padding: 20px !important;
            min-height: auto !important;
            transform: translateY(0) !important;
          }

          article[style*='min-height: 702px'] {
            padding: 28px 20px !important;
            min-height: auto !important;
            transform: translateY(0) !important;
          }

          h3 {
            font-size: 18px !important;
          }

          div[style*='font-size: 32px'] {
            font-size: 24px !important;
          }

          button {
            height: 52px !important;
            font-size: 15px !important;
          }

          a[style*='position: fixed'] {
            position: static !important;
            display: block !important;
            text-align: center !important;
            margin-bottom: 20px !important;
            top: auto !important;
            left: auto !important;
          }

          main {
            justifycontent: normal !important;
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
