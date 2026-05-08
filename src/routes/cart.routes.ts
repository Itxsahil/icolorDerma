import { Router } from 'express';
import {
  addOrRemoveToCart,
  getCart,
  removeFromCart,
  clearCart,
} from '@/controllers/cart.controller';
import validateUser from '@/middlewares/auth.middleware';

const router = Router();

// All cart routes require authentication
router.use(validateUser);

// Get user's cart
router.get('/', getCart);

// Add or update item in cart (positive quantity adds, negative removes)
router.post('/', addOrRemoveToCart);

// Remove specific item from cart
router.delete('/:productId', removeFromCart);

// Clear entire cart
router.delete('/', clearCart);

export default router;
