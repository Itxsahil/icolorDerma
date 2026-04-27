import ImageKit from '@imagekit/nodejs';

const client = new ImageKit({
  privateKey: process.env.IMGKIT_PRIV_KEY!,
});

export const generateImageKitSignUrl = (count: number = 1) => {
  const urls = [];

  for (let i = 0; i < count; i++) {
    const { token, expire, signature } = client.helper.getAuthenticationParameters();

    urls.push({
      token,
      expire,
      signature,
      publicKey: process.env.IMGKIT_PUB_KEY,
    });
  }

  return urls;
};
