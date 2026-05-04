import { Router } from 'express';
import {
  getPaginatedProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductInventory,
  getProductsByCategory,
  getProductsByBrand,
} from '@/controllers/products.controller';
import validateUser from '@/middlewares/auth.middleware';

const router = Router();

// Public routes (no authentication required)
router.get('/', getPaginatedProducts);
router.get('/slug/:slug', getProductBySlug);
router.get('/category/:categoryId', getProductsByCategory);
router.get('/brand/:brandId', getProductsByBrand);
router.get('/:id', getProductById);

// Protected routes (admin only - authentication required)
router.post('/', validateUser, createProduct);
router.put('/:id', validateUser, updateProduct);
router.delete('/:id', validateUser, deleteProduct);
router.patch('/:id/inventory', validateUser, updateProductInventory);

export default router;
