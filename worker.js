importScripts('https://docs.opencv.org/4.10.0/opencv.js');

// These will hold our persistent memory to prevent heap bloat
let src, gray, blurred, edges, mask;
let isInitialized = false;

cv['onRuntimeInitialized'] = () => { 
    postMessage("READY"); 
};

onmessage = function(e) {
    if (e.data === "READY") return;

    try {
        const { img, panel, blur, k, sense, isFront, oldCode } = e.data;
        
        // Initializing Mats only once to fix the memory/FPS issue
        if (!isInitialized && typeof cv !== 'undefined' && cv.Mat) {
            src = new cv.Mat(img.height, img.width, cv.CV_8UC4);
            gray = new cv.Mat();
            blurred = new cv.Mat();
            edges = new cv.Mat();
            mask = new cv.Mat(img.height, img.width, cv.CV_8UC4, [0, 0, 0, 255]);
            isInitialized = true;
        }

        if (!isInitialized) return;

        // Reuse existing Mat memory
        src.data.set(img.data);
        if (isFront) cv.flip(src, src, 1);

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        // STABILITY FIX: OpenCV requires odd numbers for blur kernels
        let bVal = (blur || 3);
        if (bVal % 2 === 0) bVal += 1;

        if (panel === 'A') {
            cv.normalize(gray, gray, 0, 255, cv.NORM_MINMAX);
            cv.GaussianBlur(gray, blurred, new cv.Size(bVal, bVal), 0);
            cv.Laplacian(blurred, edges, cv.CV_8U, k || 3);
            let otsuVal = cv.threshold(edges, new cv.Mat(), 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
            cv.threshold(edges, edges, otsuVal * (sense || 0.9), 255, cv.THRESH_BINARY);
        } else {
            if (oldCode) {
                cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
                cv.Laplacian(blurred, edges, cv.CV_8U, 5);
                cv.threshold(edges, edges, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
            } else {
                cv.medianBlur(gray, blurred, bVal);
                cv.Laplacian(blurred, edges, cv.CV_8U, k || 3);
                cv.threshold(edges, edges, sense || 40, 255, cv.THRESH_BINARY);
            }
        }

        // Reset mask and copy edges
        mask.setTo(new cv.Scalar(0, 0, 0, 255));
        src.copyTo(mask, edges);

        const output = new ImageData(new Uint8ClampedArray(mask.data), mask.cols, mask.rows);
        postMessage(output, [output.data.buffer]);

    } catch (err) {
        console.error("Worker Error:", err);
        postMessage("RECOVER");
    }
};
