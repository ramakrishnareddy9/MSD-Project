import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FaLeaf,
  FaStar,
  FaStarHalf,
  FaInstagram,
  FaFacebook,
  FaTwitter,
  FaYoutube,
  FaArrowRight,
  FaTruck,
  FaShield,
  FaUsers,
  FaHeart,
  FaPlay
} from "react-icons/fa6";

function FarmKartLanding() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const routeForRole = (role) => {
    switch (role) {
      case 'customer': return '/customer';
      case 'farmer': return '/farmer';
      case 'business': return '/business';
      case 'restaurant': return '/restaurant';
      case 'delivery_large': return '/delivery-large';
      case 'delivery_small': return '/delivery-small';
      case 'delivery': return '/delivery-large';
      case 'admin': return '/admin';
      case 'community': return '/dashboard/community';
      default: return '/';
    }
  };

  const handleGetStarted = () => {
    if (user) {
      navigate(routeForRole(user.role));
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2 text-2xl font-bold text-green-600 hover:text-green-700 transition-colors">
              <FaLeaf />
              <span>FarmKart</span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-700 hover:text-green-600 font-medium transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-green-600 after:transition-all hover:after:w-full">Features</a>
              <a href="#how-it-works" className="text-gray-700 hover:text-green-600 font-medium transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-green-600 after:transition-all hover:after:w-full">How it Works</a>
              <a href="#farmers" className="text-gray-700 hover:text-green-600 font-medium transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-green-600 after:transition-all hover:after:w-full">Our Farmers</a>
              <a href="#contact" className="text-gray-700 hover:text-green-600 font-medium transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-green-600 after:transition-all hover:after:w-full">Contact</a>
            </nav>

            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <span className="hidden sm:inline text-gray-600 font-medium">Welcome, {user.role}!</span>
                  <button className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg" onClick={() => navigate(routeForRole(user.role))}>
                    Dashboard
                  </button>
                  <button className="px-6 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all duration-200" onClick={logout}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button className="px-6 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all duration-200" onClick={() => navigate('/login')}>
                    Log in
                  </button>
                  <button className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg" onClick={() => navigate('/signup')}>
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                Fresh from <span className="text-green-600">Farm</span> to Your <span className="text-green-600">Table</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Connect directly with local farmers and get the freshest produce delivered to your doorstep. 
                Support sustainable farming while enjoying premium quality fruits and vegetables.
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="px-8 py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2" onClick={handleGetStarted}>
                  Get Started <FaArrowRight />
                </button>
                <button className="px-8 py-4 bg-white text-green-600 font-semibold rounded-lg border-2 border-green-600 hover:bg-green-50 transition-all duration-200 flex items-center gap-2" onClick={() => window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank')}>
                  <FaPlay /> Watch Demo
                </button>
              </div>
              <div className="grid grid-cols-3 gap-8 pt-8 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">10,000+</div>
                  <div className="text-sm text-gray-600 mt-1">Happy Customers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">500+</div>
                  <div className="text-sm text-gray-600 mt-1">Partner Farmers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">50+</div>
                  <div className="text-sm text-gray-600 mt-1">Cities Served</div>
                </div>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              <img 
                src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&h=600&fit=crop&q=80" 
                alt="Fresh vegetables and fruits"
                className="relative rounded-2xl shadow-2xl w-full h-auto object-cover transform group-hover:scale-[1.02] transition-transform duration-300"
              />
              <div className="absolute -bottom-6 -right-6 bg-gradient-to-br from-green-600 to-green-700 text-white p-6 rounded-xl shadow-2xl hidden md:block backdrop-blur-sm bg-opacity-95">
                <div className="text-4xl font-bold">100%</div>
                <div className="text-sm font-medium">Fresh & Organic</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Why Choose FarmKart?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-gradient-to-br from-green-50 to-white p-8 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-green-600 text-4xl mb-4">
                <FaTruck />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Fast Delivery</h3>
              <p className="text-gray-600">Get fresh produce delivered to your doorstep within 24 hours of harvest</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-blue-600 text-4xl mb-4">
                <FaShield />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Quality Assured</h3>
              <p className="text-gray-600">All products are quality checked and come with freshness guarantee</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-white p-8 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-purple-600 text-4xl mb-4">
                <FaUsers />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Direct from Farmers</h3>
              <p className="text-gray-600">Connect directly with local farmers and support sustainable agriculture</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-white p-8 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-red-600 text-4xl mb-4">
                <FaHeart />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Community Driven</h3>
              <p className="text-gray-600">Join a community that cares about fresh food and local farming</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">How FarmKart Works</h2>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="bg-white p-8 rounded-xl shadow-lg text-center relative">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Browse & Select</h3>
              <p className="text-gray-600">Explore fresh produce from local farmers in your area</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg text-center relative">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Order Online</h3>
              <p className="text-gray-600">Place your order with just a few clicks</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg text-center relative">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Fast Delivery</h3>
              <p className="text-gray-600">Get fresh produce delivered to your doorstep</p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Farmers Section */}
      <section id="farmers" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Meet Our Partner Farmers</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group">
              <div className="relative overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1595855759920-86582396756a?w=600&h=400&fit=crop&q=80"
                  alt="Farmer Ramesh Patel"
                  className="w-full h-64 object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ramesh Patel</h3>
                <p className="text-green-600 font-medium mb-3">Organic Vegetables Specialist</p>
                <div className="flex items-center gap-1 text-yellow-500 mb-2">
                  <FaStar /> <FaStar /> <FaStar /> <FaStar /> <FaStarHalf />
                  <span className="text-gray-600 text-sm ml-2">4.5 (120 reviews)</span>
                </div>
                <p className="text-gray-600">📍 Punjab, India</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group">
              <div className="relative overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&h=400&fit=crop&q=80"
                  alt="Farmer Meera Sharma"
                  className="w-full h-64 object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Meera Sharma</h3>
                <p className="text-green-600 font-medium mb-3">Seasonal Fruits Expert</p>
                <div className="flex items-center gap-1 text-yellow-500 mb-2">
                  <FaStar /> <FaStar /> <FaStar /> <FaStar /> <FaStar />
                  <span className="text-gray-600 text-sm ml-2">5.0 (95 reviews)</span>
                </div>
                <p className="text-gray-600">📍 Maharashtra, India</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group">
              <div className="relative overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&h=400&fit=crop&q=80"
                  alt="Farmer Suresh Kumar"
                  className="w-full h-64 object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Suresh Kumar</h3>
                <p className="text-green-600 font-medium mb-3">Dairy & Grains Producer</p>
                <div className="flex items-center gap-1 text-yellow-500 mb-2">
                  <FaStar /> <FaStar /> <FaStar /> <FaStar /> <FaStar />
                  <span className="text-gray-600 text-sm ml-2">4.8 (87 reviews)</span>
                </div>
                <p className="text-gray-600">📍 Haryana, India</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to Experience Fresh?</h2>
          <p className="text-xl text-green-100 mb-8">Join thousands of customers who trust FarmKart for their daily fresh produce needs</p>
          <button className="px-8 py-4 bg-white text-green-600 font-semibold rounded-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 shadow-xl flex items-center gap-2 mx-auto" onClick={handleGetStarted}>
            Start Shopping Now <FaArrowRight />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-gray-300 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 text-2xl font-bold text-green-500 mb-4">
                <FaLeaf />
                <span>FarmKart</span>
              </div>
              <p className="text-gray-400 mb-4">Connecting you with fresh, local produce directly from farmers. Supporting sustainable agriculture and healthy communities.</p>
              <div className="flex gap-4 text-2xl">
                <a href="#" aria-label="Instagram" className="hover:text-green-500 transition-colors"><FaInstagram /></a>
                <a href="#" aria-label="Facebook" className="hover:text-green-500 transition-colors"><FaFacebook /></a>
                <a href="#" aria-label="Twitter" className="hover:text-green-500 transition-colors"><FaTwitter /></a>
                <a href="#" aria-label="YouTube" className="hover:text-green-500 transition-colors"><FaYoutube /></a>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-green-500 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-green-500 transition-colors">Our Mission</a></li>
                <li><a href="#" className="hover:text-green-500 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-green-500 transition-colors">Press</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-4">Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-green-500 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-green-500 transition-colors">Delivery Info</a></li>
                <li><a href="#" className="hover:text-green-500 transition-colors">Returns</a></li>
                <li><a href="#" className="hover:text-green-500 transition-colors">Contact Us</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-4">For Farmers</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-green-500 transition-colors">Join as Farmer</a></li>
                <li><a href="#" className="hover:text-green-500 transition-colors">Farmer Resources</a></li>
                <li><a href="#" className="hover:text-green-500 transition-colors">Success Stories</a></li>
                <li><a href="#" className="hover:text-green-500 transition-colors">Support</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400">&copy; 2024 FarmKart. All rights reserved. Fresh from farm to your table.</p>
            <div className="flex gap-6">
              <a href="#" className="text-gray-400 hover:text-green-500 transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-green-500 transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-green-500 transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default FarmKartLanding;