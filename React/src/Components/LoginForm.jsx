import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ROLE_OPTIONS = [
  { label: 'Customer', value: 'customer' },
  { label: 'Farmer', value: 'farmer' },
  { label: 'Transporter', value: 'transporter' },
  { label: 'Community', value: 'community' },
  { label: 'Business', value: 'business' },
  { label: 'Admin', value: 'admin' },
];

const DEFAULTS = {
  customer: { username: 'customer', password: 'customer123' },
  farmer: { username: 'farmer', password: 'farmer123' },
  transporter: { username: 'transporter', password: 'transport123' },
  community: { username: 'community', password: 'community123' },
  business: { username: 'business', password: 'business123' },
  admin: { username: 'admin', password: 'admin123' }
};

const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('customer');
  const [error, setError] = useState('');

  const handleAutoFill = (role) => {
    const creds = DEFAULTS[role];
    setUsername(creds.username);
    setPassword(creds.password);
    setSelectedRole(role);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const res = login(username, password);
    if (!res.success) {
      setError(res.error);
      return;
    }
    const role = res.role;
    const from = location.state?.from?.pathname || `/dashboard/${role}`;
    navigate(from, { replace: true });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700">Username</label>
        <input className="input-field mt-1" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input type="password" className="input-field mt-1" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Select Role</label>
        <select className="input-field mt-1" value={selectedRole} onChange={(e) => handleAutoFill(e.target.value)}>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">Selecting a role auto-fills default credentials.</p>
      </div>
      <button type="submit" className="btn-primary w-full">Login</button>
      <div className="text-xs text-gray-500">
        <p><b>Default credentials:</b></p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
          {Object.entries(DEFAULTS).map(([role, val]) => (
            <li key={role} className="bg-gray-50 border rounded p-2">
              <span className="capitalize font-medium">{role}</span>: {val.username} / {val.password}
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
};

export default LoginForm;
