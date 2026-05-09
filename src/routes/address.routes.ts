import {
  createAddress,
  deleteAddress,
  getAddressById,
  getUserAllAddresses,
  setDefaultAddress,
  updateAddress,
} from '@/controllers/address.controller';
import validateUser from '@/middlewares/auth.middleware';
import { Router } from 'express';

const router = Router();

router.use(validateUser);

router.get('/', getUserAllAddresses);
router.get('/:addressId', getAddressById);

router.post('/', createAddress);
router.put('/:addressId', updateAddress);
router.delete('/:addressId', deleteAddress);

router.patch('/:addressId/default', setDefaultAddress);

export default router;
