importScripts('https://docs.opencv.org/4.10.0/opencv.js');

let src = null, gray = null, blurred = null, edges = null, mask = null;
let W = 0, H = 0;
let isResetting = false;

cv.onRuntimeInitialized = () => postMessage("READY");

function safeCleanup() {
  isResetting = true;
  [src, gray, blurred, edges, mask].forEach(m => {
    try { m && m.delete(); } catch {}
  });
  src = gray = blurred = edges = mask = null;
  W = H = 0;
  isResetting = false;
}

onmessage = e => {
  const data = e.data;

  if (data === "PING") {
    postMessage("PONG");
    return;
  }

  if (data === "SOFT_RESET") {
    safeCleanup();
    return;
  }

  try {
    if (isResetting) return;

    const { img, panel, blur, k, sense, isFront, oldCode } = data;

    if (img.width !== W || img.height !== H || !src) {
      safeCleanup();
      src = new cv.Mat(img.height, img.width, cv.CV_8UC4);
      gray = new cv.Mat();
      blurred = new cv.Mat();
      edges = new cv.Mat();
      mask = new cv.Mat(img.height, img.width, cv.CV_8U);
      W = img.width;
      H = img.height;
    }

    src.data.set(img.data);
    if (isFront) cv.flip(src, src, 1);
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    let bVal = blur | 1;

    if (panel === 'A') {
      cv.normalize(gray, gray, 0, 255, cv.NORM_MINMAX);
      cv.GaussianBlur(gray, blurred, new cv.Size(bVal, bVal), 0);
      cv.Laplacian(blurred, edges, cv.CV_8U, k || 3);

      const tmp = new cv.Mat();
      const otsu = cv.threshold(edges, tmp, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
      cv.threshold(edges, edges, otsu * (sense || 0.9), 255, cv.THRESH_BINARY);
      tmp.delete();
    } else {
      if (oldCode) {
        cv.GaussianBlur(gray, blurred, new cv.Size(5,5), 0);
        cv.Laplacian(blurred, edges, cv.CV_8U, 5);
        cv.threshold(edges, edges, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
      } else {
        cv.medianBlur(gray, blurred, bVal);
        cv.Laplacian(blurred, edges, cv.CV_8U, k || 3);
        cv.threshold(edges, edges, sense || 40, 255, cv.THRESH_BINARY);
      }
    }

    mask.setTo(0);
    src.copyTo(mask, edges);
    cv.cvtColor(mask, mask, cv.COLOR_GRAY2RGBA);

    const out = new ImageData(
      new Uint8ClampedArray(mask.data.slice()),
      W,
      H
    );

    postMessage(out, [out.data.buffer]);

  } catch {
    safeCleanup();
    postMessage("RECOVER");
  }
};
