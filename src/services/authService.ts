/**
 * Authentication Service
 * Handles all authentication API calls to Django backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Debug: Log API URL in production
if (import.meta.env.PROD) {
  console.log('🔧 API Base URL:', API_BASE_URL);
  console.log('🔧 Environment:', import.meta.env.MODE);
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  password_confirm: string;
  full_name: string;
  phone?: string;
  role: 'patient' | 'doctor';
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  blood_group?: string;
  specialization?: string;
  license_number?: string;
  hospital?: string;
  experience?: number;
  consultation_fee?: number;
}

export interface AuthResponse {
  message: string;
  user: UserData;
  tokens: {
    access: string;
    refresh: string;
  };
}

export interface UserData {
  id: string;
  email: string;
  username: string;
  phone?: string;
  role: 'patient' | 'doctor';
  is_email_verified: boolean;
  first_name?: string;
  last_name?: string;
  profile?: UserProfile;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  blood_group?: string;
  allergies: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  specialization?: string;
  license_number?: string;
  hospital?: string;
  experience?: number;
  consultation_fee?: number;
  available_slots?: any[];
  rating?: number;
  total_consultations?: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

class AuthService {
  private getAuthHeaders(): HeadersInit {
    const token = this.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private setTokens(access: string, refresh: string): void {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }

  private clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout (Render free tier can be slow)
    
    try {
      console.log('🔐 Attempting login to:', `${API_BASE_URL}/api/auth/login/`);
      const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
        
        // Extract error messages from Django REST Framework validation errors
        let errorMessage = errorData.detail || errorData.message || 'Login failed';
        
        // Handle nested validation errors
        if (typeof errorData === 'object' && !errorData.detail) {
          const errorMessages: string[] = [];
          for (const [field, errors] of Object.entries(errorData)) {
            if (Array.isArray(errors)) {
              errorMessages.push(`${field}: ${errors.join(', ')}`);
            } else if (typeof errors === 'string') {
              errorMessages.push(`${field}: ${errors}`);
            }
          }
          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join('. ');
          }
        }
        
        throw new Error(errorMessage);
      }

      const data: AuthResponse = await response.json();
      this.setTokens(data.tokens.access, data.tokens.refresh);
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please check your internet connection and try again.');
      }
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Cannot connect to server. Please check if the backend is running at ${API_BASE_URL}`);
      }
      throw error;
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: `Registration failed with status ${response.status}` };
      }
      
      // Extract error messages from Django REST Framework validation errors
      let errorMessage = errorData.detail || errorData.message || errorData.error || 'Registration failed';
      
      // Handle specific error cases with user-friendly messages
      if (errorMessage.includes('duplicate key') || errorMessage.includes('already exists')) {
        if (errorMessage.includes('email')) {
          errorMessage = 'This email is already registered. Please use a different email or try logging in.';
        } else if (errorMessage.includes('username')) {
          errorMessage = 'This username is already taken. Please choose a different username.';
        } else {
          errorMessage = 'An account with this information already exists. Please try logging in.';
        }
      }
      
      // Handle nested validation errors (common in DRF)
      if (typeof errorData === 'object' && !errorData.detail && !errorData.message && !errorData.error) {
        const errorMessages: string[] = [];
        for (const [field, errors] of Object.entries(errorData)) {
          if (Array.isArray(errors)) {
            errorMessages.push(`${field}: ${errors.join(', ')}`);
          } else if (typeof errors === 'string') {
            errorMessages.push(`${field}: ${errors}`);
          } else if (Array.isArray(errors) && errors.length > 0) {
            errorMessages.push(`${field}: ${errors[0]}`);
          }
        }
        if (errorMessages.length > 0) {
          errorMessage = errorMessages.join('. ');
        }
      }
      
      console.error('Registration error details:', errorData);
      throw new Error(errorMessage);
    }

    const result: AuthResponse = await response.json();
    this.setTokens(result.tokens.access, result.tokens.refresh);
    return result;
  }

  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    this.clearTokens();
  }

  async getCurrentUser(): Promise<UserData> {
    const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return this.getCurrentUser();
        }
      }
      throw new Error('Failed to get current user');
    }

    return response.json();
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data = await response.json();
      this.setTokens(data.access, refreshToken);
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearTokens();
      return false;
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout (Render free tier can be slow)
    
    try {
      console.log('🔐 Requesting password reset from:', `${API_BASE_URL}/api/auth/password/reset/request/`);
      const response = await fetch(`${API_BASE_URL}/api/auth/password/reset/request/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: `Password reset request failed with status ${response.status}` };
        }
        
        // Extract error messages from Django REST Framework validation errors
        let errorMessage = errorData.detail || errorData.message || 'Password reset request failed';
        
        // Handle nested validation errors
        if (typeof errorData === 'object' && !errorData.detail && !errorData.message) {
          const errorMessages: string[] = [];
          for (const [field, errors] of Object.entries(errorData)) {
            if (Array.isArray(errors)) {
              errorMessages.push(`${field}: ${errors.join(', ')}`);
            } else if (typeof errors === 'string') {
              errorMessages.push(`${field}: ${errors}`);
            }
          }
          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join('. ');
          }
        }
        
        console.error('Password reset error details:', errorData);
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please check your internet connection and try again.');
      }
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Cannot connect to server. Please check if the backend is running at ${API_BASE_URL}`);
      }
      throw error;
    }
  }

  async confirmPasswordReset(token: string, newPassword: string, newPasswordConfirm: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/auth/password/reset/confirm/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Password reset failed' }));
      throw new Error(error.detail || error.message || 'Password reset failed');
    }
  }

  async changePassword(oldPassword: string, newPassword: string, newPasswordConfirm: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/auth/password/change/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Password change failed' }));
      throw new Error(error.detail || error.message || 'Password change failed');
    }
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile/`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Profile update failed' }));
      throw new Error(error.detail || error.message || 'Profile update failed');
    }

    return response.json();
  }

  async getProfile(): Promise<UserProfile> {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile/`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get profile');
    }

    return response.json();
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export const authService = new AuthService();

