import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Patient, Doctor } from '@/types';
import { toast } from '@/hooks/use-toast';
import { User, Calendar, Phone, Mail, Heart, AlertTriangle, Shield, Briefcase, Award, Building } from 'lucide-react';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const isDoctor = user?.role === 'doctor';
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dateOfBirth: user && 'dateOfBirth' in user && user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : '',
    gender: user && 'gender' in user ? user.gender : '',
    bloodType: user && 'bloodType' in user ? user.bloodType || '' : '',
    allergies: user && 'allergies' in user ? user.allergies?.join(', ') || '' : '',
    emergencyContactName: user && 'emergencyContact' in user ? user.emergencyContact?.name || '' : '',
    emergencyContactPhone: user && 'emergencyContact' in user ? user.emergencyContact?.phone || '' : '',
    emergencyContactRelationship: user && 'emergencyContact' in user ? user.emergencyContact?.relationship || '' : '',
    // Doctor-specific fields
    specialization: isDoctor && 'specialization' in user ? user.specialization || '' : '',
    licenseNumber: isDoctor && 'licenseNumber' in user ? user.licenseNumber || '' : '',
    hospitalAffiliation: isDoctor && 'hospitalAffiliation' in user ? user.hospitalAffiliation || '' : '',
  });

  const handleSave = async () => {
    if (isSaving) return; // Prevent multiple submissions
    
    try {
      setIsSaving(true);
      
      const updates: Partial<Patient | Doctor> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
        gender: formData.gender as 'male' | 'female' | 'other',
        bloodType: formData.bloodType,
        allergies: formData.allergies.split(',').map(a => a.trim()).filter(Boolean),
        emergencyContact: {
          name: formData.emergencyContactName,
          phone: formData.emergencyContactPhone,
          relationship: formData.emergencyContactRelationship,
        },
      };
      
      // Add doctor-specific fields if user is a doctor
      if (isDoctor) {
        (updates as Partial<Doctor>).specialization = formData.specialization;
        (updates as Partial<Doctor>).licenseNumber = formData.licenseNumber;
        (updates as Partial<Doctor>).hospitalAffiliation = formData.hospitalAffiliation;
      }

      await updateProfile(updates);
      setIsEditing(false);
      // Toast message is already handled in updateProfile function
    } catch (error) {
      // Error handling is already done in updateProfile function
      console.error('Profile save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        dateOfBirth: user && 'dateOfBirth' in user && user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : '',
        gender: user && 'gender' in user ? user.gender : '',
        bloodType: user && 'bloodType' in user ? user.bloodType || '' : '',
        allergies: user && 'allergies' in user ? user.allergies?.join(', ') || '' : '',
        emergencyContactName: user && 'emergencyContact' in user ? user.emergencyContact?.name || '' : '',
        emergencyContactPhone: user && 'emergencyContact' in user ? user.emergencyContact?.phone || '' : '',
        emergencyContactRelationship: user && 'emergencyContact' in user ? user.emergencyContact?.relationship || '' : '',
        // Doctor-specific fields
        specialization: user && user.role === 'doctor' && 'specialization' in user ? user.specialization || '' : '',
        licenseNumber: user && user.role === 'doctor' && 'licenseNumber' in user ? user.licenseNumber || '' : '',
        hospitalAffiliation: user && user.role === 'doctor' && 'hospitalAffiliation' in user ? user.hospitalAffiliation || '' : '',
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('profile.title')}</h1>
        <p className="text-muted-foreground">
          {t('profile.description')}
        </p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('profile.personalInformation')}
            </CardTitle>
            <CardDescription>
              {t('profile.personalInformationDescription')}
            </CardDescription>
          </div>
          <Button 
            variant={isEditing ? "outline" : "default"}
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={isSaving}
          >
            {isSaving ? t('profile.saving') : (isEditing ? t('profile.saveChanges') : t('profile.editProfile'))}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('profile.fullName')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('profile.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('profile.phone')}</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">{t('profile.dateOfBirth')}</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">{t('profile.gender')}</Label>
              <Select 
                value={formData.gender} 
                onValueChange={(value) => handleInputChange('gender', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('profile.selectGender')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('profile.male')}</SelectItem>
                  <SelectItem value="female">{t('profile.female')}</SelectItem>
                  <SelectItem value="other">{t('profile.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bloodType">{t('profile.bloodType')}</Label>
              <Select 
                value={formData.bloodType} 
                onValueChange={(value) => handleInputChange('bloodType', value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('profile.selectBloodType')} />
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
          </div>
        </CardContent>
      </Card>

      {/* Medical Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            {t('profile.medicalInformation')}
          </CardTitle>
          <CardDescription>
            {t('profile.medicalInformationDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="allergies">{t('profile.allergies')}</Label>
            <Textarea
              id="allergies"
              value={formData.allergies}
              onChange={(e) => handleInputChange('allergies', e.target.value)}
              disabled={!isEditing}
              placeholder={t('profile.allergiesPlaceholder')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Doctor-specific Information */}
      {isDoctor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Professional Information
            </CardTitle>
            <CardDescription>
              Your professional details and credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => handleInputChange('specialization', e.target.value)}
                  disabled={!isEditing}
                  placeholder="e.g., Cardiology, Pediatrics"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Medical license number"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="hospitalAffiliation">Hospital/Affiliation</Label>
                <Input
                  id="hospitalAffiliation"
                  value={formData.hospitalAffiliation}
                  onChange={(e) => handleInputChange('hospitalAffiliation', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Hospital or clinic name"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Contact - Only for patients */}
      {!isDoctor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('profile.emergencyContact')}
            </CardTitle>
            <CardDescription>
              {t('profile.emergencyContactDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">{t('profile.contactName')}</Label>
                <Input
                  id="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">{t('profile.contactPhone')}</Label>
                <Input
                  id="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactRelationship">{t('profile.relationship')}</Label>
                <Input
                  id="emergencyContactRelationship"
                  value={formData.emergencyContactRelationship}
                  onChange={(e) => handleInputChange('emergencyContactRelationship', e.target.value)}
                  disabled={!isEditing}
                  placeholder={t('profile.relationshipPlaceholder')}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('profile.privacySecurity')}
          </CardTitle>
          <CardDescription>
            {t('profile.privacySecurityDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-accent-light rounded-lg">
              <Shield className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <p className="font-medium">{t('profile.abdmCompliant')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('profile.abdmCompliantDescription')}
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>• {t('profile.dataEncrypted')}</p>
              <p>• {t('profile.accessControlled')}</p>
              <p>• {t('profile.revokeAccess')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;