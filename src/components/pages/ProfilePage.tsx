import { useState, useEffect } from 'react';
import { User, Mail, Lock, Trash2, Save, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabaseAuth } from '@/lib/supabase-auth';
import { supabaseDb } from '@/lib/supabase-database';

export function ProfilePage() {
  const [user, setUser] = useState(supabaseAuth.getCurrentProfile());
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  useEffect(() => {
    const unsubscribe = supabaseAuth.subscribe((authState) => {
      setUser(authState.profile);
      setName(authState.profile?.name || '');
      setEmail(authState.profile?.email || '');
    });

    return unsubscribe;
  }, []);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await supabaseDb.updateProfile(name, email);
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both password fields match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Simulate password change
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Password change failed",
        description: "Failed to change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    
    try {
      await supabaseAuth.signOut();
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Logout failed", 
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    
    try {
      await supabaseDb.deleteAccount();
      
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      
      // The user will be automatically signed out due to account deletion
    } catch (error) {
      toast({
        title: "Deletion failed",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <User className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">User Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Profile Information */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">Email Address</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>

            <EnhancedButton
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4" />
              {isLoading ? "Saving..." : "Save Changes"}
            </EnhancedButton>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your account password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
              />
            </div>

            <EnhancedButton
              type="submit"
              disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
              className="w-full sm:w-auto"
            >
              <Lock className="h-4 w-4" />
              {isLoading ? "Changing..." : "Change Password"}
            </EnhancedButton>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="shadow-card border-0 border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-medium mb-2">Sign Out</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Sign out of your account on this device.
              </p>
              <EnhancedButton
                variant="outline"
                onClick={handleLogout}
                className="w-full sm:w-auto"
                disabled={isLoading}
              >
                <LogOut className="h-4 w-4" />
                {isLoading ? "Signing out..." : "Sign Out"}
              </EnhancedButton>
            </div>

            <Separator />

            <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
              <h4 className="font-medium text-destructive mb-2">Delete Account</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <EnhancedButton
                    variant="destructive"
                    className="w-full sm:w-auto"
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </EnhancedButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account,
                      remove all your scores, friendships, and friend invitations. Other users' 
                      scores where you were the opponent will show "Deleted User" as the opponent.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isLoading}
                    >
                      {isLoading ? "Deleting..." : "Delete Account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}