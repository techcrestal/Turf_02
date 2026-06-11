import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/endpoints/auth';
import { usersApi } from '../api/endpoints/users';
import { setAuthToken } from '../api/client';
import { storage } from '../utils/storage';
import type { ProfilePayload, RegisterPayload } from '../types/auth';
import type { UserProfile } from '../types/user';

interface AuthContextState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  loading: boolean;
  // OTP flow state
  otpIdentifier: string | null;
  otpPhone: string | null;
  setOtpContext: (identifier: string, phone: string) => void;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (otp: string) => Promise<UserProfile>;
  register: (payload: RegisterPayload) => Promise<UserProfile>;
  loginWithPassword: (identifier: string, password: string) => Promise<UserProfile>;
  createProfile: (payload: ProfilePayload) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpIdentifier, setOtpIdentifier] = useState<string | null>(null);
  const [otpPhone, setOtpPhone] = useState<string | null>(null);

  const doLogout = async () => {
    try {
      if (storage.getToken()) await authApi.logout();
    } catch { /* ignore */ }
    storage.clearToken();
    setToken(null);
    setUser(null);
    setAuthToken(null);
    setOtpIdentifier(null);
    setOtpPhone(null);
  };

  useEffect(() => {
    const storedToken = storage.getToken();
    if (storedToken) {
      setToken(storedToken);
      setAuthToken(storedToken);
      usersApi
        .getProfile()
        .then(setUser)
        .catch(() => {
          storage.clearToken();
          setToken(null);
          setAuthToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const setOtpContext = (identifier: string, phone: string) => {
    setOtpIdentifier(identifier);
    setOtpPhone(phone);
  };

  const sendOtp = async (phone: string) => {
    await authApi.sendOtp({ phone_number: phone });
  };

  const verifyOtp = async (otp: string): Promise<UserProfile> => {
    if (!otpPhone) throw new Error('Phone number is required.');
    const data = await authApi.verifyOtp({ phone_number: otpPhone, otp });
    const accessToken: string = data.accessToken;
    storage.saveToken(accessToken);
    setAuthToken(accessToken);
    setToken(accessToken);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload: RegisterPayload): Promise<UserProfile> => {
    const data = await authApi.register(payload);
    const accessToken: string = data.accessToken;
    storage.saveToken(accessToken);
    setAuthToken(accessToken);
    setToken(accessToken);
    setUser(data.user);
    return data.user;
  };

  const loginWithPassword = async (identifier: string, password: string): Promise<UserProfile> => {
    const data = await authApi.loginWithPassword({ identifier, password });
    const accessToken: string = data.accessToken;
    storage.saveToken(accessToken);
    setAuthToken(accessToken);
    setToken(accessToken);
    setUser(data.user);
    return data.user;
  };

  const createProfile = async (payload: ProfilePayload) => {
    const profile = await authApi.createProfile(payload);
    setUser(profile);
  };

  const refreshUser = async () => {
    const profile = await usersApi.getProfile();
    setUser(profile);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isProfileComplete: Boolean(user?.profile_completed),
      isOwner: user?.role === 'owner',
      isAdmin: user?.role === 'admin',
      loading,
      otpIdentifier,
      otpPhone,
      setOtpContext,
      sendOtp,
      verifyOtp,
      register,
      loginWithPassword,
      createProfile,
      refreshUser,
      logout: doLogout,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, token, user, otpIdentifier, otpPhone]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
