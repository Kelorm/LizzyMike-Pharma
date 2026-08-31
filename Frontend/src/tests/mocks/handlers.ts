import { http, HttpResponse } from 'msw';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

/** Simulated httpOnly cookie session (jsdom does not persist Set-Cookie). */
let cookieSessionActive = false;

export function resetMockSession() {
  cookieSessionActive = false;
}

function isAuthed(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  return cookieSessionActive || !!(authHeader && authHeader.includes('Bearer'));
}

export const handlers = [
  http.get(`${API_BASE_URL}/auth/csrf/`, () => {
    return HttpResponse.json({ csrfToken: 'test-csrf-token' }, { status: 200 });
  }),

  http.post(`${API_BASE_URL}/token/`, async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string };
    const { username, password } = body;

    if (username === 'testuser' && password === 'correct-password') {
      cookieSessionActive = true;
      return HttpResponse.json(
        {
          access: 'mock-access-token-12345',
          refresh: 'mock-refresh-token-67890',
        },
        { status: 200 }
      );
    }

    if (username === 'testuser' && password === 'wrong-password') {
      return HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 });
    }

    return HttpResponse.json({ detail: 'User not found' }, { status: 401 });
  }),

  http.get(`${API_BASE_URL}/profile/`, ({ request }) => {
    if (!isAuthed(request)) {
      return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    return HttpResponse.json(
      {
        id: 'user-uuid-12345',
        username: 'testuser',
        email: 'test@example.com',
        role: 'pharmacist',
        full_name: 'Test User',
      },
      { status: 200 }
    );
  }),

  http.post(`${API_BASE_URL}/auth/logout/`, () => {
    cookieSessionActive = false;
    return HttpResponse.json({ detail: 'Logged out.' }, { status: 200 });
  }),

  http.post(`${API_BASE_URL}/token/refresh/`, async ({ request }) => {
    let refresh = '';
    try {
      const body = (await request.json()) as { refresh?: string };
      refresh = body?.refresh || '';
    } catch {
      refresh = '';
    }

    if (cookieSessionActive || (refresh && String(refresh).includes('refresh'))) {
      cookieSessionActive = true;
      return HttpResponse.json({ access: 'new-access-token-refresh' }, { status: 200 });
    }

    return HttpResponse.json({ detail: 'Invalid refresh token' }, { status: 401 });
  }),

  http.get(`${API_BASE_URL}/sales/`, ({ request }) => {
    if (!isAuthed(request)) {
      return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    return HttpResponse.json(
      {
        results: [
          {
            id: 'sale-uuid-1',
            customer: 'customer-uuid-1',
            customer_name: 'John Doe',
            date: '2024-01-15',
            total: 150.0,
            subtotal: 150.0,
            discount_total: 0.0,
            total_cost: 75.0,
            profit: 75.0,
            payment_method: 'Cash',
            notes: 'Test sale',
            items: [
              {
                id: 'item-uuid-1',
                medication: 'med-uuid-1',
                medication_name: 'Paracetamol',
                qty: 2,
                quantity: 2,
                price: 75.0,
                cost: 37.5,
              },
            ],
          },
        ],
      },
      { status: 200 }
    );
  }),

  http.post(`${API_BASE_URL}/sales/`, async ({ request }) => {
    if (!isAuthed(request)) {
      return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as any;

    if (!body.customer && !body.customer_name) {
      return HttpResponse.json({ customer: ['This field is required'] }, { status: 400 });
    }

    if (!body.items || body.items.length === 0) {
      return HttpResponse.json({ items: ['At least one item is required'] }, { status: 400 });
    }

    for (const item of body.items) {
      if (item.qty === 0 || item.quantity === 0) {
        return HttpResponse.json({ items: 'Quantity must be greater than 0' }, { status: 400 });
      }
    }

    return HttpResponse.json(
      {
        id: 'sale-uuid-new',
        customer: body.customer,
        customer_name: body.customer_name || 'Customer',
        date: body.date,
        total: body.total || 100,
        subtotal: body.subtotal || 100,
        discount_total: body.discount_total || 0,
        total_cost: 50,
        profit: 50,
        payment_method: body.payment_method,
        notes: body.notes,
        items: body.items,
      },
      { status: 201 }
    );
  }),

  http.get(`${API_BASE_URL}/medications/`, ({ request }) => {
    if (!isAuthed(request)) {
      return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    return HttpResponse.json(
      {
        results: [
          {
            id: 'med-uuid-1',
            name: 'Paracetamol',
            generic_name: 'Acetaminophen',
            stock: 100,
            cost: 37.5,
            price: 75.0,
            expiry_date: '2025-12-31',
          },
        ],
      },
      { status: 200 }
    );
  }),

  http.get(`${API_BASE_URL}/customers/`, ({ request }) => {
    if (!isAuthed(request)) {
      return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    return HttpResponse.json(
      {
        results: [
          {
            id: 'customer-uuid-1',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890',
          },
        ],
      },
      { status: 200 }
    );
  }),
];
