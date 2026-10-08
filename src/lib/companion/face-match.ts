import "server-only";
import path from "node:path";

/**
 * Free, self-hosted face detection with face-api (TensorFlow.js on WebAssembly,
 * so there's no native build step and no external service or API key). Used by
 * photo moderation; matching a selfie to the photos is done by an admin.
 * Models ship inside the npm package and load once, on the first check
 * (about 0.3 s); each photo then takes roughly a second.
 */

type FaceApi = typeof import("@vladmandic/face-api/dist/face-api.node-wasm.js");

/** `share` is the face's width as a fraction of the image width; `age` is a rough estimate. */
export type Face = { descriptor: Float32Array; score: number; width: number; share: number; age: number };

const MODULES = path.join(process.cwd(), "node_modules");
/** Images are scaled to fit this box before detection; plenty for a face and much faster. */
const MAX_SIDE = 640;

let ready: Promise<FaceApi> | undefined;

/** Load TensorFlow (WebAssembly) and the face models once; also used by photo moderation. */
export function loadModels() {
  ready ??= (async () => {
    const tf = await import("@tensorflow/tfjs");
    const wasm = await import("@tensorflow/tfjs-backend-wasm");
    const faceapi: FaceApi = await import("@vladmandic/face-api/dist/face-api.node-wasm.js");

    // Serve the .wasm binaries from node_modules instead of a CDN.
    wasm.setWasmPaths(path.join(MODULES, "@tensorflow/tfjs-backend-wasm/dist") + path.sep);
    await tf.setBackend("wasm");
    await tf.ready();

    const models = path.join(MODULES, "@vladmandic/face-api/model");
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(models);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(models);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(models);
    await faceapi.nets.ageGenderNet.loadFromDisk(models);
    return faceapi;
  })().catch((error) => {
    ready = undefined; // try again next time
    throw error;
  });
  return ready;
}

/** Every face found in an image (JPEG, PNG or WebP), largest first. */
export async function findFaces(image: Buffer): Promise<Face[]> {
  const faceapi = await loadModels();
  const { default: sharp } = await import("sharp");
  const { data, info } = await sharp(image)
    .rotate() // respect EXIF orientation
    .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const tensor = faceapi.tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], "int32");
  try {
    const results = await faceapi
      .detectAllFaces(tensor as never, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withAgeAndGender();
    return results
      .map((r) => ({
        descriptor: r.descriptor,
        score: r.detection.score,
        width: r.detection.box.width,
        share: r.detection.box.width / info.width,
        age: r.age,
      }))
      .sort((a, b) => b.width - a.width);
  } finally {
    tensor.dispose();
  }
}
