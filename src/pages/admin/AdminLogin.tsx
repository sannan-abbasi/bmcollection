import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/lib/toast';
import { supabase, ADMIN_EMAIL } from '@/lib/supabase';
import { useSeo } from '@/lib/seo';
import { Lock, ArrowLeft, UserPlus } from 'lucide-react';

export default function AdminLogin() {
  const { notify } = useToast();

  useSeo({
    title: 'Admin Sign In',
    description: 'BM Collection store administration.',
    path: '/admin',
    noindex: true,
  });
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (email.trim().toLowerCase() !== ADMIN_EMAIL.trim().toLowerCase()) {
          setLoading(false);
          notify('This admin panel is restricted. Only the authorized admin email can register.', 'error');
          return;
        }

        const { error } = await supabase.auth.signUp({ email, password });
        setLoading(false);
        
        if (error) {
          notify(error.message, 'error');
        } else {
          notify('Account created successfully. You can now sign in.', 'success');
          setMode('signin');
        }
        return;
      }

      // Sign In Flow
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        setLoading(false);
        notify(error.message || 'Invalid credentials. Please try again.', 'error');
        return;
      }

      if (data?.session) {
        notify('Welcome back, admin.', 'success');
        // Force a clean redirect to the admin dashboard route
        window.location.href = '/admin/dashboard';
      } else {
        setLoading(false);
        notify('Login succeeded, but no session was returned.', 'error');
      }
    } catch (err: unknown) {
      setLoading(false);
      console.error('Unexpected login error:', err);
      notify('An unexpected error occurred. Check console for details.', 'error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-20">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 text-sm text-stone-500 hover:text-gold transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to store
        </Link>

        <div className="bg-white rounded-2xl premium-shadow p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-50 mb-4">
              {mode === 'signin' ? <Lock className="h-6 w-6 text-gold" /> : <UserPlus className="h-6 w-6 text-gold" />}
            </div>
            <h1 className="font-serif text-3xl text-ink">
              {mode === 'signin' ? 'Admin Access' : 'Create Admin Account'}
            </h1>
            <p className="text-sm text-stone-500 mt-2">
              {mode === 'signin' ? 'Sign in to manage your store' : 'Register with the authorized admin email'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-stone-500 mb-2 block">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="premium-input"
                placeholder="admin@email.com"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-stone-500 mb-2 block">Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="premium-input"
                placeholder="••••••••"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-cream py-4 text-sm uppercase tracking-widest hover:bg-gold transition-all disabled:opacity-50"
            >
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            {mode === 'signin' ? (
              <p className="text-sm text-stone-500">
                First time?{' '}
                <button onClick={() => setMode('signup')} className="text-gold hover:text-gold-dark font-medium transition-colors">
                  Create admin account
                </button>
              </p>
            ) : (
              <p className="text-sm text-stone-500">
                Already have an account?{' '}
                <button onClick={() => setMode('signin')} className="text-gold hover:text-gold-dark font-medium transition-colors">
                  Sign in instead
                </button>
              </p>
            )}
          </div>

          {mode === 'signup' && (
            <p className="mt-4 text-xs text-stone-400 text-center leading-relaxed">
              Only the authorized admin email ({ADMIN_EMAIL}) can create an account. This keeps your store secure.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}