// src/lib/api.ts
const getApiBaseUrl = () => {
  const resolveForHost = (origin: string, hostname: string) => {
    const sanitizedOrigin = origin.replace(/\/$/, '');

    // En Vercel, el backend FastAPI se expone mediante una función serverless
    // bajo /api, así evitamos depender de redirecciones externas.
    if (hostname.endsWith('vercel.app')) {
      return `${sanitizedOrigin}/api`;
    }
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }

    // En dominios personalizados seguimos apuntando a /api para alcanzar
    // el backend serverless desplegado en Vercel.
    return `${sanitizedOrigin}/api`;
  };

  const envUrl = import.meta.env.PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    const sanitizedEnv = envUrl.trim().replace(/\/$/, '');

    // Si se configura la URL del API como el mismo origen del front
    // (por ejemplo, en Vercel), ajustamos automáticamente la ruta
    // correcta para llegar a la función serverless o backend local.
    if (typeof window !== 'undefined') {
      const { origin, hostname } = window.location;
      const sanitizedOrigin = origin.replace(/\/$/, '');

      if (sanitizedEnv === sanitizedOrigin) {
        return resolveForHost(sanitizedOrigin, hostname);
      }
    }

    return sanitizedEnv;
  }

  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;
    return resolveForHost(origin, hostname);
  }

  return 'http://localhost:8000';
};

const API_URL = getApiBaseUrl();

// Helper para hacer requests autenticados
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const normalizedBody = text.trim();
  const isHtmlResponse =
    contentType.includes('text/html') ||
    normalizedBody.startsWith('<!DOCTYPE') ||
    normalizedBody.startsWith('<html');

  if (isHtmlResponse) {
    throw new Error(
      `El backend no respondió correctamente. Verifica PUBLIC_API_URL y que la función serverless esté desplegada en /api (${API_URL}${endpoint}).`,
    );
  }
  
  if (!response.ok) {
    let detail = response.statusText;
    
    try {
        const parsed = JSON.parse(text);
      detail = parsed.detail || parsed.message || detail;
    } catch {
      if (!detail) {
        detail = text;
      }
    }
    throw new Error(detail || `HTTP error! status: ${response.status}`);
  }

  if (response.status === 204 || !text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (parseError) {
    throw new Error('No se pudo interpretar la respuesta del servidor');
  }
}

// Auth
export const auth = {
  login: async (email: string, password: string) => {
    return fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  
  getProfile: async () => {
    return fetchAPI('/auth/profile');
  },
};

// Devices
export const devices = {
  list: async (params?: { estado?: string; tipo?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/inventory/devices${query ? `?${query}` : ''}`);
  },
  
  get: async (id: string) => {
    return fetchAPI(`/inventory/devices/${id}/cv`);
  },
  
  create: async (data: any) => {
    return fetchAPI('/inventory/devices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  update: async (id: string, data: any) => {
    return fetchAPI(`/inventory/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

export const inventoryPermissions = {
  list: async () => {
    return fetchAPI('/inventory/permissions');
  },

  create: async (data: { email: string; notes?: string | null }) => {
    return fetchAPI('/inventory/permissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  remove: async (id: string) => {
    return fetchAPI(`/inventory/permissions/${id}`, {
      method: 'DELETE',
    });
  },

  check: async () => {
    return fetchAPI('/inventory/permissions/check');
  },
};

// Tickets
export const tickets = {
  list: async (params?: { estado?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchAPI(`/tickets${query ? `?${query}` : ''}`);
  },
  
  get: async (id: string) => {
    return fetchAPI(`/tickets/${id}`);
  },
  
  create: async (data: any) => {
    return fetchAPI('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  update: async (id: string, data: any) => {
    return fetchAPI(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  addComment: async (id: string, comentario: string) => {
    return fetchAPI(`/tickets/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ ticket_id: id, comentario }),
    });
  },
};

// Dashboard
export const dashboard = {
  getMetrics: async () => {
    return fetchAPI('/dashboard/metrics');
  },
};

// Backups
export const backups = {
  list: async (deviceId?: string) => {
    const query = deviceId ? `?device_id=${deviceId}` : '';
    return fetchAPI(`/backups${query}`);
  },
};

// Administración global
export const admin = {
  listUsers: async () => {
   return fetchAPI('/admin/users');
  },

  createUser: async (data: {
    nombre: string;
    email: string;
    password: string;
    rol: string;
    org_unit_id?: string | null;
    activo?: boolean;
  }) => {
    return fetchAPI('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateUser: async (
    userId: string,
    data: Partial<{
      nombre: string;
      rol: string;
      org_unit_id: string | null;
      activo: boolean;
      password: string;
    }>
  ) => {
    return fetchAPI(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  listOrgUnits: async () => {
    return fetchAPI('/admin/org-units')
  },
};
