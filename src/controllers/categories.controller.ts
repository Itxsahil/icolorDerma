import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse } from '@/utils/ApiResponse';
import db from '@/db';
import { categoriesTable } from '@/db/schemas/categories';
import { eq, and, isNull, like, or } from 'drizzle-orm';

/* =========================
   HELPER FUNCTIONS
========================= */

// Generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Validate category data
const validateCategoryData = (data: any) => {
  const { name, description, imageUrl, parentId } = data;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new ApiError(400, 'Category name is required and must be a non-empty string');
  }

  if (name.length > 100) {
    throw new ApiError(400, 'Category name must be less than 100 characters');
  }

  if (description && typeof description !== 'string') {
    throw new ApiError(400, 'Description must be a string');
  }

  if (description && description.length > 500) {
    throw new ApiError(400, 'Description must be less than 500 characters');
  }

  if (imageUrl && typeof imageUrl !== 'string') {
    throw new ApiError(400, 'Image URL must be a string');
  }

  if (parentId && typeof parentId !== 'string') {
    throw new ApiError(400, 'Parent ID must be a valid UUID string');
  }

  return {
    name: name.trim(),
    description: description?.trim() || null,
    imageUrl: imageUrl?.trim() || null,
    parentId: parentId || null,
  };
};

// Build category tree from flat array
const buildCategoryTree = (categories: any[], parentId: string | null = null): any[] => {
  return categories
    .filter(category => category.parentId === parentId)
    .map(category => ({
      ...category,
      children: buildCategoryTree(categories, category.id)
    }));
};

/* =========================
   GET ALL CATEGORIES
========================= */
export const getAllCategories = asyncHandler(async (req, res) => {
  const flat = req.query.flat as string;
  const parent = req.query.parent as string;
  const search = req.query.search as string;

  let whereConditions: any[] = [];

  // Filter by parent category
  if (parent === 'root') {
    whereConditions.push(isNull(categoriesTable.parentId));
  } else if (parent && typeof parent === 'string') {
    whereConditions.push(eq(categoriesTable.parentId, parent));
  }

  // Search functionality
  if (search && typeof search === 'string') {
    const searchTerm = `%${search.trim()}%`;
    whereConditions.push(
      or(
        like(categoriesTable.name, searchTerm),
        like(categoriesTable.description, searchTerm)
      )
    );
  }

  // Execute query
  let categories;
  if (whereConditions.length > 0) {
    categories = await db
      .select()
      .from(categoriesTable)
      .where(and(...whereConditions));
  } else {
    categories = await db.select().from(categoriesTable);
  }

  // Return flat array or tree structure
  const result = flat === 'true' ? categories : buildCategoryTree(categories);

  res.status(200).json(
    new ApiResponse(200, result, 'Categories retrieved successfully')
  );
});

/* =========================
   GET CATEGORY BY ID
========================= */
export const getCategoryById = asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const includeChildren = req.query.includeChildren as string;

  if (!id) {
    throw new ApiError(400, 'Category ID is required');
  }

  const [category] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, id))
    .limit(1);

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  let result: any = category;

  // Include children if requested
  if (includeChildren === 'true') {
    const children = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.parentId, id));

    result = { ...category, children };
  }

  res.status(200).json(
    new ApiResponse(200, result, 'Category retrieved successfully')
  );
});

/* =========================
   GET CATEGORY BY SLUG
========================= */
export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const slug = req.params.slug as string;
  const includeChildren = req.query.includeChildren as string;

  if (!slug) {
    throw new ApiError(400, 'Category slug is required');
  }

  const [category] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, slug))
    .limit(1);

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  let result: any = category;

  // Include children if requested
  if (includeChildren === 'true') {
    const children = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.parentId, category.id));

    result = { ...category, children };
  }

  res.status(200).json(
    new ApiResponse(200, result, 'Category retrieved successfully')
  );
});

/* =========================
   CREATE CATEGORY
========================= */
export const createCategory = asyncHandler(async (req, res) => {
  // 🔒 Authorization check
  if (!req.user || req.user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden: Admin access required');
  }

  const validatedData = validateCategoryData(req.body);
  const { name, description, imageUrl, parentId } = validatedData;

  // Generate slug from name
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  // Ensure slug is unique
  while (true) {
    const [existingCategory] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, slug))
      .limit(1);

    if (!existingCategory) break;
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Validate parent category exists if parentId is provided
  if (parentId) {
    const [parentCategory] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, parentId))
      .limit(1);

    if (!parentCategory) {
      throw new ApiError(400, 'Parent category not found');
    }
  }

  // Create category
  const [newCategory] = await db
    .insert(categoriesTable)
    .values({
      name,
      slug,
      description,
      imageUrl,
      parentId,
    })
    .returning();

  res.status(201).json(
    new ApiResponse(201, newCategory, 'Category created successfully')
  );
});

/* =========================
   UPDATE CATEGORY
========================= */
export const updateCategory = asyncHandler(async (req, res) => {
  // 🔒 Authorization check
  if (!req.user || req.user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden: Admin access required');
  }

  const id = req.params.id as string;

  if (!id) {
    throw new ApiError(400, 'Category ID is required');
  }

  // Check if category exists
  const [existingCategory] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, id))
    .limit(1);

  if (!existingCategory) {
    throw new ApiError(404, 'Category not found');
  }

  const validatedData = validateCategoryData(req.body);
  const { name, description, imageUrl, parentId } = validatedData;

  // Prevent setting parent to self or creating circular reference
  if (parentId === id) {
    throw new ApiError(400, 'Category cannot be its own parent');
  }

  // Check for circular reference (prevent infinite loops)
  if (parentId) {
    const [parentCategory] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, parentId))
      .limit(1);

    if (!parentCategory) {
      throw new ApiError(400, 'Parent category not found');
    }

    // Simple circular reference check (could be enhanced for deeper nesting)
    if (parentCategory.parentId === id) {
      throw new ApiError(400, 'Circular reference detected: Parent category cannot be a child of this category');
    }
  }

  // Generate new slug if name changed
  let slug = existingCategory.slug;
  if (name !== existingCategory.name) {
    const baseSlug = generateSlug(name);
    slug = baseSlug;
    let counter = 1;

    // Ensure slug is unique (excluding current category)
    while (true) {
      const [existingSlugCategory] = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.slug, slug))
        .limit(1);

      if (!existingSlugCategory || existingSlugCategory.id === id) break;
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  // Update category
  const [updatedCategory] = await db
    .update(categoriesTable)
    .set({
      name,
      slug,
      description,
      imageUrl,
      parentId,
    })
    .where(eq(categoriesTable.id, id))
    .returning();

  res.status(200).json(
    new ApiResponse(200, updatedCategory, 'Category updated successfully')
  );
});

/* =========================
   DELETE CATEGORY
========================= */
export const deleteCategory = asyncHandler(async (req, res) => {
  // 🔒 Authorization check
  if (!req.user || req.user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden: Admin access required');
  }

  const id = req.params.id as string;
  const force = req.query.force as string;

  if (!id) {
    throw new ApiError(400, 'Category ID is required');
  }

  // Check if category exists
  const [existingCategory] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, id))
    .limit(1);

  if (!existingCategory) {
    throw new ApiError(404, 'Category not found');
  }

  // Check for child categories
  const childCategories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.parentId, id));

  if (childCategories.length > 0 && force !== 'true') {
    throw new ApiError(400, 'Cannot delete category with child categories. Use force=true to delete all child categories.');
  }

  // If force delete, recursively delete all child categories
  if (force === 'true' && childCategories.length > 0) {
    const deleteChildrenRecursively = async (parentId: string) => {
      const children = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.parentId, parentId));

      for (const child of children) {
        await deleteChildrenRecursively(child.id);
        await db
          .delete(categoriesTable)
          .where(eq(categoriesTable.id, child.id));
      }
    };

    await deleteChildrenRecursively(id);
  }

  // Delete the category
  await db
    .delete(categoriesTable)
    .where(eq(categoriesTable.id, id));

  res.status(200).json(
    new ApiResponse(200, null, 'Category deleted successfully')
  );
});

/* =========================
   GET CATEGORY TREE
========================= */
export const getCategoryTree = asyncHandler(async (req, res) => {
  const maxDepth = req.query.maxDepth as string;
  const depth = maxDepth ? parseInt(maxDepth) : undefined;

  // Get all categories
  const allCategories = await db.select().from(categoriesTable);

  // Build tree structure with optional depth limit
  const buildTreeWithDepth = (categories: any[], parentId: string | null = null, currentDepth: number = 0): any[] => {
    if (depth !== undefined && currentDepth >= depth) {
      return [];
    }

    return categories
      .filter(category => category.parentId === parentId)
      .map(category => ({
        ...category,
        children: buildTreeWithDepth(categories, category.id, currentDepth + 1)
      }));
  };

  const categoryTree = buildTreeWithDepth(allCategories);

  res.status(200).json(
    new ApiResponse(200, categoryTree, 'Category tree retrieved successfully')
  );
});

/* =========================
   GET ROOT CATEGORIES
========================= */
export const getRootCategories = asyncHandler(async (req, res) => {
  const rootCategories = await db
    .select()
    .from(categoriesTable)
    .where(isNull(categoriesTable.parentId));

  res.status(200).json(
    new ApiResponse(200, rootCategories, 'Root categories retrieved successfully')
  );
});

/* =========================
   MOVE CATEGORY
========================= */
export const moveCategory = asyncHandler(async (req, res) => {
  // 🔒 Authorization check
  if (!req.user || req.user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden: Admin access required');
  }

  const id = req.params.id as string;
  const { newParentId } = req.body;

  if (!id) {
    throw new ApiError(400, 'Category ID is required');
  }

  // Check if category exists
  const [category] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, id))
    .limit(1);

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  // Prevent setting parent to self
  if (newParentId === id) {
    throw new ApiError(400, 'Category cannot be its own parent');
  }

  // Validate new parent exists if provided
  if (newParentId) {
    const [newParent] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, newParentId))
      .limit(1);

    if (!newParent) {
      throw new ApiError(400, 'New parent category not found');
    }

    // Check for circular reference
    if (newParent.parentId === id) {
      throw new ApiError(400, 'Circular reference detected: Cannot move category to its own child');
    }
  }

  // Update category's parent
  const [updatedCategory] = await db
    .update(categoriesTable)
    .set({ parentId: newParentId || null })
    .where(eq(categoriesTable.id, id))
    .returning();

  res.status(200).json(
    new ApiResponse(200, updatedCategory, 'Category moved successfully')
  );
});