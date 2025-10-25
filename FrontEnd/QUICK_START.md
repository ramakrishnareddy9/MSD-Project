# FarmKart - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation
```bash
# Navigate to the project directory
cd "d:\Mern stack\MSD-Project\React"

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will open at `http://localhost:5173` (or the port shown in terminal).

## 🔐 Demo Login Credentials

### Customer Account
- **Username**: `customer`
- **Password**: `customer123`
- **Access**: Browse products, add to cart, place orders

### Farmer Account
- **Username**: `farmer`
- **Password**: `farmer123`
- **Access**: Manage crops, view orders, track sales

### Transporter Account
- **Username**: `transporter`
- **Password**: `transport123`
- **Access**: View delivery requests, manage routes

### Community Account
- **Username**: `community`
- **Password**: `community123`
- **Access**: Community features and resources

### Business Account
- **Username**: `business`
- **Password**: `business123`
- **Access**: Bulk orders and business features

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Access**: Full system administration

## 📁 Project Structure

```
React/
├── src/
│   ├── Components/          # Reusable components
│   │   ├── LandingPaage.jsx    # Landing page (enhanced ✨)
│   │   ├── LoginSIgnUp.jsx     # Auth forms (redesigned ✨)
│   │   ├── Navbar.jsx          # Navigation bar (enhanced ✨)
│   │   ├── LoadingSpinner.jsx  # Loading states (animated ✨)
│   │   └── ProfileDropdown.jsx
│   ├── pages/
│   │   ├── AuthPage.jsx        # Auth wrapper (enhanced ✨)
│   │   └── dashboards/         # Role-specific dashboards
│   ├── layouts/
│   │   └── DashboardLayout.jsx # Main layout (enhanced ✨)
│   ├── contexts/
│   │   └── AuthContext.jsx     # Authentication context
│   ├── theme/
│   │   └── muiTheme.js         # MUI theme config
│   ├── theme.js                # Theme configuration (updated ✨)
│   ├── index.css               # Global styles (enhanced ✨)
│   └── main.jsx                # App entry point
├── tailwind.config.js          # Tailwind configuration (new ✨)
├── postcss.config.js           # PostCSS configuration (new ✨)
└── package.json
```

## 🎨 Styling Approach

### Tailwind CSS (New!)
Used for:
- Layout and spacing
- Responsive design
- Utility classes
- Custom animations

### Material-UI (Existing)
Used for:
- Complex components (Tables, Dialogs, etc.)
- Form elements
- Icons
- Theme system

### Example: Combining Both
```jsx
import { Button, Card } from '@mui/material';

function MyComponent() {
  return (
    <Card className="p-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
      <Button 
        variant="contained"
        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
      >
        Click Me
      </Button>
    </Card>
  );
}
```

## 🎯 Key Features

### Landing Page
- ✅ Modern hero section with gradient background
- ✅ Feature cards with hover effects
- ✅ Farmer profiles showcase
- ✅ Responsive design
- ✅ Smooth animations

### Authentication
- ✅ Beautiful split-screen design
- ✅ Tab-based navigation (Login/Register/Reset)
- ✅ Form validation
- ✅ Social login buttons
- ✅ Demo credentials display

### Dashboards
- ✅ Role-specific interfaces
- ✅ Sidebar navigation
- ✅ Stats cards
- ✅ Data tables
- ✅ Product management

## 🛠️ Common Tasks

### Adding a New Page
```jsx
// 1. Create component
// src/pages/NewPage.jsx
export default function NewPage() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold text-green-600">New Page</h1>
    </div>
  );
}

// 2. Add route in App.jsx
<Route path="/new-page" element={<NewPage />} />
```

### Creating a Gradient Button
```jsx
<button className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all duration-200 shadow-lg">
  Click Me
</button>
```

### Adding Animations
```jsx
// Fade in
<div className="animate-fadeIn">Content</div>

// Bounce
<div className="animate-bounce">Bouncing</div>

// Pulse
<div className="animate-pulse">Pulsing</div>

// Custom delay
<div className="animate-fadeIn animate-delay-200">Delayed</div>
```

## 📱 Responsive Design

### Breakpoints
```jsx
// Mobile first approach
<div className="
  grid 
  grid-cols-1        // 1 column on mobile
  md:grid-cols-2     // 2 columns on tablets
  lg:grid-cols-4     // 4 columns on desktop
  gap-4
">
  {/* Content */}
</div>
```

### Hide/Show Elements
```jsx
// Hidden on mobile, visible on desktop
<div className="hidden md:block">Desktop only</div>

// Visible on mobile, hidden on desktop
<div className="block md:hidden">Mobile only</div>
```

## 🎨 Color Classes

### Background
- `bg-green-50` to `bg-green-900`
- `bg-gradient-to-r from-green-500 to-green-600`

### Text
- `text-green-50` to `text-green-900`
- `text-gray-600`, `text-gray-800`

### Borders
- `border-green-500`
- `border-gray-200`

## 🔧 Troubleshooting

### CSS Not Loading
```bash
# Clear cache and restart
npm run dev -- --force
```

### Tailwind Classes Not Working
1. Check `tailwind.config.js` content paths
2. Ensure PostCSS is configured
3. Restart dev server

### Build Errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📚 Documentation Links

- **Tailwind CSS**: https://tailwindcss.com/docs
- **Material-UI**: https://mui.com/
- **React Router**: https://reactrouter.com/
- **React Icons**: https://react-icons.github.io/

## 🎯 Development Tips

1. **Use Tailwind IntelliSense**: Install VS Code extension for autocomplete
2. **Component First**: Build reusable components
3. **Mobile First**: Design for mobile, then scale up
4. **Test Responsiveness**: Use browser dev tools
5. **Optimize Images**: Use appropriate formats and sizes

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deploy to Netlify/Vercel
1. Connect your Git repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Deploy!

## 📞 Support

For issues or questions:
1. Check `ENHANCEMENTS_SUMMARY.md` for detailed changes
2. Review `TAILWIND_GUIDE.md` for styling help
3. Check browser console for errors
4. Review component documentation

---

**Happy Coding! 🌾**
