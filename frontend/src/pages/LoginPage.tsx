import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Sprout, Mail, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

interface LoginPageProps {
  onLogin: () => void; // callback when login succeeds
}

export function LoginPage({ onLogin }: LoginPageProps) {
  // Local state for email, password, error message, and loading flag
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // prevent page refresh
    setError(''); // clear previous error

    // Simple validation: require both fields
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true); // show "Signing in..." state

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      onLogin(); // call the onLogin callback to indicate success
    }, 1000);
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
              <Label htmlFor="email" className="text-[#111827]">
                Email Address
              </Label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                  size={18}
                />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
            Demo credentials: Any email/password combination
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-[#6B7280]">
          <p>© 2025 PineTrack. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
