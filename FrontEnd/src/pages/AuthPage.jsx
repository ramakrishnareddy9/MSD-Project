import { useLocation } from 'react-router-dom';
import Login from './Login.jsx';
import Signup from './Signup.jsx';

const AuthPage = () => {
  const location = useLocation();
  
  // Simply show Login or Signup based on the route - no tabs, no changes
  return location.pathname === '/signup' ? <Signup /> : <Login />;
};

export default AuthPage;
