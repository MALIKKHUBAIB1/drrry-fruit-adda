import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import { sameOrigin } from "@/lib/server/security";
import { imagekit } from "@/lib/server/imagekit";

export const runtime = "nodejs";

// Max upload size (10 MB) — bahut bada file CDN pe jane nahi dena.
const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
  ["image/gif", "gif"],
  ["image/svg+xml", "svg"],
]);

// POST /api/admin/upload  (multipart/form-data, field name: file)
// Admin hi upload kar sakta hai. Private key sirf server me rehti hai.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided (field name must be 'file')." }, { status: 400 });
  }

  // Folder: dryfruitadda/{year}/{category} — images year aur category dono
  // hisaab se track rehti hain. Category client se aati hai (admin product
  // form se), sanitize karke path me use hoti hai.
  const year = new Date().getFullYear();
  const rawCat = String(form.get("category") ?? "").trim().toLowerCase();
  const category =
    rawCat.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "uncategorised";
  const folder = `/dryfruitadda/${year}/${category}`;

  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return NextResponse.json(
      { error: `Unsupported file type "${file.type}". Allowed: ${[...ALLOWED.keys()].join(", ")}` },
      { status: 415 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.` },
      { status: 413 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());

  // Unique name — same naam se image overwrite na ho jaye (cache poison risk).
  const base = (file.name || "image")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "image";
  const fileName = `${base}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

  try {
    const res = await imagekit().upload({
      file: buf,
      fileName,
      folder,
      useUniqueFileName: true,
    });

    return NextResponse.json({
      ok: true,
      url: res.url,
      fileId: res.fileId,
      thumbnail: res.thumbnailUrl ?? null,
      width: res.width ?? null,
      height: res.height ?? null,
      bytes: file.size,
      name: fileName,
      folder,
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "imagekit upload failed",
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return NextResponse.json({ error: "Upload failed." }, { status: 502 });
  }
}
