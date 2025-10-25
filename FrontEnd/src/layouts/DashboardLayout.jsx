import { Outlet } from 'react-router-dom';
import { Box, Container, Typography } from '@mui/material';
import { FaLeaf, FaHeart } from 'react-icons/fa';

const DashboardLayout = () => {
  return (
    <Box className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Main Content */}
      <Box component="main" className="flex-grow">
        <Outlet />
      </Box>
      
      {/* Enhanced Footer */}
      <Box
        component="footer"
        className="bg-white border-t border-gray-200 py-6 mt-auto"
      >
        <Container maxWidth="lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo and Copyright */}
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-2 rounded-lg">
                <FaLeaf className="text-white text-lg" />
              </div>
              <Typography variant="body2" className="text-gray-600">
                © {new Date().getFullYear()} <span className="font-semibold text-green-600">FarmKart</span>. All rights reserved.
              </Typography>
            </div>
            
            {/* Made with Love */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Made with</span>
              <FaHeart className="text-red-500 animate-pulse" />
              <span>for farmers and consumers</span>
            </div>
          </div>
        </Container>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
