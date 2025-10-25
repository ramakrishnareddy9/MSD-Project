# FarmKart System Prompts - Usage Guide

## Overview

This directory contains two comprehensive AI prompts designed to guide the development of the FarmKart agricultural marketplace platform. These prompts can be used to instruct AI coding assistants or development teams on building a complete MERN-stack application.

---

## Available Prompts

### 1. **SYSTEM_OVERVIEW_PROMPT.md**
**Purpose**: High-level system design and architecture specification

**Contents**:
- Core vision: Unified B2C/B2B agricultural marketplace
- Detailed description of all 7 user roles (Farmer, Customer, Business, Restaurant, Large-Scale Delivery, Small-Scale Delivery, Admin)
- Complete feature specifications for each role
- Two-tier logistics flow architecture
- MERN stack technical architecture with best practices
- Role-Based Access Control (RBAC) security implementation
- Database design considerations
- Scalability and performance guidelines
- Implementation phases (MVP → B2B/Delivery → Advanced Features)

**Use This Prompt For**:
- Overall system planning and architecture decisions
- Understanding business requirements and user stories
- Backend API design and database schema planning
- Security and scalability considerations
- Project scoping and milestone planning

**Example Usage**:
> "Using SYSTEM_OVERVIEW_PROMPT.md as the specification, design the MongoDB schema for the FarmKart platform focusing on User, Product, Order, and Inventory collections."

---

### 2. **BACKEND_API_PROMPT.md** ⭐ NEW
**Purpose**: Complete Express.js/MongoDB backend implementation guide

**Contents**:
- Project structure and modular architecture (MVC pattern)
- User model with Mongoose discriminators for 7 roles
- JWT-based authentication with RBAC middleware
- Complete schemas: Product, Order (B2C/B2B), Inventory, Delivery, Payment, Review
- REST API endpoints with authentication/authorization
- Request validation with express-validator
- Error handling patterns
- Security best practices (bcrypt, helmet, CORS, rate limiting)
- Database indexing for performance
- API documentation with Swagger/OpenAPI

**Use This Prompt For**:
- Building the Express.js backend API
- Implementing Mongoose models with validation
- Setting up JWT authentication and RBAC
- Creating RESTful endpoints for all entities
- Database schema design with proper indexing
- Security implementation (password hashing, token management)

**Example Usage**:
> "Following BACKEND_API_PROMPT.md, implement the complete User model with discriminators for Farmer, Business, Restaurant, Delivery, Customer, and Admin roles. Include authentication methods and JWT generation."

---

### 3. **REACT_FRONTEND_PROMPT.md**
**Purpose**: Detailed React frontend implementation guide

**Contents**:
- Complete React architecture with project structure
- Authentication flows (login, signup, JWT management)
- Role-based routing and protected routes implementation
- Detailed specifications for all 7 role-specific dashboards
- Reusable component library (ProductCard, OrderCard, forms, etc.)
- State management (AuthContext, CartContext, NotificationContext)
- Form handling with validation (React Hook Form + Yup)
- Conditional rendering by role (RBAC in UI)
- Performance optimization (code-splitting, lazy loading, memoization)
- UX best practices and accessibility guidelines
- Implementation checklist for all features

**Use This Prompt For**:
- Building the React frontend application
- Creating role-specific user interfaces
- Implementing authentication and authorization
- Designing reusable component libraries
- Optimizing frontend performance
- Ensuring accessibility and responsive design

**Example Usage**:
> "Following REACT_FRONTEND_PROMPT.md, create the CustomerDashboard component with product catalog, cart functionality, and order tracking."

---

## How to Use These Prompts

### With AI Coding Assistants (ChatGPT, Claude, Cursor, etc.)

**Method 1: Context Injection**
```
I'm building FarmKart, an agricultural marketplace. Here's the complete system specification:

[Paste SYSTEM_OVERVIEW_PROMPT.md content]

Now, using this specification, generate the Express.js API routes for product management including CRUD operations, search, and filtering.
```

**Method 2: Reference-Based**
```
I have a system specification in SYSTEM_OVERVIEW_PROMPT.md. Based on the Farmer role described in that document, create a React component for the farmer's inventory management dashboard.
```

**Method 3: Iterative Development**
```
Context: FarmKart is a MERN agricultural marketplace (see SYSTEM_OVERVIEW_PROMPT.md).

Task 1: Create the Mongoose User schema with role-based fields
Task 2: Build authentication API endpoints (login, register, JWT verification)
Task 3: Implement farmer-specific API routes for product management
```

### With Development Teams

**1. Onboarding New Developers**
- Share both prompts as required reading
- Use as reference documentation for understanding requirements
- Refer to specific sections during code reviews

**2. Sprint Planning**
- Extract user stories from role descriptions
- Use implementation checklist for task breakdown
- Reference architecture sections for technical decisions

**3. Design Reviews**
- Validate designs against prompt specifications
- Ensure RBAC principles are followed
- Check that all role-specific features are included

---

## Prompt Coverage Matrix

| Feature/Area | System Overview | Backend API | React Frontend |
|--------------|----------------|-------------|----------------|
| Business Requirements | ✅ Complete | - | - |
| User Roles & Permissions | ✅ Complete | ✅ Complete | ✅ Complete |
| Backend Architecture | ✅ Overview | ✅ Complete | - |
| Database Design | ✅ Guidelines | ✅ Complete | - |
| Mongoose Models | - | ✅ Complete | - |
| REST API Endpoints | ✅ Overview | ✅ Complete | - |
| Authentication (JWT) | ✅ Concept | ✅ Complete | ✅ Complete |
| RBAC Middleware | - | ✅ Complete | - |
| Request Validation | - | ✅ Complete | - |
| Error Handling | - | ✅ Complete | - |
| Frontend Architecture | - | - | ✅ Complete |
| UI Components | - | - | ✅ Complete |
| Role-Based Routing | - | - | ✅ Complete |
| State Management | - | - | ✅ Complete |
| Performance | ✅ Concepts | ✅ Backend | ✅ Frontend |
| Security | ✅ Concepts | ✅ Complete | ✅ Complete |
| UX/Accessibility | - | - | ✅ Complete |

---

## Example Workflows

### Building the Authentication System

**Step 1**: Read SYSTEM_OVERVIEW_PROMPT.md section "Authentication & Authorization"
- Understand JWT-based auth requirements
- Review role-based permissions

**Step 2**: Implement Backend (BACKEND_API_PROMPT.md)
- Create User model with discriminators
- Implement password hashing with bcrypt
- Build JWT generation methods
- Create authentication middleware
- Set up auth routes (register, login)

**Step 3**: Implement Frontend (REACT_FRONTEND_PROMPT.md)
- Create AuthContext with login/logout/register functions
- Build Login and Signup forms with role selection
- Implement ProtectedRoute component
- Use API service layer to call auth endpoints
- Store JWT token and implement token refresh

### Creating the Farmer Dashboard

**Step 1**: Reference SYSTEM_OVERVIEW_PROMPT.md "Farmer Role"
- Understand all farmer capabilities (inventory, orders, earnings)
- Note required features (add product, accept orders, view analytics)

**Step 2**: Follow REACT_FRONTEND_PROMPT.md "Farmer Dashboard"
- Create FarmerDashboard.jsx with overview cards
- Build ProductInventoryTable component
- Implement AddProductForm with validation
- Create OrderQueue component

**Step 3**: Integrate with backend API
- Fetch farmer's products on mount
- Submit new product via POST API
- Update order status via PATCH API

### Implementing B2B Bulk Ordering

**Step 1**: Review SYSTEM_OVERVIEW_PROMPT.md "Business/Company Buyer Role"
- Understand bulk ordering requirements (CSV upload, volume pricing, net terms)
- Note differences from B2C shopping flow

**Step 2**: Follow REACT_FRONTEND_PROMPT.md "Business Portal"
- Create BulkOrderForm component
- Implement CSV upload and parsing
- Build order builder table with autocomplete
- Add payment terms selection

**Step 3**: Backend integration
- Parse CSV on frontend, validate product IDs
- Submit bulk order with all line items
- Handle wholesale pricing calculation

---

## Extending the Prompts

### Adding New Features

1. **Identify the role(s)** affected by the new feature
2. **Update SYSTEM_OVERVIEW_PROMPT.md**:
   - Add feature to the role's capabilities list
   - Describe business logic and data flow
   - Note any new database collections/fields needed
3. **Update REACT_FRONTEND_PROMPT.md**:
   - Add UI component specifications
   - Define user interactions and flows
   - Update role-specific dashboard sections

### Example: Adding "Wishlist" Feature

**In SYSTEM_OVERVIEW_PROMPT.md** (Customer Role):
```markdown
**Capabilities**:
- Save products to wishlist for later purchase
- View saved wishlist items
- Move items from wishlist to cart
- Receive notifications when wishlist items go on sale
```

**In REACT_FRONTEND_PROMPT.md** (Customer Dashboard):
```markdown
**Wishlist Page (pages/customer/Wishlist.jsx)**:
- Grid of saved products using ProductCard component
- Remove from wishlist button
- "Add to Cart" button for each item
- Empty state when no items saved
- Notification badge when items on sale
```

---

## Best Practices

### When Using Prompts

1. **Read the full prompt first**: Understand the complete context before implementation
2. **Follow the architecture**: Don't deviate from the modular structure specified
3. **Implement RBAC consistently**: Always check user roles before rendering UI or allowing actions
4. **Maintain separation of concerns**: Keep components reusable and focused
5. **Test role-specific features**: Verify each role only sees their authorized features

### Code Quality Standards

From both prompts, maintain:
- **Component reusability**: Don't duplicate ProductCard, OrderCard, etc.
- **Consistent naming**: Follow conventions (e.g., `pages/[role]/[Feature].jsx`)
- **Proper validation**: Use schemas for all forms
- **Error handling**: User-friendly messages, not raw errors
- **Loading states**: Show feedback during async operations
- **Accessibility**: ARIA labels, keyboard navigation, contrast ratios

---

## Troubleshooting

### "AI doesn't understand the role requirements"
→ Include the specific role section from SYSTEM_OVERVIEW_PROMPT.md in your query

### "Generated code doesn't match the architecture"
→ Reference the project structure section from REACT_FRONTEND_PROMPT.md explicitly

### "RBAC not implemented correctly"
→ Point to the "Conditional Rendering by Role" section with examples

### "Missing features for a role"
→ Cross-reference both prompts—system overview defines WHAT, frontend prompt defines HOW

---

## Integration with Existing Codebase

The current FarmKart codebase already implements:
- ✅ Backend API with MongoDB (see `backend/` directory)
- ✅ Mongoose models for all entities (see ERD.md)
- ✅ Frontend API service layer (`React/src/services/api.js`)
- ✅ AuthContext with JWT authentication
- ✅ Role-based routing in App.jsx
- ✅ All dashboard components created

**To complete integration**:
1. Use REACT_FRONTEND_PROMPT.md to enhance existing dashboards
2. Replace hardcoded data with API service calls
3. Implement missing UI features (bulk ordering, recurring orders, analytics charts)
4. Add form validation using React Hook Form
5. Optimize with code-splitting and memoization

---

## Related Documentation

- **README.md**: Project setup and quick start guide
- **SETUP_GUIDE.md**: Step-by-step installation instructions
- **IMPLEMENTATION_SUMMARY.md**: What has been built so far
- **QUICK_REFERENCE.md**: Commands and credentials cheat sheet
- **notes.md**: Original platform documentation
- **ERD.md**: Database entity-relationship design

---

## Prompt Maintenance

### When to Update Prompts

- New role added to the system
- Major feature added/changed
- Technology stack changes (e.g., switch from Context to Redux)
- Security requirements updated
- Performance optimizations discovered

### Version Control

These prompts should be:
- Committed to Git with the codebase
- Updated as requirements evolve
- Reviewed during sprint planning
- Referenced in pull request descriptions

---

## Summary

**SYSTEM_OVERVIEW_PROMPT.md** = The "WHAT" and "WHY"
- Business requirements
- System architecture
- Role definitions
- Feature specifications

**BACKEND_API_PROMPT.md** = The "HOW" (Backend)
- Mongoose models with discriminators
- JWT authentication & RBAC
- REST API endpoints
- Validation & security
- Database optimization

**REACT_FRONTEND_PROMPT.md** = The "HOW" (Frontend)
- React components & routing
- Authentication integration
- Role-based UI
- State management
- Performance & UX

**Use all three together** for complete full-stack development guidance from requirements to implementation.

---

**Created**: 2025  
**Platform**: FarmKart MERN Agricultural Marketplace  
**Purpose**: AI-assisted development guidance
