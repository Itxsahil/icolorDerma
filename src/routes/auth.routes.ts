import {
  loginUser,
  signupUser,
  verifyOtp,
  logoutUser,
  getCurrentUser,
  getSignUrlImageKit,
} from '@/controllers/auth.controller';
import validateUser from '@/middlewares/auth.middleware';
import { Router } from 'express';

const router = Router();

router.post('/signup', signupUser);
router.post('/verify-otp', verifyOtp);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', validateUser, getCurrentUser);
router.get('/imagekit-sign', validateUser, getSignUrlImageKit);

export default router;
