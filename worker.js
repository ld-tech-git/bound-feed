importScripts('https://docs.opencv.org/4.10.0/opencv.js');

cv['onRuntimeInitialized'] = () => { postMessage("READY"); };

onmessage = function(e) {
    if (e.data === "READY" || !cv.Mat) return;

    const { img, blur, kSize, sense, isFront } = e.data;
    let src = cv.matFromImageData(img);
    
    // Feature: Mirror only the selfie camera
    if (isFront) cv.flip(src, src, 1);

    let gray = new cv.Mat(), blurred = new cv.Mat(), edges = new cv.Mat();
    let mask = new cv.Mat(src.rows, src.cols, cv.CV_8UC4, [0, 0, 0, 255]);

    // 1. Grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // 2. Feature: Fix dark rooms
    cv.normalize(gray, gray, 0, 255, cv.NORM_MINMAX);
    
    // 3. Feature: Smooth skin (Gaussian)
    cv.GaussianBlur(gray, blurred, new cv.Size(blur, blur), 0);
    
    // 4. Edge Detection
    cv.Laplacian(blurred, edges, cv.CV_8U, kSize);
    
    try {
        // 5. Sensitivity threshold
        let otsuVal = cv.threshold(edges, new cv.Mat(), 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
        cv.threshold(edges, edges, otsuVal * sense, 255, cv.THRESH_BINARY);

        // Apply original colors to found edges
        src.copyTo(mask, edges);
    } catch(err) { }

    const output = new ImageData(new Uint8ClampedArray(mask.data), mask.cols, mask.rows);
    postMessage(output, [output.data.buffer]);

    // Feature: Strict memory flush to prevent blackouts
    src.delete(); gray.delete(); blurred.delete(); edges.delete(); mask.delete();
};
