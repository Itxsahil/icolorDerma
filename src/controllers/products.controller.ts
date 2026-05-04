import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse } from '@/utils/ApiResponse';
import db from '@/db';
import {
  productsTable,
  productCategoriesTable,
  productImagesTable,
  inventoryTable,
  productTagsTable,
  tagsTable,
} from '@/db/schemas/products';
import { categoriesTable } from '@/db/schemas/categories';
import { brandsTable } from '@/db/schemas/brands';
import { eq, and, like, or, desc, asc, sql, inArray } from 'drizzle-orm';
import {
  createProductSchema,
  updateProductSchema,
  updateInventorySchema,
  productQuerySchema,
} from '@/utils/validate.product';

/* =========================
   HELPER FUNCTIONS
========================= */

// Generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/* =========================
   GET ALL PRODUCTS (PAGINATED)
========================= */
export const getPaginatedProducts = asyncHandler(async (req, res) => {
  // Validate query parameters
  const queryParams = productQuerySchema.parse(req.query);
  const {
    page,
    limit,
    search,
    categoryId,
    brandId,
    skinType,
    sortBy,
    sortOrder,
    minPrice,
    maxPrice,
  } = queryParams;

  const offset = (page - 1) * limit;

  // Build where conditions
  let whereConditions: any[] = [];

  // Search by name or description
  if (search && typeof search === 'string') {
    const searchTerm = `%${search.trim()}%`;
    whereConditions.push(
      or(
        like(productsTable.name, searchTerm),
        like(productsTable.description, searchTerm),
        like(productsTable.sku, searchTerm)
      )
    );
  }

  // Filter by brand
  if (brandId) {
    whereConditions.push(eq(productsTable.brandId, brandId));
  }

  // Filter by skin type
  if (skinType) {
    whereConditions.push(like(productsTable.skinType, `%${skinType}%`));
  }

  // Filter by price range
  if (minPrice !== undefined) {
    whereConditions.push(sql`${productsTable.price}::numeric >= ${minPrice}`);
  }
  if (maxPrice !== undefined) {
    whereConditions.push(sql`${productsTable.price}::numeric <= ${maxPrice}`);
  }

  // Build query
  // let query = db.select().from(productsTable);
let query = db
  .select({
    id: productsTable.id,
    name: productsTable.name,
    slug: productsTable.slug,
    sku: productsTable.sku,
    description: productsTable.description,
    price: productsTable.price,
    brandId: productsTable.brandId,
    skinType: productsTable.skinType,
    rating: productsTable.rating,
    reviewCount: productsTable.reviewCount,
    createdAt: productsTable.createdAt,
    updatedAt: productsTable.updatedAt,
    stock: inventoryTable.stock,
    images: productImagesTable.urls,
    compareAtPrice: productsTable.compareAtPrice,
  })
  .from(productsTable)
  .leftJoin(inventoryTable, eq(productsTable.id, inventoryTable.productId))
  .leftJoin(productImagesTable, eq(productsTable.id, productImagesTable.productId))

  if (whereConditions.length > 0) {
    query = query.where(and(...whereConditions)) as any;
  }

  // Apply sorting
  let sortColumn;
  switch (sortBy) {
    case 'name':
      sortColumn = productsTable.name;
      break;
    case 'price':
      sortColumn = productsTable.price;
      break;
    case 'rating':
      sortColumn = productsTable.rating;
      break;
    case 'reviewCount':
      sortColumn = productsTable.reviewCount;
      break;
    case 'updatedAt':
      sortColumn = productsTable.updatedAt;
      break;
    case 'createdAt':
    default:
      sortColumn = productsTable.createdAt;
      break;
  }
  query = query.orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)) as any;

  // Get total count
  const countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(productsTable);

  if (whereConditions.length > 0) {
    countQuery.where(and(...whereConditions));
  }

  const [{ count: totalCount }] = await countQuery;

  // Apply pagination
  const products = await query.limit(limit).offset(offset);

  // Filter by category if provided (requires join)
  let filteredProducts = products;
  if (categoryId) {
    const productCategories = await db
      .select()
      .from(productCategoriesTable)
      .where(eq(productCategoriesTable.categoryId, categoryId));

    const productIds = productCategories.map((pc) => pc.productId);
    filteredProducts = products.filter((p) => productIds.includes(p.id));
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        products: filteredProducts,
        pagination: {
          page,
          limit,
          totalCount: Number(totalCount),
          totalPages: Math.ceil(Number(totalCount) / limit),
        },
      },
      'Products retrieved successfully'
    )
  );
});

/* =========================
   GET PRODUCT BY ID
========================= */
export const getProductById = asyncHandler(async (req, res) => {
  const id = req.params.id as string;

  if (!id) {
    throw new ApiError(400, 'Product ID is required');
  }

  // Get product
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id))
    .limit(1);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Get product images
  const [productImages] = await db
    .select()
    .from(productImagesTable)
    .where(eq(productImagesTable.productId, id))
    .limit(1);

  const images = productImages?.urls || [];

  // Get product categories
  const productCategories = await db
    .select({
      categoryId: productCategoriesTable.categoryId,
      categoryName: categoriesTable.name,
      categorySlug: categoriesTable.slug,
    })
    .from(productCategoriesTable)
    .leftJoin(categoriesTable, eq(productCategoriesTable.categoryId, categoriesTable.id))
    .where(eq(productCategoriesTable.productId, id));

  // Get product tags
  const productTags = await db
    .select({
      tagId: productTagsTable.tagId,
      tagName: tagsTable.name,
    })
    .from(productTagsTable)
    .leftJoin(tagsTable, eq(productTagsTable.tagId, tagsTable.id))
    .where(eq(productTagsTable.productId, id));

  // Get inventory
  const [inventory] = await db
    .select()
    .from(inventoryTable)
    .where(eq(inventoryTable.productId, id))
    .limit(1);

  // Get brand info
  let brand = null;
  if (product.brandId) {
    const [brandData] = await db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.id, product.brandId))
      .limit(1);
    brand = brandData;
  }

  const result = {
    ...product,
    images,
    categories: productCategories,
    tags: productTags,
    inventory: inventory || { stock: 0 },
    brand,
  };

  res.status(200).json(new ApiResponse(200, result, 'Product retrieved successfully'));
});

/* =========================
   GET PRODUCT BY SLUG
========================= */
export const getProductBySlug = asyncHandler(async (req, res) => {
  const slug = req.params.slug as string;

  if (!slug) {
    throw new ApiError(400, 'Product slug is required');
  }

  // Get product
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.slug, slug))
    .limit(1);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Get product images
  const [productImages] = await db
    .select()
    .from(productImagesTable)
    .where(eq(productImagesTable.productId, product.id))
    .limit(1);

  const images = productImages?.urls || [];

  // Get product categories
  const productCategories = await db
    .select({
      categoryId: productCategoriesTable.categoryId,
      categoryName: categoriesTable.name,
      categorySlug: categoriesTable.slug,
    })
    .from(productCategoriesTable)
    .leftJoin(categoriesTable, eq(productCategoriesTable.categoryId, categoriesTable.id))
    .where(eq(productCategoriesTable.productId, product.id));

  // Get product tags
  const productTags = await db
    .select({
      tagId: productTagsTable.tagId,
      tagName: tagsTable.name,
    })
    .from(productTagsTable)
    .leftJoin(tagsTable, eq(productTagsTable.tagId, tagsTable.id))
    .where(eq(productTagsTable.productId, product.id));

  // Get inventory
  const [inventory] = await db
    .select()
    .from(inventoryTable)
    .where(eq(inventoryTable.productId, product.id))
    .limit(1);

  // Get brand info
  let brand = null;
  if (product.brandId) {
    const [brandData] = await db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.id, product.brandId))
      .limit(1);
    brand = brandData;
  }

  const result = {
    ...product,
    images,
    categories: productCategories,
    tags: productTags,
    inventory: inventory || { stock: 0 },
    brand,
  };

  res.status(200).json(new ApiResponse(200, result, 'Product retrieved successfully'));
});

/* =========================
   CREATE PRODUCT
========================= */
export const createProduct = asyncHandler(async (req, res) => {
  // 🔒 Authorization check
  if (!req.user || req.user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden: Admin access required');
  }

  // Validate request body with Zod
  const validatedData = createProductSchema.parse(req.body);
  const { categoryIds, tagIds, images, stock, ...productData } = validatedData;

  // Generate slug
  const baseSlug = generateSlug(productData.name);
  let slug = baseSlug;
  let counter = 1;

  // Ensure slug is unique
  while (true) {
    const [existingProduct] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.slug, slug))
      .limit(1);

    if (!existingProduct) break;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Check SKU uniqueness
  const [existingSku] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.sku, productData.sku))
    .limit(1);

  if (existingSku) {
    throw new ApiError(400, 'Product with this SKU already exists');
  }

  // Validate brand exists if provided
  if (productData.brandId) {
    const [brand] = await db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.id, productData.brandId))
      .limit(1);

    if (!brand) {
      throw new ApiError(400, 'Brand not found');
    }
  }

  // Create product
  const [newProduct] = await db
    .insert(productsTable)
    .values({
      ...productData,
      slug,
    })
    .returning();

  // Add categories
  if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
    const categoryValues = categoryIds.map((categoryId: string) => ({
      productId: newProduct.id,
      categoryId,
    }));
    await db.insert(productCategoriesTable).values(categoryValues);
  }

  // Add tags
  if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
    const tagValues = tagIds.map((tagId: string) => ({
      productId: newProduct.id,
      tagId,
    }));
    await db.insert(productTagsTable).values(tagValues);
  }

  // Add images
  if (images && Array.isArray(images) && images.length > 0) {
    await db.insert(productImagesTable).values({
      productId: newProduct.id,
      urls: images.map((img, index) => ({
        image: img.url,
        position: img.position ?? index,
      })),
    });
  }

  // Create inventory
  await db.insert(inventoryTable).values({
    productId: newProduct.id,
    stock: stock,
  });

  res.status(201).json(new ApiResponse(201, newProduct, 'Product created successfully'));
});

/* =========================
   UPDATE PRODUCT
========================= */
export const updateProduct = asyncHandler(async (req, res) => {
  // 🔒 Authorization check
  if (!req.user || req.user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden: Admin access required');
  }

  const id = req.params.id as string;

  if (!id) {
    throw new ApiError(400, 'Product ID is required');
  }

  // Check if product exists
  const [existingProduct] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id))
    .limit(1);

  if (!existingProduct) {
    throw new ApiError(404, 'Product not found');
  }

  // Validate request body with Zod
  const validatedData = updateProductSchema.parse(req.body);
  const { categoryIds, tagIds, images, stock, ...productData } = validatedData;

  // Check SKU uniqueness (excluding current product)
  if (productData.sku) {
    const [existingSku] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.sku, productData.sku))
      .limit(1);

    if (existingSku && existingSku.id !== id) {
      throw new ApiError(400, 'Product with this SKU already exists');
    }
  }

  // Generate new slug if name changed
  let slug = existingProduct.slug;
  if (productData.name && productData.name !== existingProduct.name) {
    const baseSlug = generateSlug(productData.name);
    slug = baseSlug;
    let counter = 1;

    while (true) {
      const [existingSlugProduct] = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.slug, slug))
        .limit(1);

      if (!existingSlugProduct || existingSlugProduct.id === id) break;

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  // Validate brand exists if provided
  if (productData.brandId) {
    const [brand] = await db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.id, productData.brandId))
      .limit(1);

    if (!brand) {
      throw new ApiError(400, 'Brand not found');
    }
  }

  // Update product
  const [updatedProduct] = await db
    .update(productsTable)
    .set({
      ...productData,
      slug,
      updatedAt: new Date(),
    })
    .where(eq(productsTable.id, id))
    .returning();

  // Update categories
  if (categoryIds !== undefined) {
    // Remove existing categories
    await db.delete(productCategoriesTable).where(eq(productCategoriesTable.productId, id));

    // Add new categories
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      const categoryValues = categoryIds.map((categoryId: string) => ({
        productId: id,
        categoryId,
      }));
      await db.insert(productCategoriesTable).values(categoryValues);
    }
  }

  // Update tags
  if (tagIds !== undefined) {
    // Remove existing tags
    await db.delete(productTagsTable).where(eq(productTagsTable.productId, id));

    // Add new tags
    if (Array.isArray(tagIds) && tagIds.length > 0) {
      const tagValues = tagIds.map((tagId: string) => ({
        productId: id,
        tagId,
      }));
      await db.insert(productTagsTable).values(tagValues);
    }
  }

  // Update images
  if (images !== undefined) {
    if (Array.isArray(images) && images.length > 0) {
      // Check if product images record exists
      const [existingImages] = await db
        .select()
        .from(productImagesTable)
        .where(eq(productImagesTable.productId, id))
        .limit(1);

      const imageUrls = images.map((img: any, index: number) => ({
        image: img.url,
        position: img.position !== undefined ? img.position : index,
      }));

      if (existingImages) {
        // Update existing record
        await db
          .update(productImagesTable)
          .set({ urls: imageUrls })
          .where(eq(productImagesTable.productId, id));
      } else {
        // Create new record
        await db.insert(productImagesTable).values({
          productId: id,
          urls: imageUrls,
        });
      }
    } else {
      // If images array is empty, delete the record
      await db.delete(productImagesTable).where(eq(productImagesTable.productId, id));
    }
  }

  // Update inventory
  if (stock !== undefined) {
    const [existingInventory] = await db
      .select()
      .from(inventoryTable)
      .where(eq(inventoryTable.productId, id))
      .limit(1);

    if (existingInventory) {
      await db
        .update(inventoryTable)
        .set({ stock: stock })
        .where(eq(inventoryTable.productId, id));
    } else {
      await db.insert(inventoryTable).values({
        productId: id,
        stock: stock,
      });
    }
  }

  res.status(200).json(new ApiResponse(200, updatedProduct, 'Product updated successfully'));
});

/* =========================
   DELETE PRODUCT
========================= */
export const deleteProduct = asyncHandler(async (req, res) => {
  // 🔒 Authorization check
  if (!req.user || req.user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden: Admin access required');
  }

  const id = req.params.id as string;

  if (!id) {
    throw new ApiError(400, 'Product ID is required');
  }

  // Check if product exists
  const [existingProduct] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id))
    .limit(1);

  if (!existingProduct) {
    throw new ApiError(404, 'Product not found');
  }

  // Delete related data
  await db.delete(productCategoriesTable).where(eq(productCategoriesTable.productId, id));
  await db.delete(productTagsTable).where(eq(productTagsTable.productId, id));
  await db.delete(productImagesTable).where(eq(productImagesTable.productId, id));
  await db.delete(inventoryTable).where(eq(inventoryTable.productId, id));

  // Delete product
  await db.delete(productsTable).where(eq(productsTable.id, id));

  res.status(200).json(new ApiResponse(200, null, 'Product deleted successfully'));
});

/* =========================
   UPDATE PRODUCT INVENTORY
========================= */
export const updateProductInventory = asyncHandler(async (req, res) => {
  // 🔒 Authorization check
  if (!req.user || req.user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden: Admin access required');
  }

  const id = req.params.id as string;

  if (!id) {
    throw new ApiError(400, 'Product ID is required');
  }

  // Validate request body with Zod
  const { stock } = updateInventorySchema.parse(req.body);

  // Check if product exists
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id))
    .limit(1);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Update or create inventory
  const [existingInventory] = await db
    .select()
    .from(inventoryTable)
    .where(eq(inventoryTable.productId, id))
    .limit(1);

  let updatedInventory;
  if (existingInventory) {
    [updatedInventory] = await db
      .update(inventoryTable)
      .set({ stock: stock })
      .where(eq(inventoryTable.productId, id))
      .returning();
  } else {
    [updatedInventory] = await db
      .insert(inventoryTable)
      .values({
        productId: id,
        stock: stock,
      })
      .returning();
  }

  res.status(200).json(new ApiResponse(200, updatedInventory, 'Inventory updated successfully'));
});

/* =========================
   GET PRODUCTS BY CATEGORY
========================= */
export const getProductsByCategory = asyncHandler(async (req, res) => {
  const categoryId = req.params.categoryId as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  if (!categoryId) {
    throw new ApiError(400, 'Category ID is required');
  }

  const offset = (page - 1) * limit;

  // Get product IDs for this category
  const productCategories = await db
    .select()
    .from(productCategoriesTable)
    .where(eq(productCategoriesTable.categoryId, categoryId));

  const productIds = productCategories.map((pc) => pc.productId);

  if (productIds.length === 0) {
    res.status(200).json(
      new ApiResponse(
        200,
        {
          products: [],
          pagination: {
            page,
            limit,
            totalCount: 0,
            totalPages: 0,
          },
        },
        'No products found for this category'
      )
    );
    return;
  }

  // Get products
  const products = await db
    .select()
    .from(productsTable)
    .where(inArray(productsTable.id, productIds))
    .limit(limit)
    .offset(offset);

  const totalCount = productIds.length;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        products,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
      'Products retrieved successfully'
    )
  );
});

/* =========================
   GET PRODUCTS BY BRAND
========================= */
export const getProductsByBrand = asyncHandler(async (req, res) => {
  const brandId = req.params.brandId as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  if (!brandId) {
    throw new ApiError(400, 'Brand ID is required');
  }

  const offset = (page - 1) * limit;

  // Get total count
  const [{ count: totalCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(productsTable)
    .where(eq(productsTable.brandId, brandId));

  // Get products
  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.brandId, brandId))
    .limit(limit)
    .offset(offset);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        products,
        pagination: {
          page,
          limit,
          totalCount: Number(totalCount),
          totalPages: Math.ceil(Number(totalCount) / limit),
        },
      },
      'Products retrieved successfully'
    )
  );
});