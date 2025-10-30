import clsx from 'clsx';

// Animated skeleton loader component
export const Skeleton = ({ className, variant = 'text', animation = 'pulse' }) => {
  const baseClasses = 'bg-gray-200';
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  };
  
  const variantClasses = {
    text: 'h-4 rounded',
    title: 'h-8 rounded',
    avatar: 'rounded-full',
    thumbnail: 'rounded-lg',
    card: 'rounded-xl',
    button: 'h-10 rounded-lg'
  };
  
  return (
    <div 
      className={clsx(
        baseClasses,
        animationClasses[animation],
        variantClasses[variant],
        className
      )}
    />
  );
};

// Product card skeleton
export const ProductCardSkeleton = () => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <Skeleton className="h-48 w-full" variant="thumbnail" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" variant="title" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-10 w-24" variant="button" />
        </div>
      </div>
    </div>
  );
};

// Order card skeleton
export const OrderCardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-10 w-32" variant="button" />
      </div>
    </div>
  );
};

// Dashboard stats skeleton
export const StatsCardSkeleton = () => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" variant="title" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" variant="avatar" />
      </div>
    </div>
  );
};

// Table skeleton
export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-3 bg-gray-50 border-b">
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton key={colIndex} className="h-4 flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// List skeleton
export const ListSkeleton = ({ items = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-white p-4 rounded-lg shadow-sm flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" variant="avatar" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-8 w-20" variant="button" />
        </div>
      ))}
    </div>
  );
};

export default Skeleton;
