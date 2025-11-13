import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'patient' as UserRole,
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    allergies: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    specialization: '',
    licenseNumber: '',
    hospitalAffiliation: '',
  });
  const navigate = useNavigate();
  const { login, register, isLoading } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast({
        title: "Missing email",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsResetLoading(true);
    try {
      // Add a safety timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request is taking too long. This might be a CORS issue. Please check backend configuration.')), 65000);
      });
      
      const result = await Promise.race([
        authService.requestPasswordReset(forgotPasswordEmail),
        timeoutPromise
      ]) as { message: string; reset_link?: string; note?: string };

      // Show reset link if email might not be received
      let description = "Check your email for password reset instructions.";
      if (result.reset_link) {
        description += `\n\nIf email is not received, use this link:\n${result.reset_link}`;
        // Also log to console for easy copy-paste
        console.log('🔗 Password Reset Link:', result.reset_link);
        console.log('💡 Copy the link above if email is not received');
      }

      toast({
        title: "Reset email sent",
        description: description,
        duration: 10000, // Show longer so user can copy link
      });
      
      setIsForgotPasswordOpen(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      console.error('🔧 Password reset error:', error);
      toast({
        title: "Reset failed",
        description: error.message || "Failed to send reset email. Please check if CORS is configured on the backend.",
        variant: "destructive",
      });
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast({
        title: "Missing information",
        description: "Please fill in email and password.",
        variant: "destructive",
      });
      return;
    }

    try {
      const loggedInUser = await login(formData.email, formData.password, formData.role);
      
      // Navigate based on actual user role from the response
      setTimeout(() => {
        if (loggedInUser.role === 'doctor') {
          navigate('/doctor/dashboard');
        } else {
          navigate('/dashboard');
        }
      }, 500);
    } catch (error: any) {
      // Error is already handled in AuthContext
      console.error('🔧 Auth: Login failed', error);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.name) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Validate doctor-specific fields
    if (formData.role === 'doctor' && (!formData.licenseNumber || !formData.specialization)) {
      toast({
        title: "Missing information",
        description: "Please fill in license number and specialization for doctor registration.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Helper to convert empty strings to undefined
      const undefinedIfEmpty = (value: string) => (value === '' ? undefined : value);
      
      const userData = {
        email: formData.email,
        name: formData.name,
        phone: undefinedIfEmpty(formData.phone),
        role: formData.role,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
        gender: undefinedIfEmpty(formData.gender) as 'male' | 'female' | 'other' | undefined,
        bloodGroup: undefinedIfEmpty(formData.bloodGroup),
        allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()).filter(a => a) : [],
        emergencyContact: formData.emergencyContactName ? {
          name: formData.emergencyContactName,
          phone: undefinedIfEmpty(formData.emergencyContactPhone),
          relationship: undefinedIfEmpty(formData.emergencyContactRelationship),
        } : undefined,
        ...(formData.role === 'doctor' ? {
          specialization: undefinedIfEmpty(formData.specialization),
          licenseNumber: undefinedIfEmpty(formData.licenseNumber),
          hospital: undefinedIfEmpty(formData.hospitalAffiliation),
        } : {}),
      };

      const registeredUser = await register(userData, formData.password);
      
      // Navigate based on actual user role from the response
      setTimeout(() => {
        if (registeredUser.role === 'doctor') {
          navigate('/doctor/dashboard');
        } else {
          navigate('/dashboard');
        }
      }, 500);
    } catch (error: any) {
      // Error is already handled in AuthContext
      console.error('🔧 Auth: Registration failed', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {isLogin ? 'Login to Jeeva.AI' : 'Join Jeeva.AI'}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin 
              ? 'Enter your credentials to access your health records' 
              : 'Create your account to get started with AI-powered healthcare'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
              />
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select value={formData.role} onValueChange={(value: UserRole) => handleInputChange('role', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient">Patient</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="Your phone number"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>

                {formData.role === 'patient' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bloodGroup">Blood Group</Label>
                      <Select value={formData.bloodGroup} onValueChange={(value) => handleInputChange('bloodGroup', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select blood group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="allergies">Allergies</Label>
                      <Textarea
                        id="allergies"
                        placeholder="List any known allergies"
                        value={formData.allergies}
                        onChange={(e) => handleInputChange('allergies', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </>
                )}

                {formData.role === 'doctor' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="licenseNumber">Medical License Number *</Label>
                      <Input
                        id="licenseNumber"
                        placeholder="Enter your license number"
                        value={formData.licenseNumber}
                        onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="specialization">Specialization *</Label>
                      <Input
                        id="specialization"
                        placeholder="e.g., Cardiology, Pediatrics"
                        value={formData.specialization}
                        onChange={(e) => handleInputChange('specialization', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hospitalAffiliation">Hospital Affiliation</Label>
                      <Input
                        id="hospitalAffiliation"
                        placeholder="Your hospital or clinic"
                        value={formData.hospitalAffiliation}
                        onChange={(e) => handleInputChange('hospitalAffiliation', e.target.value)}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'Please wait...' : (isLogin ? 'Login' : 'Create Account')}
            </Button>
          </form>

          {isLogin && (
            <div className="text-center">
              <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
                <DialogTrigger asChild>
                  <Button variant="link" className="text-sm">
                    Forgot your password?
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>
                      Enter your email address and we'll send you a link to reset your password.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resetEmail">Email</Label>
                      <Input
                        id="resetEmail"
                        type="email"
                        placeholder="your@email.com"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={handleForgotPassword}
                      disabled={isResetLoading}
                      className="w-full"
                    >
                      {isResetLoading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          <div className="text-center">
            <Button 
              variant="link" 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Login"
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;