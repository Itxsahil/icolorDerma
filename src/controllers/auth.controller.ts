import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse } from '@/utils/ApiResponse';
import { isValidEmail, isValidPassword, isValidOtp, generateOTP } from '@/utils/validate';
import { hashPassword, isPasswordValid } from '@/utils/hash';
import { generateTokens } from '@/utils/jwt';
import { sendEmail } from '@/utils/sendEmail';
import { loginTemplate } from '@/utils/Templates/login.template';
import db from '@/db';
import { usersTable } from '@/db/schemas/users';
import { eq } from 'drizzle-orm';
import { generateImageKitSignUrl } from '@/utils/generateSignUrl';
import jwt from 'jsonwebtoken';
/* =========================
   SIGN UP
========================= */
export const signupUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || typeof name !== 'string') {
    throw new ApiError(400, 'Name is required');
  }

  if (!email || !isValidEmail(email)) {
    throw new ApiError(400, 'Valid email is required');
  }

  if (!password || !isValidPassword(password)) {
    throw new ApiError(
      400,
      'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
    );
  }

  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existingUser) {
    throw new ApiError(409, 'User with this email already exists');
  }

  const hashedPass = await hashPassword({ textPassword: password });
  const otp = generateOTP();

  await db.insert(usersTable).values({
    name,
    email,
    password: hashedPass,
    otp,
    otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  });

  sendEmail({
    to: [email],
    subject: 'Verify your email',
    html: loginTemplate.html({ name, otp }),
    text: loginTemplate.text({ name, otp }),
  });

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        null,
        'Account created. Please check your email for the verification OTP.'
      )
    );
});

/* =========================
   VERIFY OTP
========================= */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !isValidEmail(email)) {
    throw new ApiError(400, 'Valid email is required');
  }

  if (!otp || !isValidOtp(otp)) {
    throw new ApiError(400, 'Valid 6-digit OTP is required');
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  if (!user) {
    throw new ApiError(404, 'No account found with this email');
  }

  if (user.isVerifiedEmail) {
    throw new ApiError(400, 'Email is already verified');
  }
  if (user.otp_expires_at && new Date(user.otp_expires_at) < new Date()) {
    throw new ApiError(410, 'OTP has expired');
  }

  if (user.otp !== otp) {
    throw new ApiError(401, 'Invalid OTP');
  }

  const { access_token, refresh_token } = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  await db
    .update(usersTable)
    .set({ isVerifiedEmail: true, otp: null, access_token, refresh_token })
    .where(eq(usersTable.id, user.id));

  // Set HttpOnly cookies
  res.cookie('access_token', access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refresh_token', refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
        'Email verified successfully'
      )
    );
});

/* =========================
   LOGIN
========================= */
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !isValidEmail(email)) {
    throw new ApiError(400, 'Valid email is required');
  }

  if (!password) {
    throw new ApiError(400, 'Password is required');
  }

  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!existingUser) {
    throw new ApiError(404, 'No account found with this email');
  }

  if (!existingUser.isVerifiedEmail) {
    const otp = generateOTP();

    await db
      .update(usersTable)
      .set({ otp: otp, otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() })
      .where(eq(usersTable.id, existingUser.id));

    await sendEmail({
      to: [email],
      subject: 'Verify your email',
      html: loginTemplate.html({ name: existingUser.name, otp }),
      text: loginTemplate.text({ name: existingUser.name, otp }),
    });

    throw new ApiError(403, 'Email not verified. A new OTP has been sent to your email.');
  }

  const isValid = await isPasswordValid({ textPass: password, hashPass: existingUser.password });

  if (!isValid) {
    throw new ApiError(401, 'Invalid password');
  }

  const { access_token, refresh_token } = generateTokens({
    id: existingUser.id,
    email: existingUser.email,
    role: existingUser.role,
  });

  await db
    .update(usersTable)
    .set({ access_token, refresh_token })
    .where(eq(usersTable.id, existingUser.id));

  // Set HttpOnly cookies
  res.cookie('access_token', access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refresh_token', refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        },
      },
      'Logged in successfully'
    )
  );
});

/* =========================
   LOGOUT
========================= */
export const logoutUser = asyncHandler(async (_req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');

  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

/* =========================
   GET CURRENT USER
========================= */
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    throw new ApiError(401, 'Not authenticated');
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
        'User fetched successfully'
      )
    );
});

/* =========================
   GET SIGN URL FOR UPLOAD
========================= */

export const getSignUrlImageKit = asyncHandler(async (req, res) => {
  // 🔒 Authorization check
  if (!req.user || req.user.role !== 'admin') {
    throw new ApiError(403, 'Forbidden: Admin access required');
  }

  // 📦 Optional: how many uploads client wants
  const count = Number(req.query.count) || 1;

  if (count > 10) {
    throw new ApiError(400, 'You can request max 10 upload tokens at once');
  }

  // ⚡ Generate tokens
  const authParams = generateImageKitSignUrl(count);

  res.status(200).json(new ApiResponse(200, authParams, 'Upload auth parameters generated'));
});


/* =========================
   REFRESH ACCESS TOKEN
========================= */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refresh_token || req.body.refresh_token;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    ) as jwt.JwtPayload & { id: string; email: string; role: string };

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, decodedToken.id))
      .limit(1);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user.refresh_token) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const { access_token, refresh_token } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    await db
      .update(usersTable)
      .set({ access_token, refresh_token })
      .where(eq(usersTable.id, user.id));

    // Set HttpOnly cookies
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json(
      new ApiResponse(
        200,
        { access_token, refresh_token },
        "Access token refreshed"
      )
    );
  } catch (error) {
    throw new ApiError(401, (error as Error)?.message || "Invalid refresh token");
  }
});
