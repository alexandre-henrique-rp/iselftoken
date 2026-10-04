# k6 Scenarios — Validação de 500 VUs

Cenários k6 para validar a meta de **500 usuários simultâneos** no iSelfToken. Cada cenário simula uma jornada real de usuário e mede TTFB, latência de página e taxa de erro.

> **Requisito:** k6 instalado (`brew install k6`, `apt install k6`, ou binary em https://k6.io/docs/getting-started/installation/).

---

## Cenário 1: Marketplace Browse (200 VUs)

Usuários anônimos + autenticados navegando o marketplace público.

```javascript
// scenarios/marketplace-browse.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 200,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/marketplace`, {
    headers: { 'User-Agent': 'k6-perf-test/1.0' },
  });

  check(res, {
    'status 200': (r) => r.status === 200,
    'TTFB < 300ms': (r) => r.timings.waiting < 300,
    'has startups': (r) => r.body.includes('startup'),
  });

  sleep(Math.random() * 3 + 1);
}
```

---

## Cenário 2: Auth Login (50 VUs)

Usuários fazendo login + 2FA (cold path).

```javascript
// scenarios/auth-login.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const loginRes = http.post(
    `${__ENV.BASE_URL}/api/auth`,
    JSON.stringify({
      email: `user${__VU}@test.iselftoken.com`,
      password: 'Test123!@#',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, {
    'login 200': (r) => r.status === 200,
    'session cookie': (r) => r.headers['Set-Cookie'] !== undefined,
  });

  sleep(2);
}
```

---

## Cenário 3: Wallet Load (200 VUs)

Usuários autenticados verificando saldo + transações.

```javascript
// scenarios/wallet-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 200,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<400'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const cookies = __ENV.SESSION_COOKIE; // injetar de login prévio
  const res = http.get(`${__ENV.BASE_URL}/api/wallet`, {
    headers: { Cookie: cookies },
  });

  check(res, {
    'status 200': (r) => r.status === 200,
    'has balance': (r) => r.body.includes('balance'),
  });

  sleep(Math.random() * 5 + 2);
}
```

---

## Cenário 4: Checkout Flow (30 VUs)

Investidores finalizando pagamento (PIX).

```javascript
// scenarios/checkout-flow.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 30,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<3000'], // EFI externo é lento
    http_req_failed: ['rate<0.02'],
  },
};

export default function () {
  const cookies = __ENV.SESSION_COOKIE;

  // 1. Ver checkout
  const checkoutRes = http.get(`${__ENV.BASE_URL}/checkout/123`, {
    headers: { Cookie: cookies },
  });
  check(checkoutRes, { 'checkout 200': (r) => r.status === 200 });

  sleep(3);

  // 2. Solicitar PIX
  const pixRes = http.post(
    `${__ENV.BASE_URL}/api/payment/pix`,
    JSON.stringify({ amount: 1000, campaignId: 1 }),
    { headers: { 'Content-Type': 'application/json', Cookie: cookies } }
  );
  check(pixRes, { 'pix 200': (r) => r.status === 200 });

  sleep(10);
}
```

---

## Cenário 5: Admin Dashboard (20 VUs)

Admins carregando dashboard executivo.

```javascript
// scenarios/admin-dashboard.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const cookies = __ENV.ADMIN_COOKIE;
  const res = http.get(`${__ENV.BASE_URL}/api/admin/dashboard/summary`, {
    headers: { Cookie: cookies },
  });

  check(res, {
    'status 200': (r) => r.status === 200,
    'has metrics': (r) => r.body.includes('users'),
  });

  sleep(10); // admin dashboard é carregado com menos frequência
}
```

---

## Cenário Combinado: 500 VUs Simultâneos

```javascript
// k6-script.js (em templates/)
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    marketplace_browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    auth_login: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
    },
    wallet_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    checkout_flow: {
      executor: 'constant-vus',
      vus: 30,
      duration: '5m',
    },
    admin_dashboard: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    'group_duration{group:::marketplace}': ['p(95)<300'],
    'group_duration{group:::admin_dashboard}': ['p(95)<2000'],
    'group_duration{group:::checkout}': ['p(95)<3000'],
  },
};

// ... (implementação de cada cenário)
```

---

## Variáveis de Ambiente

```bash
# Staging
export BASE_URL="https://staging.iselftoken.com"

# Login prévio para extrair cookie de sessão
curl -c cookies.txt -X POST "${BASE_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"email":"perf-test@iselftoken.com","password":"..."}'

export SESSION_COOKIE=$(grep session_id cookies.txt | awk '{print $7}')
export ADMIN_COOKIE=$(grep session_id admin-cookies.txt | awk '{print $7}')
```

---

## Execução

```bash
# Individual
k6 run --vus 50 --duration 30s scenarios/auth-login.js

# Combinado (500 VUs)
k6 run templates/k6-script.js \
  -e BASE_URL=https://staging.iselftoken.com \
  -e SESSION_COOKIE="$SESSION_COOKIE" \
  -e ADMIN_COOKIE="$ADMIN_COOKIE" \
  --out json=docs/performance/<id>-k6.json
```

---

## Interpretação dos Resultados

| Métrica | Bom | Aceitável | Ruim |
|---------|-----|-----------|------|
| `http_req_duration p(95)` | < 300ms | < 500ms | > 500ms |
| `http_req_failed` | < 0.5% | < 1% | > 1% |
| Iterações completadas | = VUs × duração | ±10% | < 80% |
| Throughput | > 1000 req/s | > 500 req/s | < 500 req/s |

Se algum cenário ultrapassar o threshold, marcar página como **FAIL** no relatório e recomendar fix prioritário (ver `backend-checklist.md` e `frontend-checklist.md`).

---

## Cuidados

1. **Não rodar em produção** sem autorização explícita (vetor de ataque + impacto em usuários reais)
2. **Rodar em horário de baixo tráfego** se usar staging compartilhado
3. **Limpar cookies** entre cenários (evitar sessão acumulada)
4. **Monitorar Sentry** durante o teste (alertar se volume de erros subir)
5. **Documentar `k6` version** usado (output no relatório)
