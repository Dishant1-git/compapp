import "server-only";
import { createRequire } from "node:module";
import path from "node:path";
import { findFaces, loadModels, type Face } from "./face-match";

/**
 * Automatic checks on profile photos before they're saved: free and self-hosted,
 * like the face match, with no admin in the loop. Rejections carry a reason the
 * user can act on.
 *
 * Covered: nudity and sexual content (NSFWJS), possible minors (face-api's age
 * estimate), no clear face or no clear main person, too many people, faces too
 * small to see, and blurry, dark, washed-out, tiny or badly stretched images.
 * Not covered: weapons, drugs, gore, hate symbols and AI-generated images, which
 * need a general vision model to spot reliably.
 */

type Check = { ok: true } | { ok: false; reason: string };
/** `faces` is every face found in an accepted photo, so the selfie check can reuse them. */
export type ModerationResult = { ok: true; faces: Face[] } | { ok: false; reason: string };

/** Smallest side, in px, of a usable photo. The upload step resizes to 1280. */
const MIN_SIDE = 320;
/** Longest side over shortest side; beyond this the photo looks stretched or is a strip. */
const MAX_ASPECT = 2.5;
/** Mean brightness (0–255) of the greyscale image. */
const MIN_BRIGHTNESS = 25;
const MAX_BRIGHTNESS = 230;
/** Spread of brightness; below this the image is nearly one flat colour. */
const MIN_CONTRAST = 12;
/** Edge strength (Laplacian spread at 512 px); below this the photo is too blurry. */
const MIN_SHARPNESS = 6;

/**
 * Likelihood of explicit content (NSFWJS "Porn" + "Hentai") that's rejected.
 * "Sexy" (revealing but clothed, like swimwear or going-out outfits) is allowed.
 */
const MAX_EXPLICIT = 0.6;

/** Faces less certain or smaller (px, at 640) than this don't count as clear. */
const MIN_SCORE = 0.8;
const MIN_WIDTH = 40;
/** The main face must be at least this share of the image width. */
const MIN_FACE_SHARE = 0.08;
/** The main face must be this much wider than the next, so it's clear who it is. */
const MAIN_FACE_RATIO = 1.4;
const MAX_PEOPLE = 3;
/**
 * Estimated age below which a photo is rejected. The estimate is often several
 * years off, so this sits below 18 to avoid turning away young-looking adults.
 */
const MIN_ESTIMATED_AGE = 16;

const reject = (reason: string) => ({ ok: false as const, reason });

/** Check a profile photo. Throws if a check itself fails, so the caller can ask them to retry. */
export async function moderatePhoto(image: Buffer): Promise<ModerationResult> {
  const quality = await checkQuality(image);
  if (!quality.ok) return quality;

  const nudity = await checkNudity(image);
  if (!nudity.ok) return nudity;

  return checkFaces(image);
}

async function checkQuality(image: Buffer): Promise<Check> {
  const { default: sharp } = await import("sharp");
  const { width = 0, height = 0 } = await sharp(image).metadata();
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  if (long / short > MAX_ASPECT) return reject("This photo is stretched or cropped too thin. Use a normal photo.");
  if (short < MIN_SIDE) return reject("This photo is too small. Use a larger, sharper one.");

  const { data, info } = await sharp(image)
    .rotate()
    .resize(512, 512, { fit: "inside" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { mean, spread } = pixelStats(data);
  const flat = spread < MIN_CONTRAST;
  if (mean < MIN_BRIGHTNESS || (flat && mean < 80)) return reject("This photo is too dark. Use one taken in better light.");
  if (mean > MAX_BRIGHTNESS || (flat && mean > 170)) {
    return reject("This photo is too bright or washed out. Use one in softer light.");
  }
  if (flat) return reject("This photo is almost blank. Use a clear photo of yourself.");
  if (sharpness(data, info.width, info.height) < MIN_SHARPNESS) {
    return reject("This photo is too blurry or distorted. Use a sharper one.");
  }
  return { ok: true };
}

/** Mean and standard deviation of greyscale pixel values. */
function pixelStats(px: Uint8Array | Buffer) {
  let sum = 0;
  let squares = 0;
  for (const v of px) {
    sum += v;
    squares += v * v;
  }
  const mean = sum / px.length;
  return { mean, spread: Math.sqrt(Math.max(0, squares / px.length - mean * mean)) };
}

/** Standard deviation of the Laplacian (edge strength); low means blurry. */
function sharpness(px: Uint8Array | Buffer, w: number, h: number) {
  let sum = 0;
  let squares = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = px[i - w] + px[i + w] + px[i - 1] + px[i + 1] - 4 * px[i];
      sum += lap;
      squares += lap * lap;
      n++;
    }
  }
  const mean = sum / n;
  return Math.sqrt(Math.max(0, squares / n - mean * mean));
}

type Nsfw = Awaited<ReturnType<typeof import("nsfwjs").load>>;
let nsfw: Promise<Nsfw> | undefined;

/**
 * NSFWJS's MobileNetV2, loaded once. The model files are handed over directly:
 * the library's own loader copies the 3.5 MB of weights one character at a time,
 * which takes about four seconds (ten times longer than everything else here).
 */
function loadNsfw() {
  nsfw ??= (async () => {
    const { load } = await import("nsfwjs/core");
    const { MobileNetV2Model } = await import("nsfwjs/models/mobilenet_v2");
    const files = path.join(process.cwd(), "node_modules/nsfwjs/dist/models/mobilenet_v2");
    const read = createRequire(path.join(files, "index.js"));
    return load("MobileNetV2", {
      modelDefinitions: [
        {
          ...MobileNetV2Model,
          modelJson: async () => ({ default: read("./model.min.js") }),
          weightBundles: [async () => ({ default: read("./group1-shard1of1.min.js") })],
        },
      ],
    });
  })().catch((error) => {
    nsfw = undefined; // try again next time
    throw error;
  });
  return nsfw;
}

/** Load every model now, so the first person to upload a photo doesn't wait for it. */
export async function warmUp() {
  await loadModels();
  await loadNsfw();
}

async function checkNudity(image: Buffer): Promise<Check> {
  const faceapi = await loadModels(); // sets up the shared TensorFlow backend
  const model = await loadNsfw();

  const { default: sharp } = await import("sharp");
  // Centre square: the model squashes anything else, which skews its scores.
  const { data, info } = await sharp(image)
    .rotate()
    .resize(224, 224, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const tensor = faceapi.tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], "int32");
  try {
    const predictions = await model.classify(tensor as never, 5);
    const p = (name: string) => predictions.find((x) => x.className === name)?.probability ?? 0;
    if (p("Porn") + p("Hentai") >= MAX_EXPLICIT) {
      return reject("This photo looks like it has nudity or sexual content, which isn't allowed.");
    }
    return { ok: true };
  } finally {
    tensor.dispose();
  }
}

async function checkFaces(image: Buffer): Promise<ModerationResult> {
  const found = await findFaces(image);
  const faces = found.filter((f) => f.score >= MIN_SCORE && f.width >= MIN_WIDTH);
  const [main, next] = faces;
  if (!main) return reject("We couldn't find a clear face. Use a photo where your face is easy to see.");
  if (faces.length > MAX_PEOPLE) return reject("There are too many people in this photo. Use one of just you.");
  if (next && main.width < next.width * MAIN_FACE_RATIO) {
    return reject("It isn't clear which person is you. Use a photo where you're the main person.");
  }
  if (main.share < MIN_FACE_SHARE) return reject("Your face is too small in this photo. Use a closer one.");
  if (faces.some((f) => f.age < MIN_ESTIMATED_AGE)) {
    return reject("This photo looks like it may include someone under 18, which isn't allowed.");
  }
  return { ok: true, faces: found };
}
