importScripts('https://docs.opencv.org/4.10.0/opencv.js');

onmessage = function(e) {
    if (typeof cv === 'undefined' || !cv.Mat) return;

    const imageData = e.data;
    const src = cv.matFromImageData(imageData);
    const gray = new cv.Mat();
    const blurred = new cv.Mat();
    const edges = new cv.Mat();
    const mask = new cv.Mat(src.rows, src.cols, cv.CV_8UC4, [0, 0, 0, 0]);

    cv.flip(src, src, 1);
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Core Laplacian Logic
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Laplacian(blurred, edges, cv.CV_8U, 5);
    
    // Otsu Thresholding
    cv.threshold(edges, edges, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

    // Apply color
    src.copyTo(mask, edges);

    const output = new ImageData(new Uint8ClampedArray(mask.data), mask.cols, mask.rows);
    postMessage(output, [output.data.buffer]);

    src.delete(); gray.delete(); blurred.delete(); edges.delete(); mask.delete();
};
