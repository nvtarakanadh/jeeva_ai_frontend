import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Patient, Doctor, UserRole } from '@/types';
import { authService, UserData, UserProfile } from '@/services/authService';

interface AuthContextType {
  user: (Patient | Doctor) & { id: string } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<(Patient | Doctor) & { id: string }>;
  register: (userData: Partial<Patient | Doctor>, password: string) => Promise<(Patient | Doctor) & { id: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Patient | Doctor>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<(Patient | Doctor) & { id: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Convert UserData to Patient/Doctor format
  const convertUserData = (userData: UserData): (Patient | Doctor) & { id: string } => {
    const profile = userData.profile;
    const baseUser = {
      id: userData.id,
      name: profile?.full_name || userData.first_name || userData.email?.split('@')[0] || 'User',
      email: userData.email,
      phone: userData.phone || profile?.emergency_contact_phone || '',
      role: userData.role as UserRole,
      dateOfBirth: profile?.date_of_birth ? new Date(profile.date_of_birth) : undefined,
      gender: profile?.gender as 'male' | 'female' | 'other' | undefined,
      bloodGroup: profile?.blood_group || undefined,
      allergies: profile?.allergies || [],
      emergencyContact: profile?.emergency_contact_name ? {
        name: profile.emergency_contact_name,
        phone: profile.emergency_contact_phone || '',
        relationship: profile.emergency_contact_relationship || ''
      } : undefined,
    };

    if (userData.role === 'doctor') {
      return {
        ...baseUser,
        specialization: profile?.specialization || 'General Medicine',
        licenseNumber: profile?.license_number || '',
        hospitalAffiliation: profile?.hospital || '',
        verified: false,
      } as unknown as Doctor & { id: string };
    }

    return baseUser as unknown as Patient & { id: string };
  };

  // Initialize authentication
  useEffect(() => {
    const initializeAuth = async () => {
      if (!authService.isAuthenticated()) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await authService.getCurrentUser();
        setUser(convertUserData(userData));
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string, role: UserRole = 'patient'): Promise<(Patient | Doctor) & { id: string }> => {
    try {
      setIsLoading(true);
      console.log('🔐 Attempting login for:', email);

      const response = await authService.login({ email, password });
      const userData = convertUserData(response.user);
      
      setUser(userData);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.email}!`,
      });
      
      return userData;
    } catch (error: any) {
      console.error('🔐 Login failed:', error);
      toast({
        title: "Login failed",
        description: error.message || "An error occurred during login",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: Partial<Patient | Doctor>, password: string): Promise<(Patient | Doctor) & { id: string }> => {
    try {
      setIsLoading(true);
      console.log('🔐 Attempting registration for:', userData.email);

      const patientData = userData as Partial<Patient>;
      const doctorData = userData as Partial<Doctor>;
      const anyData = userData as any; // For fields not in type definitions
      
      // Helper function to convert empty strings to null, but keep valid values
      const nullIfEmpty = (value: any) => {
        if (value === '' || value === undefined || value === null) {
          return null;
        }
        return value;
      };
      
      const registerData: any = {
        email: userData.email!,
        password,
        password_confirm: password,
        full_name: userData.name || userData.email!.split('@')[0],
        phone: userData.phone ? userData.phone : null,
        role: userData.role || 'patient',
        date_of_birth: patientData.dateOfBirth?.toISOString().split('T')[0] || null,
        gender: nullIfEmpty(patientData.gender),
        blood_group: nullIfEmpty(anyData.bloodGroup || anyData.bloodType),
        allergies: patientData.allergies || [],
        emergency_contact_name: nullIfEmpty(patientData.emergencyContact?.name),
        emergency_contact_phone: nullIfEmpty(patientData.emergencyContact?.phone),
        emergency_contact_relationship: nullIfEmpty(patientData.emergencyContact?.relationship),
        ...(userData.role === 'doctor' ? {
          specialization: nullIfEmpty(doctorData.specialization),
          license_number: nullIfEmpty(doctorData.licenseNumber),
          hospital: nullIfEmpty(doctorData.hospitalAffiliation),
          experience: anyData.experience || 0,
          consultation_fee: anyData.consultationFee || 0,
        } : {}),
      };

      const response = await authService.register(registerData);
      const convertedUser = convertUserData(response.user);
      
      setUser(convertedUser);
      
      toast({
        title: "Registration successful",
        description: "Your account has been created successfully.",
      });
      
      return convertedUser;
    } catch (error: any) {
      console.error('🔐 Registration failed:', error);
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🔐 Logging out...');
      setIsLoading(true);
      
      await authService.logout();
      setUser(null);
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      
      navigate('/auth');
    } catch (error) {
      console.error('🔐 Logout failed:', error);
      // Clear local state even if API call fails
      setUser(null);
      navigate('/auth');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Patient | Doctor>) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      console.log('🔐 Updating profile...');
      
      const patientUpdates = updates as Partial<Patient>;
      const doctorUpdates = updates as Partial<Doctor>;
      const anyUpdates = updates as any; // For fields not in type definitions
      
      const profileUpdates: Partial<UserProfile> = {
        full_name: updates.name,
        date_of_birth: patientUpdates.dateOfBirth?.toISOString().split('T')[0],
        gender: patientUpdates.gender,
        blood_group: anyUpdates.bloodGroup || anyUpdates.bloodType,
        allergies: patientUpdates.allergies || [],
        emergency_contact_name: patientUpdates.emergencyContact?.name,
        emergency_contact_phone: patientUpdates.emergencyContact?.phone,
        emergency_contact_relationship: patientUpdates.emergencyContact?.relationship,
      };

      if (user.role === 'doctor') {
        profileUpdates.specialization = doctorUpdates.specialization;
        profileUpdates.license_number = doctorUpdates.licenseNumber;
        profileUpdates.hospital = doctorUpdates.hospitalAffiliation;
        profileUpdates.experience = anyUpdates.experience;
        profileUpdates.consultation_fee = anyUpdates.consultationFee;
        profileUpdates.available_slots = anyUpdates.availableSlots || [];
      }

      const updatedProfile = await authService.updateProfile(profileUpdates);
      
      // Refresh user data
      const userData = await authService.getCurrentUser();
      const updatedUser = convertUserData(userData);
      setUser(updatedUser);

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      console.error('🔐 Profile update failed:', error);
      toast({
        title: "Update failed",
        description: error.message || "An error occurred while updating your profile",
        variant: "destructive",
      });
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user && authService.isAuthenticated(),
    login,
    register,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
