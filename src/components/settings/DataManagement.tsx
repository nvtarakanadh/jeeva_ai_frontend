import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Trash2, FileText, Lock, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const DataManagement = () => {
  const { logout, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportData = () => {
    toast({
      title: t('settings.dataManagement.dataExportStarted'),
      description: t('settings.dataManagement.exportMessage'),
    });
  };

  const handleDeleteAccount = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteAccount = async () => {
    if (confirmEmail !== user?.email) {
      toast({
        title: 'Email mismatch',
        description: 'Please enter your email address correctly to confirm account deletion.',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const accessToken = localStorage.getItem('access_token');

      const response = await fetch(`${API_BASE_URL}/api/auth/account/delete/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to delete account' }));
        throw new Error(errorData.detail || 'Failed to delete account');
      }

      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted.',
      });

      // Logout and redirect to home
      logout();
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setConfirmEmail('');
    }
  };

  return (
    <>
      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('settings.dataManagement.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.dataManagement.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{t('settings.dataManagement.exportHealthData')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.dataManagement.exportDescription')}</p>
                </div>
              </div>
              <Button onClick={handleExportData} variant="outline">
                {t('settings.dataManagement.exportData')}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg border-destructive/20">
              <div className="flex items-center gap-3">
                <Trash2 className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">{t('settings.dataManagement.deleteAccount')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.dataManagement.deleteDescription')}</p>
                </div>
              </div>
              <Button onClick={handleDeleteAccount} variant="destructive">
                {t('settings.dataManagement.deleteAccount')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and all associated data.
              <br /><br />
              To confirm, please enter your email address: <strong>{user?.email}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="confirm-email">Email Address</Label>
            <Input
              id="confirm-email"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="Enter your email to confirm"
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAccount}
              disabled={isDeleting || confirmEmail !== user?.email}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t('settings.accountActions.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.accountActions.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={logout} variant="outline" className="w-full">
              {t('common.signOut')}
            </Button>
            
            <div className="flex items-start gap-3 p-4 bg-accent-light rounded-lg">
              <AlertTriangle className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <p className="font-medium">{t('settings.accountActions.abdmCompliant')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('settings.accountActions.abdmDescription')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};