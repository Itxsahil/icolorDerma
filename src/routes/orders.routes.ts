import { Router } from 'express';

import validateUser from '@/middlewares/auth.middleware';
import {
  createOrders,
  razorpayWebHookHandler,
  getOrderById,
  getAllOrdersClient,
} from '@/controllers/orders.controller';

const router = Router();

router.post('/', validateUser, createOrders);
router.get('/all', validateUser, getAllOrdersClient);
router.get('/:orderId', validateUser, getOrderById);
router.post('/webhook', razorpayWebHookHandler);

export default router;
