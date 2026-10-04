// k6-script.js — Template combinado para validar 500 VUs no iSelfToken
// Uso:
//   k6 run templates/k6-script.js \
//     -e BASE_URL=https://staging.iselftoken.com \
//     -e SESSION_COOKIE="session_id=xxx" \
//     -e ADMIN_COOKIE="session_id=yyy" \
//     --out json=docs/performance/<id>-k6.json

import http from 'k6/http';
import { check, sleep } from 'k6';
import { group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const SESSION_COOKIE = __ENV.SESSION_COOKIE || '';
const ADMIN_COOKIE = __ENV.ADMIN_COOKIE || '';

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
      tags: { scenario: 'marketplace' },
    },
    auth_login: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      tags: { scenario: 'auth' },
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
      tags: { scenario: 'wallet' },
    },
    checkout_flow: {
      executor: 'constant-vus',
      vus: 30,
      duration: '5m',
      tags: { scenario: 'checkout' },
    },
    admin_dashboard: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
      tags: { scenario: 'admin' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
    'group_duration{group:::marketplace}': ['p(95)<300'],
    'group_duration{group:::auth}': ['p(95)<800'],
    'group_duration{group:::wallet}': ['p(95)<400'],
    'group_duration{group:::checkout}': ['p(95)<3000'],
    'group_duration{group:::admin}': ['p(95)<2000'],
  },
  noConnectionReuse: false,
  userAgent: 'k6-perf-test/1.0',
};

const publicHeaders = {
  'User-Agent': 'k6-perf-test/1.0',
};

const authHeaders = {
  'User-Agent': 'k6-perf-test/1.0',
  Cookie: SESSION_COOKIE,
};

const adminHeaders = {
  'User-Agent': 'k6-perf-test/1.0',
  Cookie: ADMIN_COOKIE,
};

// -----------------------------------------------------------------------------
// Scenario 1: Marketplace Browse
// -----------------------------------------------------------------------------

export function marketplaceScenario() {
  group('01_marketplace', function () {
    const res = http.get(`${BASE_URL}/marketplace`, {
      headers: publicHeaders,
    });

    check(res, {
      'marketplace status 200': (r) => r.status === 200,
      'marketplace TTFB < 300ms': (r) => r.timings.waiting < 300,
      'marketplace has startups': (r) => r.body && r.body.includes('startup'),
    });

    sleep(Math.random() * 3 + 1);

    const startup = http.get(`${BASE_URL}/api/startups/featured`, {
      headers: publicHeaders,
    });

    check(startup, {
      'featured status 200': (r) => r.status === 200,
      'featured TTFB < 200ms': (r) => r.timings.waiting < 200,
    });
  });
}

// -----------------------------------------------------------------------------
// Scenario 2: Auth Login
// -----------------------------------------------------------------------------

export function authScenario() {
  group('02_auth', function () {
    const loginRes = http.post(
      `${BASE_URL}/api/auth`,
      JSON.stringify({
        email: `perf-test-${__VU}-${__ITER}@iselftoken.com`,
        password: 'Test123!@#$%^&*()',
      }),
      {
        headers: { 'Content-Type': 'application/json', ...publicHeaders },
      }
    );

    check(loginRes, {
      'login status 200/401': (r) => r.status === 200 || r.status === 401,
      'login TTFB < 800ms': (r) => r.timings.waiting < 800,
    });

    sleep(2);
  });
}

// -----------------------------------------------------------------------------
// Scenario 3: Wallet Load
// -----------------------------------------------------------------------------

export function walletScenario() {
  group('03_wallet', function () {
    if (!SESSION_COOKIE) {
      sleep(5);
      return;
    }

    const wallet = http.get(`${BASE_URL}/api/wallet`, {
      headers: authHeaders,
    });

    check(wallet, {
      'wallet status 200': (r) => r.status === 200,
      'wallet TTFB < 400ms': (r) => r.timings.waiting < 400,
    });

    sleep(Math.random() * 5 + 2);

    const tx = http.get(`${BASE_URL}/api/wallet/transactions?page=1&limit=20`, {
      headers: authHeaders,
    });

    check(tx, {
      'transactions status 200': (r) => r.status === 200,
      'transactions TTFB < 400ms': (r) => r.timings.waiting < 400,
    });
  });
}

// -----------------------------------------------------------------------------
// Scenario 4: Checkout Flow
// -----------------------------------------------------------------------------

export function checkoutScenario() {
  group('04_checkout', function () {
    if (!SESSION_COOKIE) {
      sleep(10);
      return;
    }

    const checkout = http.get(`${BASE_URL}/checkout/1`, {
      headers: authHeaders,
    });

    check(checkout, {
      'checkout status 200': (r) => r.status === 200 || r.status === 404,
      'checkout TTFB < 3000ms': (r) => r.timings.waiting < 3000,
    });

    sleep(5);

    const pix = http.post(
      `${BASE_URL}/api/payment/pix`,
      JSON.stringify({ amount: 1000, campaignId: 1 }),
      {
        headers: { 'Content-Type': 'application/json', ...authHeaders },
      }
    );

    check(pix, {
      'pix status 200/400/401': (r) =>
        r.status === 200 || r.status === 400 || r.status === 401,
      'pix TTFB < 3000ms': (r) => r.timings.waiting < 3000,
    });

    sleep(15);
  });
}

// -----------------------------------------------------------------------------
// Scenario 5: Admin Dashboard
// -----------------------------------------------------------------------------

export function adminScenario() {
  group('05_admin', function () {
    if (!ADMIN_COOKIE) {
      sleep(10);
      return;
    }

    const summary = http.get(`${BASE_URL}/api/admin/dashboard/summary`, {
      headers: adminHeaders,
    });

    check(summary, {
      'admin status 200': (r) => r.status === 200,
      'admin TTFB < 2000ms': (r) => r.timings.waiting < 2000,
    });

    sleep(10);

    const payments = http.get(`${BASE_URL}/api/payment?page=1&limit=25`, {
      headers: adminHeaders,
    });

    check(payments, {
      'payments status 200': (r) => r.status === 200,
      'payments TTFB < 500ms': (r) => r.timings.waiting < 500,
    });
  });
}

// -----------------------------------------------------------------------------
// Main — dispatch por cenário baseado em tags
// -----------------------------------------------------------------------------

export default function () {
  const tags = __ENV.SCENARIO || '';

  if (__VU <= 200) {
    marketplaceScenario();
  } else if (__VU <= 250) {
    authScenario();
  } else if (__VU <= 450) {
    walletScenario();
  } else if (__VU <= 480) {
    checkoutScenario();
  } else {
    adminScenario();
  }
}

// -----------------------------------------------------------------------------
// Setup — validar conectividade antes do teste
// -----------------------------------------------------------------------------

export function setup() {
  const res = http.get(`${BASE_URL}/health`);
  if (res.status !== 200) {
    console.error(`Health check falhou: ${res.status}`);
    throw new Error('Backend não está respondendo');
  }
  console.log(`k6 conectado a ${BASE_URL}`);
  return { baseUrl: BASE_URL, startTime: new Date().toISOString() };
}

// -----------------------------------------------------------------------------
// Teardown — relatório final
// -----------------------------------------------------------------------------

export function teardown(data) {
  console.log(`Teste finalizado em ${new Date().toISOString()}`);
  console.log(`Iniciado em: ${data.startTime}`);
}
