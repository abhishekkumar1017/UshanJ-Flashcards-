import React, { useState } from 'react';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  User, 
  MapPin, 
  GraduationCap, 
  ArrowRight, 
  Loader2,
  Feather
} from 'lucide-react';

interface AuthProps {
  onSuccess?: () => void;
  initialMode?: 'login' | 'signup';
}

export const Auth: React.FC<AuthProps> = ({ onSuccess, initialMode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [exam, setExam] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              location,
              preparing_for_exam: exam,
            }
          }
        });
        if (signUpError) throw signUpError;

        // Create profile in profiles table
        if (signUpData.user) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: signUpData.user.id,
            full_name: fullName,
            location,
            preparing_for_exam: exam,
            username: email.split('@')[0],
          });
          if (profileError) {
              console.warn("Could not create profile entry (it might already exist via trigger or schema restriction):", profileError.message);
          }
        }
      }
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-main p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 bg-bg-card p-8 rounded-3xl shadow-2xl border border-border-main"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 flex items-center justify-center text-accent mx-auto">
            <Feather size={48} />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold text-text-main tracking-tight">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-text-secondary font-medium mt-2">
              {isLogin 
                ? 'Your learning journey continues here.' 
                : 'Join the Ushanj Flashcards family of high-achievers.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-semibold border border-red-100"
            >
              {error}
            </motion.div>
          )}

          {!isLogin && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent transition-colors" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-bg-secondary border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all font-medium text-text-main"
                    placeholder="Abhishek Kumar"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Location</label>
                  <div className="relative group">
                    <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent transition-colors" />
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-bg-secondary border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all font-medium text-text-main"
                      placeholder="e.g. Delhi, India"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Target Exam</label>
                  <div className="relative group">
                    <GraduationCap size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent transition-colors" />
                    <input
                      type="text"
                      required
                      value={exam}
                      onChange={(e) => setExam(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-bg-secondary border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all font-medium text-text-main"
                      placeholder="e.g. UPSC"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative group">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent transition-colors" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-bg-secondary border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all font-medium text-text-main"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Password</label>
            <div className="relative group">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent transition-colors" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-bg-secondary border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all font-medium text-text-main"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-accent text-white rounded-xl font-bold text-lg shadow-xl shadow-accent/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>
                {isLogin ? 'Sign In' : 'Create Account'}
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-text-secondary font-bold hover:text-accent transition-colors"
          >
            {isLogin 
              ? "Don't have an account? Sign Up" 
              : "Already have an account? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
