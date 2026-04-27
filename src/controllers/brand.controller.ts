import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse } from '@/utils/ApiResponse';
import db from '@/db';
import { brandsTable } from '@/db/schemas/brands';
import { eq, and } from 'drizzle-orm';

/* =========================
   GET ALL BRANDS
========================= */
export const getAllBrands = asyncHandler(async (_req, res) => {
  const brands = await db.select().from(brandsTable);
  res.status(200).json(new ApiResponse(200, brands, 'Brands fetched successfully'));
});

/* =========================
   GET BRAND BY ID
========================= */
export const getBrandById = asyncHandler(async (req, res) => {
  const id = req.params.id as string;

  const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, id)).limit(1);

  if (!brand) {
    throw new ApiError(404, 'Brand not found');
  }

  res.status(200).json(new ApiResponse(200, brand, 'Brand fetched successfully'));
});

/* =========================
   CREATE BRAND
========================= */
export const createBrand = asyncHandler(async (req, res) => {
  const { name, logoUrl } = req.body;

  if (!name || typeof name !== 'string') {
    throw new ApiError(400, 'Brand name is required');
  }

  const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${req.user!.email.split('@')[0]}-${Math.random().toString(36).slice(2, 7)}`;

  const [existing] = await db
    .select()
    .from(brandsTable)
    .where(and(eq(brandsTable.name, name), eq(brandsTable.createdBy, req.user!.id)))
    .limit(1);

  if (existing) {
    throw new ApiError(409, 'You already have a brand with this name');
  }

  const [brand] = await db
    .insert(brandsTable)
    .values({ name, slug, logoUrl, createdBy: req.user!.id })
    .returning();

  res.status(201).json(new ApiResponse(201, brand, 'Brand created successfully'));
});

/* =========================
   UPDATE BRAND
========================= */
export const updateBrand = asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const { name, logoUrl } = req.body;

  const [existing] = await db
    .select()
    .from(brandsTable)
    .where(and(eq(brandsTable.id, id), eq(brandsTable.createdBy, req.user!.id)))
    .limit(1);

  if (!existing) {
    throw new ApiError(404, 'Brand not found or you do not have permission to update it');
  }

  // regenerate slug if name changed
  const updatedSlug = name
    ? `${name.toLowerCase().replace(/\s+/g, '-')}-${req.user!.email.split('@')[0]}-${Math.random().toString(36).slice(2, 7)}`
    : existing.slug;

  const [updated] = await db
    .update(brandsTable)
    .set({
      ...(name && { name }),
      slug: updatedSlug,
      ...(logoUrl !== undefined && { logoUrl }),
    })
    .where(eq(brandsTable.id, id))
    .returning();

  res.status(200).json(new ApiResponse(200, updated, 'Brand updated successfully'));
});

/* =========================
   DELETE BRAND
========================= */
export const deleteBrand = asyncHandler(async (req, res) => {
  const id = req.params.id as string;

  const [existing] = await db
    .select()
    .from(brandsTable)
    .where(and(eq(brandsTable.id, id), eq(brandsTable.createdBy, req.user!.id)))
    .limit(1);

  if (!existing) {
    throw new ApiError(404, 'Brand not found or you do not have permission to delete it');
  }

  await db.delete(brandsTable).where(eq(brandsTable.id, id));

  res.status(200).json(new ApiResponse(200, null, 'Brand deleted successfully'));
});
