import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { login } from '../api/auth';
import { getApiErrorMessage } from '../api/client';
import { useAuthStore } from '../store/authStore';
import logoImg from '../assets/preproute lofo.png';

const schema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await login(data.userId, data.password);
      const { token, user } = res.data.data;
      setAuth(token, user);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Invalid credentials. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <div style={{
        flex: 1, background: '#EEF2FF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <span style={{ position: 'absolute', top: '20%', left: '15%', fontSize: 24, color: '#C7D2FE', opacity: 0.8 }}>+</span>
        <span style={{ position: 'absolute', top: '35%', right: '20%', width: 12, height: 12, border: '2px solid #C7D2FE', borderRadius: '50%', display: 'block' }} />
        <span style={{ position: 'absolute', bottom: '25%', right: '25%', fontSize: 24, color: '#C7D2FE', opacity: 0.8 }}>+</span>

        <svg width="280" height="280" viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="40" y="190" width="200" height="8" rx="4" fill="#94A3B8" />
          <rect x="50" y="130" width="180" height="60" rx="8" fill="#CBD5E1" />
          <rect x="55" y="135" width="170" height="50" rx="6" fill="#E2E8F0" />
          <rect x="70" y="145" width="60" height="4" rx="2" fill="#94A3B8" opacity="0.5" />
          <rect x="70" y="154" width="40" height="4" rx="2" fill="#94A3B8" opacity="0.3" />
          <ellipse cx="180" cy="120" rx="22" ry="22" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="2" />
          <rect x="170" y="80" width="20" height="25" rx="3" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="2" />
          <rect x="165" y="72" width="30" height="10" rx="5" fill="#93C5FD" />
          <circle cx="173" cy="118" r="3" fill="#1E40AF" />
          <circle cx="187" cy="118" r="3" fill="#1E40AF" />
          <path d="M173 127 Q180 133 187 127" stroke="#1E40AF" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M158 125 Q148 135 155 155" stroke="#93C5FD" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M202 125 Q212 135 205 155" stroke="#93C5FD" strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x="168" y="140" width="10" height="50" rx="5" fill="#93C5FD" />
          <rect x="182" y="140" width="10" height="50" rx="5" fill="#93C5FD" />
          <ellipse cx="173" cy="192" rx="12" ry="6" fill="#60A5FA" />
          <ellipse cx="187" cy="192" rx="12" ry="6" fill="#60A5FA" />
        </svg>
      </div>

      <div style={{
        width: 520, background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 60px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <img src={logoImg} alt="Preproute" style={{ height: 36, marginBottom: 28, objectFit: 'contain' }} />

          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Login</h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28 }}>
            Use your company provided Login credentials
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="lbl">User ID</label>
              <input {...register('userId')} className="inp" placeholder="Enter User ID" autoComplete="username" />
              {errors.userId && <p className="err">{errors.userId.message}</p>}
            </div>

            <div>
              <label className="lbl">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('password')}
                  type={showPwd ? 'text' : 'password'}
                  className="inp"
                  placeholder="Enter Password"
                  style={{ paddingRight: 40 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9CA3AF',
                  }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="err">{errors.password.message}</p>}
            </div>

            <div style={{ textAlign: 'right', marginTop: -12 }}>
              <span style={{ fontSize: 13, color: '#5B6AEE', cursor: 'pointer' }}>Forgot password?</span>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '12px 20px', borderRadius: 8, fontSize: 15, marginTop: 4 }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner" style={{ width: 16, height: 16 }} /> Logging in…
                </span>
              ) : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
