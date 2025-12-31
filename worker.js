importScripts('https://docs.opencv.org/4.10.0/opencv.js');

// PERSISTENT MEMORY POOL: Allocated once, reused every frame to prevent heap bloat
let src, gray, blurred, edges, mask;
let isInitialized = false;

cv['onRuntimeInitialized'] = () => { postMessage("READY"); };

onmessage = function(e) {
    if (e.data === "READY" || !cv.Mat) return;

    try {
        const { img, panel, blur, k, sense, isFront, oldCode } = e.data;
        
        // Initialize Mats only once
        if (!isInitialized) {
            src = new cv.Mat(img.height, img.width, cv.CV_8UC4);
            gray = new cv.Mat();
            blurred = new cv.Mat();
            edges = new cv.Mat();
            mask = new cv.Mat(img.height, img.width, cv.CV_8UC4, [0, 0, 0, 255]);
            isInitialized = true;
        }

        // Load image data into existing Mat
        src.data.set(img.data);
        if (isFront) cv.flip(src, src, 1);

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        // STABILITY FIX: Ensure kernel size is odd
        let kSize = (blur || 3);
        if (kSize % 2 === 0) kSize += 1;

        if (panel === 'A') {
            cv.normalize(gray, gray, 0, 255, cv.NORM_MINMAX);
            cv.GaussianBlur(gray, blurred, new cv.Size(kSize, kSize), 0);
            cv.Laplacian(blurred, edges, cv.CV_8U, k || 3);
            let otsuVal = cv.threshold(edges, new cv.Mat(), 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
            cv.threshold(edges, edges, otsuVal * (sense || 0.9), 255, cv.THRESH_BINARY);
        } else {
            if (oldCode) {
                cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
                cv.Laplacian(blurred, edges, cv.CV_8U, 5);
                cv.threshold(edges, edges, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
            } else {
                cv.medianBlur(gray, blurred, kSize);
                cv.Laplacian(blurred, edges, cv.CV_8U, k || 3);
                cv.threshold(edges, edges, sense || 40, 255, cv.THRESH_BINARY);
            }
        }

        // Wipe mask with black then copy edges
        mask.setTo(new cv.Scalar(0, 0, 0, 255));
        src.copyTo(mask, edges);

        const output = new ImageData(new Uint8ClampedArray(mask.data), mask.cols, mask.rows);
        postMessage(output, [output.data.buffer]);

    } catch (err) {
        console.error("Worker Error:", err);
        // RECOVERY: Tell main thread to unlock even if processing failed
        postMessage("RECOVER");
    }
};
