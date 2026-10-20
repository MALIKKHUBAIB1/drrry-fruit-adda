import "server-only";
import ImageKit from "imagekit";

// ImageKit — CDN + upload. Keys .env se (gitignored). Upload/admin routes
// is module ko import karte hain; client components sirf returned URL use
// karte hain (private key kabhi bundle me nahi jaati).
const publicKey = process.env.PUBLIC_KEY?.trim();
const privateKey = process.env.PRIVATE_KEY?.trim();
const urlEndpoint = process.env.IMAGEKIT_CDN?.trim();

if (!publicKey || !privateKey || !urlEndpoint) {
  throw new Error(
    "ImageKit not configured. PUBLIC_KEY, PRIVATE_KEY and IMAGEKIT_CDN must be set in .env",
  );
}
// Narrowing closure me nahi hoti — const me copy karke TS ko batana padta hai.
const PK: string = publicKey;
const SK: string = privateKey;
const UE: string = urlEndpoint;

let instance: ImageKit | null = null;

export function imagekit(): ImageKit {
  if (!instance) {
    instance = new ImageKit({ publicKey: PK, privateKey: SK, urlEndpoint: UE });
  }
  return instance;
}

export function imagekitConfigured(): boolean {
  return Boolean(PK && SK && UE);
}

// Uploaded images is folder me jayengi (Atlas/CDN side segregate rehta hai).
export const UPLOAD_FOLDER = "dryfruitadda/products";
