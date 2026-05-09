import db from '@/db';
import { addressesTable } from '@/db/schemas';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse } from '@/utils/ApiResponse';
import asyncHandler from '@/utils/asyncHandler';
import { and, eq, desc } from 'drizzle-orm';

// Get all addresses for the logged-in user
export const getUserAllAddresses = asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  const addresses = await db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.userId, userId))
    .orderBy(desc(addressesTable.isDefault), desc(addressesTable.createdAt));

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { addresses, count: addresses.length },
        'Addresses retrieved successfully'
      )
    );
});

// Get address by ID
export const getAddressById = asyncHandler(async (req, res) => {
  const addressId = req.params.addressId as string;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  if (!addressId) {
    throw new ApiError(400, 'Address ID is required');
  }

  const [address] = await db
    .select()
    .from(addressesTable)
    .where(and(eq(addressesTable.id, addressId), eq(addressesTable.userId, userId)));

  if (!address) {
    throw new ApiError(404, 'Address not found');
  }

  res.status(200).json(new ApiResponse(200, address, 'Address retrieved successfully'));
});

// create address
export const createAddress = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { fullName, phone, line1, line2, city, state, postalCode, country, isDefault } = req.body;

  if (!userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  // Validate required fields
  if (!fullName || !phone || !line1 || !city || !state || !postalCode) {
    throw new ApiError(400, 'Missing required address fields');
  }

  const [createdAddress] = await db
    .insert(addressesTable)
    .values({
      userId,
      fullName,
      phone,
      line1,
      line2,
      city,
      state,
      postalCode,
      country,
      isDefault: isDefault ?? false,
    })
    .returning();

  res.status(201).json(new ApiResponse(201, createdAddress, 'Address created successfully'));
});

// update address

export const updateAddress = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const addressId = req.params.addressId as string;
  const { fullName, phone, line1, line2, city, state, postalCode, country, isDefault } = req.body;

  if (!userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  if (!addressId) {
    throw new ApiError(400, 'Address ID is required');
  }

  //check if address exists
  const [existingAddress] = await db
    .select()
    .from(addressesTable)
    .where(and(eq(addressesTable.id, addressId), eq(addressesTable.userId, userId)));

  if (!existingAddress) {
    throw new ApiError(404, 'Address not found');
  }

  const [updatedAddress] = await db
    .update(addressesTable)
    .set({
      fullName,
      phone,
      line1,
      line2,
      city,
      state,
      postalCode,
      country,
      isDefault: isDefault ?? false,
    })
    .where(and(eq(addressesTable.id, addressId), eq(addressesTable.userId, userId)))
    .returning();

  res.status(200).json(new ApiResponse(200, updatedAddress, 'Address updated successfully'));
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const addressId = req.params.addressId as string;

  if (!userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  if (!addressId) {
    throw new ApiError(400, 'Address ID is required');
  }

  const [deletedAddress] = await db
    .delete(addressesTable)
    .where(and(eq(addressesTable.id, addressId), eq(addressesTable.userId, userId)))
    .returning();

  if (!deletedAddress) {
    throw new ApiError(404, 'Address not found');
  }

  res.status(200).json(new ApiResponse(200, deletedAddress, 'Address deleted successfully'));
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const addressId = req.params.addressId as string;

  if (!userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  if (!addressId) {
    throw new ApiError(400, 'Address ID is required');
  }

  // Verify the address exists and belongs to the user
  const [existingAddress] = await db
    .select()
    .from(addressesTable)
    .where(and(eq(addressesTable.id, addressId), eq(addressesTable.userId, userId)));

  if (!existingAddress) {
    throw new ApiError(404, 'Address not found');
  }

  // Use a transaction to prevent race conditions
  const [updatedAddress] = await db.transaction(async (tx) => {
    // First, unset all default addresses for this user
    await tx
      .update(addressesTable)
      .set({ isDefault: false })
      .where(eq(addressesTable.userId, userId));

    // Then, set the new default address
    return await tx
      .update(addressesTable)
      .set({ isDefault: true })
      .where(and(eq(addressesTable.id, addressId), eq(addressesTable.userId, userId)))
      .returning();
  });

  res
    .status(200)
    .json(new ApiResponse(200, updatedAddress, 'Default address updated successfully'));
});
