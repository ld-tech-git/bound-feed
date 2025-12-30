importScripts('https://docs.opencv.org/4.10.0/opencv.js');

cv['onRuntimeInitialized'] = () => {
    postMessage("READY");
};

onmessage = function(e) {
    if (e.data === "READY" || !cv.Mat) return;

    // Load incoming image data
    let src = cv.matFromImageData(e.data);
    
    // Create necessary Mats
    let gray = new cv.Mat();
    let blurred = new cv.Mat();
    let edges = new cv.Mat();
    let mask = new cv.Mat(src.rows, src.cols, cv.CV_8UC4, [0, 0, 0, 0]);

    // Apply EXACT logic chain
    cv.flip(src, src, 1); // Mirror
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY); // Grayscale
    
    // THE FILTER CHAIN
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Laplacian(blurred, edges, cv.CV_8U, 5); // ksize 5
    
    // Otsu Thresholding
    cv.threshold(edges, edges, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

    // Apply color from original (src) back to the detected edges
    src.copyTo(mask, edges);

    // Prepare and send back
    const output = new ImageData(new Uint8ClampedArray(mask.data), mask.cols, mask.rows);
    postMessage(output, [output.data.buffer]);

    // Memory Cleanup (Required to prevent browser tab crash)
    src.delete(); gray.delete(); blurred.delete(); edges.delete(); mask.delete();
};
