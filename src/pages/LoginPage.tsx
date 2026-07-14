import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { Button, TextField, Banner, Logo } from '../components';

export function LoginPage() {
  const { status, login } = useAuth();
  const [email, setEmail] = useState('admin@campus.edu.in');
  // Matches the backend seed_demo password (campus123) so the demo login works
  // out of the box against a seeded local/Docker backend.
  const [password, setPassword] = useState('campus123');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  if (status === 'authed') return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-dark px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Logo size={56} />
          </div>
          <h1 className="text-h1 text-white">AI Campus OS</h1>
          <p className="mt-1 text-body text-navy-soft">Admin Console — manage every record in one place</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl bg-surface p-6 shadow-2xl">
          {error && <Banner tone="danger" title="Couldn't log in" message={error} />}
          <TextField label="Email" type="email" value={email} onChangeText={setEmail} placeholder="admin@campus.edu.in" />
          <TextField label="Password" type="password" value={password} onChangeText={setPassword} placeholder="••••••••" />
          <Button label="Log in" type="submit" full loading={loading} />
          <p className="text-center text-caption text-ink-soft">
            Demo login prefilled — admin@campus.edu.in / campus123
          </p>
        </form>
      </div>
    </div>
  );
}
