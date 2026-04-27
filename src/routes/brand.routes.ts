import { Router } from 'express';
import {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
} from '@/controllers/brand.controller';
import validateUser from '@/middlewares/auth.middleware';

const router = Router();

router.get('/', validateUser, getAllBrands);
router.post('/', validateUser, createBrand);
router.get('/:id', validateUser, getBrandById);
router.put('/:id', validateUser, updateBrand);
router.delete('/:id', validateUser, deleteBrand);

export default router;
