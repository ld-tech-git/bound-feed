importScripts('https://docs.opencv.org/4.10.0/opencv.js');

let src, gray, blurred, edges, mask;
let W = 0, H = 0;
let lastReset = performance.now();

cv.onRuntimeInitialized = () => postMessage("READY");

function cleanup() {
  [src, gray, blurred, edges, mask].forEach(m => m && m.delete());
  src = gray = blurred = edges = mask = null;
  W = H = 0;
}

onmessage = e => {
  if (e.data === "PING") return postMessage("PONG");
  if (e.data === "SOFT_RESET") return cleanup();

  try {
    const { img, panel, blur, k, sense, isFront, oldCode } = e.data;

    if (img.width !== W || img.height !== H) {
      cleanup();
      src = new cv.Mat(img.height, img.width, cv.CV_8UC4);
      gray = new cv.Mat();
      blurred = new cv.Mat();
      edges = new cv.Mat();
      mask = new cv.Mat(img.height, img.width, cv.CV_8U);
      W = img.width; H = img.height;
    }

    src.data.set(img.data);
    if (isFront) cv.flip(src, src, 1);
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    let b = blur | 1;
    if (panel === 'A') {
      cv.GaussianBlur(gray, blurred, new cv.Size(b, b), 0);
      cv.Laplacian(blurred, edges, cv.CV_8U, Math.min(k || 3, 3));

      let tmp = new cv.Mat();
      let t = cv.threshold(edges, tmp, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
      cv.threshold(edges, edges, t * (sense || 0.9), 255, cv.THRESH_BINARY);
      tmp.delete();
    } else {
      if (oldCode) {
        cv.GaussianBlur(gray, blurred, new cv.Size(5,5),0);
        cv.Laplacian(blurred, edges, cv.CV_8U,3);
        cv.threshold(edges, edges, 0,255,cv.THRESH_BINARY+cv.THRESH_OTSU);
      } else {
        cv.medianBlur(gray, blurred, Math.min(b,5));
        cv.Laplacian(blurred, edges, cv.CV_8U,3);
        cv.threshold(edges, edges, sense || 40,255,cv.THRESH_BINARY);
      }
    }

    mask.setTo(0);
    src.copyTo(mask, edges);
    cv.cvtColor(mask, mask, cv.COLOR_GRAY2RGBA);

    const out = new ImageData(new Uint8ClampedArray(mask.data.slice()), W, H);
    postMessage(out, [out.data.buffer]);

  } catch {
    cleanup();
    postMessage("RECOVER");
  }
};
