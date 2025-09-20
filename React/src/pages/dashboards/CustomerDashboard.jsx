import { useEffect, useState } from 'react';
import { 
  FaShoppingCart, 
  FaHeart, 
  FaUser, 
  FaHistory, 
  FaMapMarkerAlt, 
  FaStar,
  FaPlus,
  FaMinus,
  FaTrash,
  FaSearch,
  FaFilter
} from 'react-icons/fa';

const sampleProducts = [
  { 
    id: 1, 
    name: 'Organic Wheat', 
    price: 50, 
    unit: '1kg',
    category: 'Grains',
    farmer: 'Ramesh Patel',
    rating: 4.5,
    image: 'https://cdn.pixabay.com/photo/2016/08/10/16/58/wheat-1583602_1280.jpg',
    inStock: true,
    description: 'Premium organic wheat from local farms'
  },
  { 
    id: 2, 
    name: 'Basmati Rice', 
    price: 60, 
    unit: '1kg',
    category: 'Grains',
    farmer: 'Meera Sharma',
    rating: 4.8,
    image: 'https://cdn.pixabay.com/photo/2016/02/29/05/46/brown-rice-1228099_1280.jpg',
    inStock: true,
    description: 'Aromatic basmati rice, aged to perfection'
  },
  { 
    id: 3, 
    name: 'Fresh Tomatoes', 
    price: 35, 
    unit: '1kg',
    category: 'Vegetables',
    farmer: 'Suresh Kumar',
    rating: 4.2,
    image: 'https://cdn.pixabay.com/photo/2016/02/23/17/08/tomatoes-1218973_1280.png',
    inStock: true,
    description: 'Juicy, vine-ripened tomatoes'
  },
  { 
    id: 4, 
    name: 'Organic Carrots', 
    price: 45, 
    unit: '1kg',
    category: 'Vegetables',
    farmer: 'Priya Devi',
    rating: 4.6,
    image: 'https://cdn.pixabay.com/photo/2016/03/05/19/02/carrot-1238251_1280.jpg',
    inStock: true,
    description: 'Sweet, crunchy organic carrots'
  },
  { 
    id: 5, 
    name: 'Farm Fresh Milk', 
    price: 65, 
    unit: '1L',
    category: 'Dairy',
    farmer: 'Gopal Singh',
    rating: 4.7,
    image: 'https://cdn.pixabay.com/photo/2017/07/18/15/39/milk-2516052_1280.jpg',
    inStock: true,
    description: 'Pure, fresh milk from grass-fed cows'
  },
  { 
    id: 6, 
    name: 'Seasonal Mangoes', 
    price: 150, 
    unit: '1kg',
    category: 'Fruits',
    farmer: 'Rajesh Patel',
    rating: 4.9,
    image: 'https://cdn.pixabay.com/photo/2018/03/02/13/41/mango-3196175_1280.jpg',
    inStock: false,
    description: 'Sweet, juicy seasonal mangoes'
  }
];

const LS_CART_KEY = 'farmkart_customer_cart';
const LS_WISHLIST_KEY = 'farmkart_customer_wishlist';

const CustomerDashboard = () => {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [activeTab, setActiveTab] = useState('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [orderHistory] = useState([
    { id: 1, date: '2024-01-15', total: 245, status: 'Delivered', items: 3 },
    { id: 2, date: '2024-01-10', total: 180, status: 'Delivered', items: 2 },
    { id: 3, date: '2024-01-05', total: 320, status: 'In Transit', items: 5 }
  ]);

  const categories = ['All', ...new Set(sampleProducts.map(p => p.category))];

  useEffect(() => {
    const savedCart = localStorage.getItem(LS_CART_KEY);
    const savedWishlist = localStorage.getItem(LS_WISHLIST_KEY);
    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(LS_WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) => (p.id === product.id ? { ...p, qty: p.qty + 1 } : p));
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateCartQuantity = (id, newQty) => {
    if (newQty <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) => prev.map((p) => (p.id === id ? { ...p, qty: newQty } : p)));
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((p) => p.id !== id));

  const toggleWishlist = (product) => {
    setWishlist((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      }
      return [...prev, product];
    });
  };

  const isInWishlist = (productId) => wishlist.some((p) => p.id === productId);

  const filteredProducts = sampleProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const total = cart.reduce((sum, p) => sum + p.price * p.qty, 0);
  const totalItems = cart.reduce((sum, p) => sum + p.qty, 0);

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} className="text-yellow-400" />);
    }
    if (hasHalfStar) {
      stars.push(<FaStar key="half" className="text-yellow-400 opacity-50" />);
    }
    return stars;
  };

  const ProductCard = ({ product }) => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        <button
          onClick={() => toggleWishlist(product)}
          className={`absolute top-2 right-2 p-2 rounded-full ${
            isInWishlist(product.id) ? 'bg-red-500 text-white' : 'bg-white text-gray-400'
          } hover:scale-110 transition-transform`}
        >
          <FaHeart />
        </button>
        {!product.inStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-semibold">Out of Stock</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
        <p className="text-sm text-gray-600 mb-2">{product.description}</p>
        <div className="flex items-center mb-2">
          <div className="flex mr-2">{renderStars(product.rating)}</div>
          <span className="text-sm text-gray-500">({product.rating})</span>
        </div>
        <p className="text-sm text-gray-500 mb-2">by {product.farmer}</p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-green-600">₹{product.price}</span>
            <span className="text-sm text-gray-500">/{product.unit}</span>
          </div>
          <button
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              product.inStock
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">Customer Dashboard</h1>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <FaShoppingCart className="text-gray-600" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-600">Welcome back!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'browse', label: 'Browse Products', icon: FaSearch },
              { id: 'cart', label: `Cart (${totalItems})`, icon: FaShoppingCart },
              { id: 'wishlist', label: `Wishlist (${wishlist.length})`, icon: FaHeart },
              { id: 'orders', label: 'Order History', icon: FaHistory },
              { id: 'profile', label: 'Profile', icon: FaUser }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'browse' && (
          <div>
            {/* Search and Filter */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cart' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Shopping Cart</h2>
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <FaShoppingCart className="mx-auto text-gray-400 text-4xl mb-4" />
                <p className="text-gray-500">Your cart is empty</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                      <div className="flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-gray-500">₹{item.price}/{item.unit}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateCartQuantity(item.id, item.qty - 1)}
                          className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                        >
                          <FaMinus className="text-xs" />
                        </button>
                        <span className="w-8 text-center">{item.qty}</span>
                        <button
                          onClick={() => updateCartQuantity(item.id, item.qty + 1)}
                          className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                        >
                          <FaPlus className="text-xs" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{item.price * item.qty}</p>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700 mt-1"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-semibold">Total: ₹{total}</span>
                  </div>
                  <button className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors">
                    Proceed to Checkout
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Wishlist</h2>
            {wishlist.length === 0 ? (
              <div className="text-center py-8">
                <FaHeart className="mx-auto text-gray-400 text-4xl mb-4" />
                <p className="text-gray-500">Your wishlist is empty</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Order History</h2>
            <div className="space-y-4">
              {orderHistory.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Order #{order.id}</p>
                    <p className="text-sm text-gray-500">{order.date} • {order.items} items</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{order.total}</p>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      order.status === 'Delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  defaultValue="John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  defaultValue="john.doe@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  defaultValue="+91 9876543210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaMapMarkerAlt className="inline mr-2" />
                  Delivery Address
                </label>
                <textarea
                  rows="3"
                  defaultValue="123 Main Street, City, State - 123456"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
                Update Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
