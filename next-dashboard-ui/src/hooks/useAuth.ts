import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'parent';
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get user from cookie
    const userCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('user='));

    if (userCookie) {
      try {
        const userData = JSON.parse(decodeURIComponent(userCookie.substring(5)));
        setUser(userData);
      } catch (error) {
        console.error('Failed to parse user cookie:', error);
      }
    }

    setLoading(false);
  }, []);

  const signOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      
      // Clear cookies
      document.cookie = 'user=; path=/; max-age=0';
      document.cookie = 'userRole=; path=/; max-age=0';
      
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return { user, loading, signOut };
}

export function useRequireAuth(requiredRole?: 'admin' | 'teacher' | 'parent') {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/sign-in');
      } else if (requiredRole && user.role !== requiredRole) {
        // Redirect to appropriate dashboard
        switch (user.role) {
          case 'admin':
            router.push('/admin/dashboard');
            break;
          case 'teacher':
            router.push('/teacher');
            break;
          case 'parent':
            router.push('/parent');
            break;
        }
      }
    }
  }, [user, loading, requiredRole, router]);

  return { user, loading };
}
