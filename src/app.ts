import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from '@routes/auth.routes';
import brandRouter from '@routes/brand.routes';
import categoriesRouter from '@routes/categories.routes';
import productsRouter from '@routes/product.routes';
import cartRouter from '@routes/cart.routes';
// import checkoutRouter from '@routes/checkout.routes';
import addressRouter from '@routes/address.routes';
import ordersRoute from '@routes/orders.routes';
import { ApiError } from '@/utils/ApiError';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      'http://localhost:3000', 
      'http://localhost:3001', 
      'https://icolorderma-client.vercel.app'
    ],
    credentials: true, // Allow cookies to be sent
  })
);

app.get('/', (_req, res) => {
  res.send('Server is running 😏');
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/brands', brandRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/cart', cartRouter);
// app.use('/api/v1/checkout', checkoutRouter);
app.use('/api/v1/addresses', addressRouter);
app.use('/api/v1/orders', ordersRoute);

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

export default app;
