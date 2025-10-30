import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCartIcon, StarIcon, HeartIcon, EyeIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline';
import { useCart } from '../../contexts/CartContext';
import { showToast } from '../common/Toast';
import clsx from 'clsx';

const ProductCard = ({ product, onView }) => {
  const { addToCart, isInCart, updateQuantity, getItemQuantity } = useCart();
  const [isLiked, setIsLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  
  const inCart = isInCart(product.id || product._id);
  const cartQuantity = getItemQuantity(product.id || product._id);
  
  const discount = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : product.discount || 0;
    
  const handleAddToCart = () => {
    const productWithDefaults = {
      ...product,
      id: product.id || product._id,
      qty: quantity
    };
    
    if (inCart) {
      updateQuantity(product.id || product._id, cartQuantity + quantity);
      showToast.success(`Updated ${product.name} quantity in cart`);
    } else {
      addToCart(productWithDefaults, quantity);
      showToast.success(`Added ${product.name} to cart`);
    }
    setQuantity(1);
  };
  
  const handleLike = (e) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    if (!isLiked) {
      showToast.info('Added to wishlist');
    } else {
      showToast.info('Removed from wishlist');
    }
  };
  
  const handleView = () => {
    if (onView) onView(product);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative bg-white rounded-2xl shadow-lg overflow-hidden group h-full flex flex-col"
    >
      {/* Discount Badge */}
      {discount > 0 && (
        <div className="absolute top-4 left-4 z-10 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-md">
          {discount}% OFF
        </div>
      )}
      
      {/* Like Button */}
      <button
        onClick={handleLike}
        className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white hover:scale-110 transition-all duration-200"
      >
        <AnimatePresence mode="wait">
          {isLiked ? (
            <motion.div
              key="liked"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <HeartIcon className="w-5 h-5 text-red-500" />
            </motion.div>
          ) : (
            <motion.div
              key="not-liked"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <HeartOutlineIcon className="w-5 h-5 text-gray-600 hover:text-red-500 transition-colors" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
      
      {/* Image Container */}
      <div className="relative h-56 overflow-hidden bg-gray-100">
        <AnimatePresence>
          {!imageLoaded && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse"
            />
          )}
        </AnimatePresence>
        
        <img
          src={product.image || product.images?.[0] || `https://source.unsplash.com/400x300/?${product.name},vegetable,fruit`}
          alt={product.name}
          onLoad={() => setImageLoaded(true)}
          className={clsx(
            'w-full h-full object-cover transition-all duration-700',
            isHovered ? 'scale-110' : 'scale-100',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
        
        {/* Quick View Overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 flex items-center justify-center"
            >
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={handleView}
                className="px-4 py-2 bg-white rounded-lg flex items-center gap-2 transform transition-transform hover:scale-105 shadow-lg"
              >
                <EyeIcon className="w-5 h-5" />
                <span className="font-medium">Quick View</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Content */}
      <div className="p-5 flex-grow flex flex-col">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {product.organic && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Organic
            </span>
          )}
          {product.fresh && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Fresh
            </span>
          )}
          {product.categoryName && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {product.categoryName}
            </span>
          )}
        </div>
        
        {/* Name & Description */}
        <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500 mb-3 line-clamp-2 flex-grow">
          {product.description || 'Fresh and high quality produce directly from farms'}
        </p>
        
        {/* Farmer Info */}
        {product.farmerName && (
          <div className="flex items-center gap-2 mb-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-700 font-semibold text-xs">
                {product.farmerName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-gray-600">by {product.farmerName}</span>
          </div>
        )}
        
        {/* Rating */}
        <div className="flex items-center gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <StarIcon
              key={i}
              className={clsx(
                'w-4 h-4',
                i < Math.floor(product.rating || 4.5)
                  ? 'text-yellow-400'
                  : 'text-gray-300'
              )}
            />
          ))}
          <span className="text-sm text-gray-600 ml-1">
            {product.rating || 4.5} ({product.reviews || 120})
          </span>
        </div>
        
        {/* Price & Cart */}
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-600">
                  ₹{product.price}
                </span>
                {product.originalPrice && (
                  <span className="text-sm text-gray-400 line-through">
                    ₹{product.originalPrice}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">per {product.unit || 'kg'}</span>
            </div>
          </div>
          
          {/* Quantity & Add Button */}
          <div className="flex items-center gap-2">
            {!inCart && (
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuantity(Math.max(1, quantity - 1));
                  }}
                  className="px-2.5 py-1.5 hover:bg-gray-100 transition-colors text-gray-600"
                >
                  -
                </button>
                <span className="px-3 py-1.5 text-sm font-medium min-w-[40px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuantity(quantity + 1);
                  }}
                  className="px-2.5 py-1.5 hover:bg-gray-100 transition-colors text-gray-600"
                >
                  +
                </button>
              </div>
            )}
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAddToCart}
              disabled={product.status === 'out_of_stock'}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200',
                product.status === 'out_of_stock'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : inCart
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
              )}
            >
              <ShoppingCartIcon className="w-5 h-5" />
              <span>
                {product.status === 'out_of_stock' 
                  ? 'Out of Stock' 
                  : inCart 
                  ? `In Cart (${cartQuantity})` 
                  : 'Add to Cart'}
              </span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Product Grid Component
export const ProductGrid = ({ products, loading, onViewProduct }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  
  if (!products || products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
          <ShoppingCartIcon className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-xl font-medium text-gray-600 mb-2">No products found</p>
        <p className="text-gray-500">Try adjusting your filters or search criteria</p>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {products.map((product, index) => (
        <motion.div
          key={product.id || product._id || index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <ProductCard
            product={product}
            onView={onViewProduct}
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

// Product Card Skeleton
const ProductCardSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="h-56 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-5 w-12 bg-gray-200 rounded-full animate-pulse" />
        </div>
        <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="flex justify-between items-end pt-2">
          <div className="space-y-1">
            <div className="h-7 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
