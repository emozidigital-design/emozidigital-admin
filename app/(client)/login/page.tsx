"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Mail, Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

function LoginContent() {
  const [mode, setMode] = useState<'magic' | 'password'>('magic');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verifying, setVerifying] = useState(false);
  
  useEffect(() => {
    const token = searchParams?.get('token');
    if (token) {
      verifyToken(token);
    }
  }, [searchParams]);

  const verifyToken = async (token: string) => {
    setVerifying(true);
    setError('');
    try {
      const res = await fetch('/api/client/auth/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Invalid or expired link');
        setVerifying(false);
        return;
      }
      
      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      } else if (data.hasPassword) {
        router.push('/client/dashboard');
      } else {
        router.push('/client/setup');
      }
    } catch (err) {
      setError('Something went wrong verifying your link');
      setVerifying(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await fetch('/api/client/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send magic link');
      }
      
      setSuccess('Check your email — link expires in 24 hours');
      setEmail('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/client/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Invalid email or password');
      }
      
      // If the backend doesn't handle redirect, we push
      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      } else {
        router.push('/client/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#003434]" />
          <p className="text-gray-600 font-medium">Verifying your link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Left Side - Brand & Animation */}
      <div className="md:w-1/2 bg-[#003434] relative overflow-hidden flex flex-col justify-center p-8 md:p-16 lg:p-24">
        {/* Subtle Background Animation */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}></div>
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[#003434]/50 to-[#a3e635]/10 mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 flex flex-col h-full justify-between max-w-lg">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
              Emozi Digital
            </h1>
            <p className="text-[#a3e635] text-xl font-medium tracking-wide">
              Client Portal
            </p>
          </div>
          
          <div className="mt-20 md:mt-0">
            <p className="text-gray-300 text-lg md:text-xl leading-relaxed">
              Your dedicated space for managing campaigns, viewing analytics, and collaborating directly with our team.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="md:w-1/2 flex items-center justify-center p-8 md:p-16 relative">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
            <p className="text-gray-500">Sign in to access your dashboard</p>
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-gray-100 rounded-lg mb-8">
            <button
              onClick={() => { setMode('magic'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                mode === 'magic' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Magic Link
            </button>
            <button
              onClick={() => { setMode('password'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                mode === 'password' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Password
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-100 flex items-start text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-100 flex items-start text-green-700 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Forms */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003434] focus:border-[#003434] transition-colors sm:text-sm text-gray-900"
                  placeholder="name@company.com"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (mode === 'magic') handleMagicLink(e);
                      else if (mode === 'password' && password) handlePasswordLogin(e);
                    }
                  }}
                />
              </div>
            </div>

            {mode === 'password' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <a href="/client/reset-password" className="text-sm font-medium text-[#003434] hover:text-[#004a4a]">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003434] focus:border-[#003434] transition-colors sm:text-sm text-gray-900"
                    placeholder="••••••••"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handlePasswordLogin(e);
                      }
                    }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={mode === 'magic' ? handleMagicLink : handlePasswordLogin}
              disabled={loading}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-[#003434] bg-[#a3e635] hover:bg-[#94d826] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#a3e635] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'magic' ? 'Send magic link' : 'Sign in'}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              This portal is for approved Emozi Digital clients only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientLogin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#003434]" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
