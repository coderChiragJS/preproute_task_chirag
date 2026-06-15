import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, PenLine, Clock, Copy, Users, Building2,
  UserCircle, Trash2, HelpCircle, Trophy, MessageCircle,
  Bell, Settings, ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import logoImg from '../assets/preproute lofo.png';

const NAV_ICONS = [
  TrendingUp, PenLine, Clock, Copy, Users, Building2,
  UserCircle, Trash2, HelpCircle, Trophy, MessageCircle,
  Bell, Settings,
];

interface LayoutProps {
  children: React.ReactNode;
  breadcrumb?: React.ReactNode;
  headerRight?: React.ReactNode;
}

export default function Layout({ children, breadcrumb, headerRight }: LayoutProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { clearAuth(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <header style={{
        height: 64, borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', flexShrink: 0, background: '#fff',
      }}>
        <img src={logoImg} alt="Preproute" style={{ height: 32, objectFit: 'contain' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <button className="btn btn-ghost" style={{ padding: 8, borderRadius: '50%' }}>
              <Bell size={20} color="#6B7280" />
            </button>
            <span style={{
              position: 'absolute', top: 6, right: 6,
              width: 8, height: 8, background: '#22C55E',
              borderRadius: '50%', border: '1.5px solid #fff',
            }} />
          </div>

          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={handleLogout}
            title="Click to sign out"
          >
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: '#FEF3C7', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 15, fontWeight: 600, color: '#92400E',
              border: '2px solid #E5E7EB',
            }}>
              {(user?.userId?.[0] ?? 'A').toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>
                {user?.userId ?? 'Admin'}
              </p>
              <p style={{ fontSize: 12, color: '#6B7280' }}>Admin</p>
            </div>
            <ChevronDown size={14} color="#9CA3AF" />
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <aside style={{
          width: 44, borderRight: '1px solid #E5E7EB',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', paddingTop: 16, gap: 4,
          background: '#fff', flexShrink: 0,
        }}>
          {NAV_ICONS.map((Icon, i) => (
            <button
              key={i}
              className="btn btn-ghost"
              style={{ padding: 8, borderRadius: 8, width: 36, height: 36 }}
            >
              <Icon size={17} color="#9CA3AF" />
            </button>
          ))}
        </aside>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {(breadcrumb || headerRight) && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 28px', borderBottom: '1px solid #F3F4F6', flexShrink: 0,
            }}>
              <div style={{ fontSize: 13, color: '#6B7280' }}>{breadcrumb}</div>
              <div>{headerRight}</div>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
