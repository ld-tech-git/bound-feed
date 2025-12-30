importScripts('https://docs.opencv.org/4.10.0/opencv.js');

cv['onRuntimeInitialized'] = () => { postMessage("READY"); };

onmessage = function(e) {
    if (e.data === "READY" || !cv.Mat) return;

    const { img, blur, kSize, dilate, sense } = e.data;
    let src = cv.matFromImageData(img);
    cv.flip(src, src, 1);

    let gray = new cv.Mat(), blurred = new cv.Mat(), edges = new cv.Mat();
    let mask = new cv.Mat(src.rows, src.cols, cv.CV_8UC4, [0, 0, 0, 255]);

    // Step 1: Grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Step 2: Fix Dark Feed (Stretches brightness to 0-255 range)
    cv.normalize(gray, gray, 0, 255, cv.NORM_MINMAX);
    
    // Step 3: Skin Detail Smoothing
    cv.GaussianBlur(gray, blurred, new cv.Size(blur, blur), 0);
    
    // Step 4: Laplacian Edge Math
    cv.Laplacian(blurred, edges, cv.CV_8U, kSize);
    
    try {
        // Step 5: Sensitivity Adjusted Thresholding
        let otsuVal = cv.threshold(edges, new cv.Mat(), 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
        cv.threshold(edges, edges, otsuVal * sense, 255, cv.THRESH_BINARY);
        
        // Step 6: Line Boldness
        if (dilate > 0) {
            let M = cv.Mat.ones(dilate + 1, dilate + 1, cv.CV_8U);
            cv.dilate(edges, edges, M);
            M.delete();
        }

        // Apply original color mask
        src.copyTo(mask, edges);
    } catch(err) { }

    const output = new ImageData(new Uint8ClampedArray(mask.data), mask.cols, mask.rows);
    postMessage(output, [output.data.buffer]);

    // Cleanup memory
    src.delete(); gray.delete(); blurred.delete(); edges.delete(); mask.delete();
};
