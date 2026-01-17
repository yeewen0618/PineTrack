import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Sprout, Mail, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { login } from "../lib/api";


interface LoginPageProps {
  onLogin: () => void; // callback when login succeeds
}

export function LoginPage({ onLogin }: LoginPageProps) {
  // Local state for email, password, error message, and loading flag
  // const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // prevent page refresh
    setError(''); // clear previous error

    // Simple validation: require both fields
    if (!username || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:5001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Invalid credentials');
      }

      const data = await res.json(); // { access_token, token_type }
      console.log(data);
      sessionStorage.setItem("access_token", data.access_token);
      // optional: wipe any old persistent token
      localStorage.removeItem("access_token");


      onLogin();
    } catch (err: any) {
      setError('Login failed. Please check username/password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Full-screen container, centered horizontally and vertically
    <div className="min-h-screen w-screen flex items-center justify-center p-4">
      {/* Limit the max width of the login card */}
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#15803D] to-[#16A34A] rounded-2xl mb-4">
            <Sprout className="text-white" size={32} />
          </div>
          <h1 className="text-3xl text-[#111827] mb-2">
            Welcome to PineTrack
          </h1>
          <p className="text-[#6B7280]">
            AI-Driven Adaptive Scheduling for Pineapple Plantations
          </p>
        </div>

        {/* Login Form */}
        <Card className="p-8 rounded-2xl bg-white shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Email input field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[#111827]">
                Username
              </Label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                  size={18}
                />
                <Input
                  id="username"
                  type="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-12 rounded-xl border-[#E5E7EB] focus:border-[#15803D] focus:ring-[#15803D]"
                  aria-required="true"
                />
              </div>
            </div>

            {/* Password input field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#111827]">
                Password
              </Label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                  size={18}
                />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 rounded-xl border-[#E5E7EB] focus:border-[#15803D] focus:ring-[#15803D]"
                  aria-required="true"
                />
              </div>
            </div>

            {/* Remember me + Forgot password row */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-[#6B7280] cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-[#E5E7EB] text-[#15803D] focus:ring-[#15803D]"
                />
                Remember me
              </label>
              <a
                href="#"
                className="text-[#15803D] hover:text-[#16A34A] transition-colors"
                onClick={(e) => e.preventDefault()}
              >
                Forgot password?
              </a>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full h-12 bg-[#15803D] hover:bg-[#16A34A] text-white rounded-xl"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Demo info text */}
          <div className="mt-6 text-center text-sm text-[#6B7280]">
            Demo credentials: admin / 123456
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-[#6B7280]">
          <p>© 2026 PineTrack. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
