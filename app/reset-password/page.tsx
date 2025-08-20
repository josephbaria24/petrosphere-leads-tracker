'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { PasswordField } from './PasswordField'; // adjust path as needed

export default function ResetPasswordPage() {
  const [prevPassword, setPrevPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showPrev, setShowPrev] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const router = useRouter();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery session active');
      }
    });
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (newPassword !== confirmPassword) {
      setMessage('❌ New passwords do not match.');
      return;
    }
  
    // Get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();
  
    const email = session?.user?.email;
    if (!email) {
      setMessage('❌ Cannot retrieve user email.');
      return;
    }
  
    // Reauthenticate using email + previous password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: prevPassword,
    });
  
    if (signInError) {
      setMessage('❌ Incorrect previous password.');
      return;
    }
  
    // Proceed to update the password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
  
    if (error) {
      setMessage(`❌ ${error.message}`);
    } else {
      setMessage('✅ Password updated. Redirecting to login...');
      setTimeout(() => router.push('/login'), 3000);
    }
  };
  



  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold text-center">Reset Your Password</h2>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <PasswordField
              id="prev-password"
              label="Previous Password"
              value={prevPassword}
              onChange={(e) => setPrevPassword(e.target.value)}
              show={showPrev}
              setShow={setShowPrev}
            />
            <PasswordField
              id="new-password"
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              show={showNew}
              setShow={setShowNew}
            />
            <PasswordField
              id="confirm-password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              show={showConfirm}
              setShow={setShowConfirm}
            />
            <Button type="submit" className="w-full">
              Update Password
            </Button>
          </form>
          {message && <p className="text-sm text-center text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
