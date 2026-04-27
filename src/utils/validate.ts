const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
const NAME_REGEX = /^[a-zA-Z\s]{2,50}$/;
const OTP_REGEX = /^\d{6}$/;

export const isValidEmail = (email: string) => EMAIL_REGEX.test(email);
export const isValidPassword = (password: string) => PASSWORD_REGEX.test(password);
export const isValidName = (name: string) => NAME_REGEX.test(name);
export const isValidOtp = (otp: string) => OTP_REGEX.test(otp);

export const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
