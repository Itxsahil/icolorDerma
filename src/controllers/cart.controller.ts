import db from "@/db";
import { cartsTable, cartItemsTable } from "@/db/schemas";
import { productsTable, inventoryTable, productImagesTable } from "@/db/schemas/products";
import asyncHandler from "@/utils/asyncHandler";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { eq, and } from "drizzle-orm";

export const addOrRemoveToCart = asyncHandler(async (req, res): Promise<void> => {
  const { productId, quantity } = req.body;
  const userId = req.user?.id;

  // Validate user authentication
  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  // Validate request body
  if (!productId) {
    throw new ApiError(400, "Product ID is required");
  }

  if (quantity === undefined || quantity === null) {
    throw new ApiError(400, "Quantity is required");
  }

  if (typeof quantity !== "number" || quantity === 0) {
    throw new ApiError(400, "Quantity must be a non-zero number");
  }

  // Check if product exists and get stock
  const [product] = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      price: productsTable.price,
      stock: inventoryTable.stock,
    })
    .from(productsTable)
    .leftJoin(inventoryTable, eq(productsTable.id, inventoryTable.productId))
    .where(eq(productsTable.id, productId));

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const availableStock = product.stock || 0;

  // Find or create cart for user
  let [cart] = await db
    .select()
    .from(cartsTable)
    .where(eq(cartsTable.userId, userId));

  if (!cart) {
    // Create new cart for user
    [cart] = await db
      .insert(cartsTable)
      .values({ userId })
      .returning();
  }

  // Check if product already exists in cart
  const [existingCartItem] = await db
    .select()
    .from(cartItemsTable)
    .where(
      and(
        eq(cartItemsTable.cartId, cart.id),
        eq(cartItemsTable.productId, productId)
      )
    );

  if (existingCartItem) {
    // Product exists in cart - update quantity
    const currentQuantity = existingCartItem.quantity;
    const newQuantity = currentQuantity + quantity;

    if (newQuantity <= 0) {
      // Remove item from cart if quantity becomes zero or negative
      await db
        .delete(cartItemsTable)
        .where(
          and(
            eq(cartItemsTable.cartId, cart.id),
            eq(cartItemsTable.productId, productId)
          )
        );

      res
        .status(200)
        .json(
          new ApiResponse(200, null, "Product removed from cart successfully")
        );
      return;
    }

    // Check if new quantity exceeds available stock
    if (newQuantity > availableStock) {
      throw new ApiError(
        400,
        `Cannot add ${quantity} items. Only ${availableStock - currentQuantity} more available in stock`
      );
    }

    // Update quantity
    const [updatedCartItem] = await db
      .update(cartItemsTable)
      .set({ quantity: newQuantity })
      .where(
        and(
          eq(cartItemsTable.cartId, cart.id),
          eq(cartItemsTable.productId, productId)
        )
      )
      .returning();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedCartItem,
          "Cart updated successfully"
        )
      );
    return;
  } else {
    // Product doesn't exist in cart - add new item
    if (quantity < 0) {
      throw new ApiError(400, "Cannot remove a product that is not in cart");
    }

    // Check if quantity exceeds available stock
    if (quantity > availableStock) {
      throw new ApiError(
        400,
        `Cannot add ${quantity} items. Only ${availableStock} available in stock`
      );
    }

    // Add new item to cart
    const [newCartItem] = await db
      .insert(cartItemsTable)
      .values({
        cartId: cart.id,
        productId,
        quantity,
      })
      .returning();

    res
      .status(201)
      .json(
        new ApiResponse(201, newCartItem, "Product added to cart successfully")
      );
  }
});

export const getCart = asyncHandler(async (req, res): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  // Find user's cart
  const [cart] = await db
    .select()
    .from(cartsTable)
    .where(eq(cartsTable.userId, userId));

  if (!cart) {
    res.status(200).json(
      new ApiResponse(200, { items: [], total: 0 }, "Cart is empty")
    );
    return;
  }

  // Get cart items with product details
  const cartItems = await db
    .select({
      cartId: cartItemsTable.cartId,
      productId: cartItemsTable.productId,
      quantity: cartItemsTable.quantity,
      product: {
        id: productsTable.id,
        name: productsTable.name,
        slug: productsTable.slug,
        price: productsTable.price,
        compareAtPrice: productsTable.compareAtPrice,
        stock: inventoryTable.stock,
      },
      images: productImagesTable.urls,
    })
    .from(cartItemsTable)
    .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
    .leftJoin(inventoryTable, eq(productsTable.id, inventoryTable.productId))
    .leftJoin(productImagesTable, eq(productsTable.id, productImagesTable.productId))
    .where(eq(cartItemsTable.cartId, cart.id));

  // Calculate total
  const total = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.product.price);
    return sum + price * item.quantity;
  }, 0);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        cartId: cart.id,
        items: cartItems,
        total: total.toFixed(2),
        itemCount: cartItems.length,
      },
      "Cart retrieved successfully"
    )
  );
});

export const removeFromCart = asyncHandler(async (req, res): Promise<void> => {
  const productId = Array.isArray(req.params.productId) 
    ? req.params.productId[0] 
    : req.params.productId;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  if (!productId) {
    throw new ApiError(400, "Product ID is required");
  }

  // Find user's cart
  const [cart] = await db
    .select()
    .from(cartsTable)
    .where(eq(cartsTable.userId, userId));

  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  // Remove item from cart
  const result = await db
    .delete(cartItemsTable)
    .where(
      and(
        eq(cartItemsTable.cartId, cart.id),
        eq(cartItemsTable.productId, productId)
      )
    )
    .returning();

  if (result.length === 0) {
    throw new ApiError(404, "Product not found in cart");
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "Product removed from cart successfully"));
});

export const clearCart = asyncHandler(async (req, res): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  // Find user's cart
  const [cart] = await db
    .select()
    .from(cartsTable)
    .where(eq(cartsTable.userId, userId));

  if (!cart) {
    res.status(200).json(new ApiResponse(200, null, "Cart is already empty"));
    return;
  }

  // Remove all items from cart
  await db.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cart.id));

  res.status(200).json(new ApiResponse(200, null, "Cart cleared successfully"));
});