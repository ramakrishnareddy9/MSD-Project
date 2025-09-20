import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();

  const navLinkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to={user ? `/dashboard/${user.role}` : '/'} className="text-xl font-bold text-primary-700">
            FarmKart
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-600 hidden sm:block">Role: <b className="capitalize">{user.role}</b></span>
                <NavLink to={`/dashboard/${user.role}`} className={navLinkClass}>
                  Dashboard
                </NavLink>
                <button className="btn-secondary" onClick={logout}>Logout</button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>Login</NavLink>
                <NavLink to="/signup" className={navLinkClass}>Signup</NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
