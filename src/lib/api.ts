import { useAppStore } from '../store/useAppStore';

/** Sin barra final; en prod define `VITE_API_URL=https://tu-backend.vercel.app` */
const API_ORIGIN = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:3000';
const API_BASE_URL = `${API_ORIGIN}/api`;

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Session expired or invalid
    useAppStore.getState().logout();
    throw new Error('Session expired');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}

/** Evento de línea de tiempo mientras el backend procesa el chat (NDJSON). */
export interface ChatProgressEvent {
  phase: string;
  label: string;
  detail?: string;
}

export const chatApi = {
  sendMessage: async (
    message: string,
    customerId?: string,
    conversationId?: string,
    customerContext?: { latitude?: number; longitude?: number; city?: string },
    onProgress?: (event: ChatProgressEvent) => void,
  ) => {
    const token = localStorage.getItem('accessToken');
    const body = {
      message,
      customerId,
      conversationId,
      stream: true as const,
      ...(customerContext && Object.keys(customerContext).length > 0 ? { customerContext } : {}),
    };

    const response = await fetch(`${API_BASE_URL}/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') ?? '';

    // Backend antiguo sin NDJSON: una sola respuesta JSON.
    if (!contentType.includes('ndjson')) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }
      return data;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No se pudo leer la respuesta del servidor');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let result: { success: boolean; data: unknown } | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        if (!line) continue;
        let obj: {
          type?: string;
          phase?: string;
          label?: string;
          detail?: string;
          message?: string;
          success?: boolean;
          data?: unknown;
        };
        try {
          obj = JSON.parse(line);
        } catch {
          continue;
        }
        if (obj.type === 'progress' && obj.phase && obj.label) {
          onProgress?.({ phase: obj.phase, label: obj.label, detail: obj.detail });
        }
        if (obj.type === 'error') {
          throw new Error(obj.message || 'Error al procesar el mensaje');
        }
        if (obj.type === 'complete' && typeof obj.success === 'boolean' && obj.data !== undefined) {
          result = { success: obj.success, data: obj.data };
        }
      }
    }

    if (!response.ok && !result) {
      throw new Error('Error en la respuesta del servidor');
    }

    if (!result) {
      throw new Error('Respuesta incompleta del servidor');
    }

    return result;
  },
  getHistory: (customerId: string, conversationId?: string) =>
    apiRequest(`/chat/history/${customerId}${conversationId ? `?conversationId=${conversationId}` : ''}`),
  deleteSession: (customerId: string, conversationId: string) =>
    apiRequest(`/chat/history/${customerId}/${conversationId}`, {
      method: 'DELETE',
    }),
};

export const authApi = {
  login: (credentials: any) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  register: (userData: any) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  updateProfile: (profileData: any) =>
    apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),
  updatePassword: (password: string) =>
    apiRequest('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ password }),
    }),
  requestCode: () =>
    apiRequest('/auth/request-code', {
      method: 'POST',
    }),
  verifyAndChangePassword: (data: { code: string; password: string }) =>
    apiRequest('/auth/verify-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteAccount: () =>
    apiRequest('/auth/account', {
      method: 'DELETE',
    }),
};

export const hospitalApi = {
  /**
   * @param options.catalog true = solo maestro Notion (sin mezcla OSM). Con GPS y catalog false: Notion en radio + otros centros (OpenStreetMap), marcando cobertura.
   */
  getNearbyHospitals: (
    latitude?: number,
    longitude?: number,
    radius: number = 50,
    options?: { catalog?: boolean; numeroPoliza?: string | null },
  ) => {
    const params = new URLSearchParams();
    if (latitude !== undefined) params.append('latitude', latitude.toString());
    if (longitude !== undefined) params.append('longitude', longitude.toString());
    params.append('radius', radius.toString());
    if (options?.catalog) params.append('catalog', 'true');
    const poliza = options?.numeroPoliza?.trim();
    if (poliza) params.append('numeroPoliza', poliza);
    return apiRequest(`/hospital/nearby?${params.toString()}`);
  },
};

export const customerApi = {
  getCoverage: (customerId: string) =>
    apiRequest(`/customer/${customerId}/coverage`),
  createCustomer: () =>
    apiRequest('/customer/create', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
};
