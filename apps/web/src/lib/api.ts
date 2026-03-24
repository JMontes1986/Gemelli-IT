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
    const looksLikeUrl =
      sanitizedEnv.startsWith('http://') ||
      sanitizedEnv.startsWith('https://') ||
      sanitizedEnv.startsWith('/');

    if (!looksLikeUrl) {
      if (typeof window !== 'undefined') {
        // Evita usar valores inválidos (por ejemplo, keys de terceros) como URL base.
        console.warn(
          'PUBLIC_API_URL no parece una URL válida. Se usará el origen actual con /api.',
        );
      }
      return typeof window !== 'undefined'
        ? resolveForHost(window.location.origin, window.location.hostname)
        : 'http://localhost:8000';
    }
    
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
const FALLBACK_API_URL =
  API_URL.endsWith('/api') && typeof window !== 'undefined'
    ? window.location.origin.replace(/\/$/, '')
    : null;

const buildFallbackUrls = (endpoint: string) => {
  if (typeof window === 'undefined') {
    return [] as string[];
  }

  const origin = window.location.origin.replace(/\/$/, '');
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const urls: string[] = [];

  if (FALLBACK_API_URL) {
    urls.push(`${FALLBACK_API_URL}${normalizedEndpoint}`);
    urls.push(`${origin}/api/index${normalizedEndpoint}`);
  }

  return Array.from(new Set(urls));
};

const isApiNotReachableError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('not_found') ||
    normalized.includes('not found') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('backend no respondió correctamente')
  );
};

const shouldPreferSupabaseRegistration = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const host = window.location.hostname;

  // En despliegues serverless donde el backend API no está disponible,
  // evitar el intento inicial contra /api/auth/register para no generar 404 ruidosos.
  return host.endsWith('vercel.app');
};

async function registerUserViaSupabase(data: {
  nombre: string;
  email: string;
  password: string;
  rol: string;
  org_unit_id?: number | string | null;
  activo?: boolean;
}) {
  if (typeof window === 'undefined') {
    throw new Error('No se pudo registrar el usuario en este entorno.');
  }

  const { getSupabaseClient } = await import('./supabase');
  const supabase = getSupabaseClient();
  const normalizedEmail = data.email.trim().toLowerCase();
  const emailRedirectTo =
    typeof window !== 'undefined' ? `${window.location.origin.replace(/\/$/, '')}/login` : undefined;
  
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: data.password,
    options: {
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
      data: {
        nombre: data.nombre,
        rol: data.rol,
      },
    },
  });

  if (signUpError) {
    throw new Error(signUpError.message || 'No se pudo crear el usuario en Supabase Auth.');
  }

  const userId = signUpData.user?.id;
  if (!userId) {
    throw new Error('No se recibió el UUID del usuario creado en Supabase Auth.');
  }

  const { error: profileError } = await supabase.from('users').upsert(
    {
      id: userId,
      nombre: data.nombre,
      email: normalizedEmail,
      rol: data.rol,
      org_unit_id: data.org_unit_id || null,
      activo: data.activo ?? true,
      // Esta columna se mantiene por compatibilidad con el esquema actual.
      password_hash: 'managed_by_supabase_auth',
    },
    { onConflict: 'id' },
  );

  if (profileError) {
    throw new Error(
      profileError.message ||
        'No se pudo crear el perfil en public.users. Revisa las políticas RLS de INSERT.',
    );
  }

  return signUpData;
}

// Helper para hacer requests autenticados
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const url = `${API_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  let response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 404) {
    const fallbackUrls = buildFallbackUrls(endpoint);

    for (const fallbackUrl of fallbackUrls) {
      response = await fetch(fallbackUrl, {
        ...options,
        headers,
      });

      if (response.status !== 404) {
        break;
      }
    }
  }
  
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const normalizedBody = text.trim();
  const isHtmlResponse =
    contentType.includes('text/html') ||
    normalizedBody.startsWith('<!DOCTYPE') ||
    normalizedBody.startsWith('<html');

  if (isHtmlResponse) {
    throw new Error(
      `El backend no respondió correctamente al solicitar ${url}. Verifica PUBLIC_API_URL y que la función serverless esté desplegada en /api.`,
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

  register: async (data: {
    nombre: string;
    email: string;
    password: string;
    rol: string;
    org_unit_id?: number | string | null;
    activo?: boolean;
  }) => {
    if (shouldPreferSupabaseRegistration()) {
      return registerUserViaSupabase(data);
    }
    
    try {
      return await fetchAPI('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isApiNotReachableError(message)) {
        throw error;
      }

      return registerUserViaSupabase(data);
    }
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
