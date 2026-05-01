import { Router } from 'express';
import {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
  getRootCategories,
  moveCategory,
} from '@/controllers/categories.controller';
import validateUser from '@/middlewares/auth.middleware';

const router = Router();

// Public routes (no authentication required)
router.get('/', getAllCategories);
router.get('/tree', getCategoryTree);
router.get('/root', getRootCategories);
router.get('/slug/:slug', getCategoryBySlug);
router.get('/:id', getCategoryById);

// Protected routes (authentication required)
router.post('/', validateUser, createCategory);
router.put('/:id', validateUser, updateCategory);
router.delete('/:id', validateUser, deleteCategory);
router.patch('/:id/move', validateUser, moveCategory);

export default router;