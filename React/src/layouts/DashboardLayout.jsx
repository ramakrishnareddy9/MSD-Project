import { Outlet } from 'react-router-dom';
import Navbar from '../Components/Navbar';

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 text-sm text-gray-600">
          © {new Date().getFullYear()} FarmKart. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout;
