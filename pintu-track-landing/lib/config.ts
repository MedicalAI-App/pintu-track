// URL aplikasi PintuTrack — di produksi diisi lewat build variable Coolify
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

export const SIGNUP_URL = `${APP_URL}/masuk`;
