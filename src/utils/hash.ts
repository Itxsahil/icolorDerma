import bcrypt from 'bcryptjs';

export const hashPassword = async ({ textPassword }: { textPassword: string }) =>
  await bcrypt.hash(textPassword, 10);

export const isPasswordValid = async ({
  textPass,
  hashPass,
}: {
  textPass: string;
  hashPass: string;
}) => await bcrypt.compare(textPass, hashPass);
