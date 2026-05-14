import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Must be a valid email'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters').refine((val) => /[A-Z]/.test(val) && /[a-z]/.test(val) && /\d/.test(val), {
    message: 'Password must include uppercase, lowercase and a number'
  }),
  address: z.string().optional(),
  city: z.string().optional(),
  role: z.enum(['customer','farmer','business','travel_agency','restaurant','delivery_large','delivery_small']),
  // optional role-specific fields
  farmName: z.string().optional(),
  totalLand: z.string().optional(),
  experience: z.string().optional(),
  companyName: z.string().optional(),
  businessType: z.string().optional(),
  owner: z.string().optional(),
  gst: z.string().optional(),
  agencyName: z.string().optional(),
  licenseNumber: z.string().optional(),
  accountType: z.string().optional()
});

export const resetSchema = z.object({
  email: z.string().email('Must be a valid email')
});
