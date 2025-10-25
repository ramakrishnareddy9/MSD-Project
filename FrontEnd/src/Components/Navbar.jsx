import { Link, NavLink, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, Container, Chip } from '@mui/material';
import { FaLeaf, FaUser } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <AppBar 
      position="sticky" 
      className="bg-white/95 backdrop-blur-md shadow-md border-b border-gray-200"
      elevation={0}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters className="min-h-[70px] flex justify-between items-center">
          {/* Logo */}
          <Link 
            to={user ? `/dashboard/${user.role}` : '/'}
            className="flex items-center gap-2 no-underline group"
          >
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-2 rounded-lg group-hover:scale-110 transition-transform duration-200">
              <FaLeaf className="text-white text-xl" />
            </div>
            <Typography
              variant="h6"
              className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-800"
            >
              FarmKart
            </Typography>
          </Link>
          
          {/* Actions */}
          <Box className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                  <FaUser className="text-green-600 text-sm" />
                  <span className="text-sm font-medium text-green-700 capitalize">{user.role}</span>
                </div>
                <Button
                  component={NavLink}
                  to={`/dashboard/${user.role}`}
                  variant={isActive(`/dashboard/${user.role}`) ? 'contained' : 'outlined'}
                  className={`${
                    isActive(`/dashboard/${user.role}`)
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                      : 'border-green-500 text-green-600 hover:bg-green-50'
                  } font-semibold rounded-lg px-6 py-2 transition-all duration-200 transform hover:scale-105`}
                  size="small"
                >
                  Dashboard
                </Button>
                <Button
                  variant="outlined"
                  onClick={logout}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-semibold rounded-lg px-6 py-2 transition-all duration-200"
                  size="small"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  component={NavLink}
                  to="/login"
                  variant={isActive('/login') ? 'contained' : 'text'}
                  className={`${
                    isActive('/login')
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  } font-semibold rounded-lg px-6 py-2 transition-all duration-200`}
                  size="small"
                >
                  Login
                </Button>
                <Button
                  component={NavLink}
                  to="/signup"
                  variant="contained"
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 font-semibold rounded-lg px-6 py-2 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                  size="small"
                >
                  Sign Up
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
