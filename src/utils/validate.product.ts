import { z } from 'zod';

// Product validation schema
export const createProductSchema = z.object({
  // Required fields
  name: z
    .string({ message: 'Product name is required' })
    .min(1, 'Product name cannot be empty')
    .max(200, 'Product name must be less than 200 characters')
    .trim(),

  sku: z
    .string({ message: 'SKU is required' })
    .min(1, 'SKU cannot be empty')
    .max(100, 'SKU must be less than 100 characters')
    .trim(),

  description: z
    .string({ message: 'Description is required' })
    .min(1, 'Description cannot be empty')
    .max(5000, 'Description must be less than 5000 characters')
    .trim(),

  price: z
    .string({ message: 'Price is required' })
    .or(z.number())
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num) || num <= 0) {
        throw new Error('Price must be a positive number');
      }
      return num.toFixed(2);
    }),

  // Optional fields
  shortDescription: z
    .string()
    .max(500, 'Short description must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),

  compareAtPrice: z
    .string()
    .or(z.number())
    .transform((val) => {
      if (!val) return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num) || num < 0) {
        throw new Error('Compare at price must be a non-negative number');
      }
      return num.toFixed(2);
    })
    .optional()
    .nullable(),

  currency: z
    .string()
    .max(10, 'Currency code must be less than 10 characters')
    .default('INR')
    .optional(),

  brandId: z
    .string()
    .uuid('Brand ID must be a valid UUID')
    .optional()
    .nullable(),

  ingredients: z
    .string()
    .max(2000, 'Ingredients must be less than 2000 characters')
    .trim()
    .optional()
    .nullable(),

  howToUse: z
    .string()
    .max(2000, 'How to use must be less than 2000 characters')
    .trim()
    .optional()
    .nullable(),

  skinType: z
    .string()
    .max(100, 'Skin type must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),

  // Related data
  categoryIds: z
    .array(z.string().uuid('Category ID must be a valid UUID'))
    .optional()
    .default([]),

  tagIds: z
    .array(z.string().uuid('Tag ID must be a valid UUID'))
    .optional()
    .default([]),

  images: z
    .array(
      z.object({
        url: z.string().url('Image URL must be a valid URL'),
        position: z.number().int().min(0).optional(),
      })
    )
    .optional()
    .default([]),

  stock: z
    .number({ message: 'Stock is required' })
    .or(z.string())
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val) : val;
      if (isNaN(num) || num < 0) {
        throw new Error('Stock must be a non-negative integer');
      }
      return num;
    })
    .optional()
    .default(0),
});

// Update product schema (all fields optional except those that shouldn't change)
export const updateProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name cannot be empty')
    .max(200, 'Product name must be less than 200 characters')
    .trim()
    .optional(),

  sku: z
    .string()
    .min(1, 'SKU cannot be empty')
    .max(100, 'SKU must be less than 100 characters')
    .trim()
    .optional(),

  description: z
    .string()
    .min(1, 'Description cannot be empty')
    .max(5000, 'Description must be less than 5000 characters')
    .trim()
    .optional(),

  shortDescription: z
    .string()
    .max(500, 'Short description must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),

  price: z
    .string()
    .or(z.number())
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num) || num <= 0) {
        throw new Error('Price must be a positive number');
      }
      return num.toFixed(2);
    })
    .optional(),

  compareAtPrice: z
    .string()
    .or(z.number())
    .transform((val) => {
      if (!val) return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num) || num < 0) {
        throw new Error('Compare at price must be a non-negative number');
      }
      return num.toFixed(2);
    })
    .optional()
    .nullable(),

  currency: z
    .string()
    .max(10, 'Currency code must be less than 10 characters')
    .optional(),

  brandId: z
    .string()
    .uuid('Brand ID must be a valid UUID')
    .optional()
    .nullable(),

  ingredients: z
    .string()
    .max(2000, 'Ingredients must be less than 2000 characters')
    .trim()
    .optional()
    .nullable(),

  howToUse: z
    .string()
    .max(2000, 'How to use must be less than 2000 characters')
    .trim()
    .optional()
    .nullable(),

  skinType: z
    .string()
    .max(100, 'Skin type must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),

  categoryIds: z
    .array(z.string().uuid('Category ID must be a valid UUID'))
    .optional(),

  tagIds: z
    .array(z.string().uuid('Tag ID must be a valid UUID'))
    .optional(),

  images: z
    .array(
      z.object({
        url: z.string().url('Image URL must be a valid URL'),
        position: z.number().int().min(0).optional(),
      })
    )
    .optional(),

  stock: z
    .number()
    .or(z.string())
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val) : val;
      if (isNaN(num) || num < 0) {
        throw new Error('Stock must be a non-negative integer');
      }
      return num;
    })
    .optional(),
});

// Inventory update schema
export const updateInventorySchema = z.object({
  stock: z
    .number({ message: 'Stock is required' })
    .or(z.string())
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val) : val;
      if (isNaN(num) || num < 0) {
        throw new Error('Stock must be a non-negative integer');
      }
      return num;
    }),
});

// Query parameters validation
export const productQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 20)),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  skinType: z.string().optional(),
  sortBy: z
    .enum(['name', 'price', 'rating', 'reviewCount', 'createdAt', 'updatedAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  minPrice: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  maxPrice: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
});

// Type exports
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
