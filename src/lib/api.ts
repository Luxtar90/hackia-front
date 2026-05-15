const API_BASE_URL = 'http://localhost:3000/api';

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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}

export const chatApi = {
  sendMessage: (message: string, customerId?: string) =>
    apiRequest('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message, customerId }),
    }),
  getHistory: (customerId: string) =>
    apiRequest(`/chat/history/${customerId}`),
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
};
