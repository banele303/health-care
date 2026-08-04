import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { api } from "./_generated/api";

const http = httpRouter();

// Registers /.well-known/jwks.json, /.well-known/openid-configuration,
// /api/auth/* (sign-in, sign-up, sign-out, session refresh).
auth.addHttpRoutes(http);

// --- Image proxy: serves raw image bytes from Convex storage ---
// Convex storage URLs return multipart/form-data which <img> can't render.
// GET /image/<storageId> -> raw JPEG/PNG/WebP
http.route({
  pathPrefix: "/image/",
  method: "GET",
  handler: httpAction(async ({ runQuery }, request) => {
    const path = request.url.split("/image/")[1] || "";
    const storageId = decodeURIComponent(path).split("?")[0];
    if (!storageId) return new Response("Missing storage id", { status: 400 });

    const url: any = await runQuery(api.files.getUrl, { storageId });
    if (!url) return new Response("Not found", { status: 404 });

    const resp = await fetch(url);
    if (!resp.ok) return new Response("Upstream error", { status: 502 });
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);

    // Detect image type from binary signature
    let contentType = "application/octet-stream";
    if (bytes.length >= 2) {
      if (bytes[0] === 0xff && bytes[1] === 0xd8) contentType = "image/jpeg";
      else if (bytes[0] === 0x89 && bytes[1] === 0x50) contentType = "image/png";
      else if (bytes[0] === 0x52 && bytes[1] === 0x49) contentType = "image/webp";
      else if (bytes[0] === 0x47 && bytes[1] === 0x49) contentType = "image/gif";
    }

    return new Response(buf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }),
});

// --- Polar webhook removed (billing disabled for now) ---

export default http;
