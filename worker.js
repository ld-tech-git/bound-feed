importScripts('https://docs.opencv.org/4.10.0/opencv.js');

cv['onRuntimeInitialized'] = () => { postMessage("READY"); };

onmessage = function(e) {
    if (e.data === "READY" || !cv.Mat) return;

    // Destructure data from the main thread
    const { img, blur, kSize, dilate } = e.data;
    let src = cv.matFromImageData(img);
    
    // Mirror the feed
    cv.flip(src, src, 1);

    let gray = new cv.Mat();
    let blurred = new cv.Mat();
    let edges = new cv.Mat();
    // Initialize black mask
    let mask = new cv.Mat(src.rows, src.cols, cv.CV_8UC4, [0, 0, 0, 255]);

    // Step 1: Grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Step 2: Smoothing (Reduces facial dots/noise)
    cv.GaussianBlur(gray, blurred, new cv.Size(blur, blur), 0);
    
    // Step 3: Laplacian Edge Detection with chosen thickness
    cv.Laplacian(blurred, edges, cv.CV_8U, kSize);
    
    // Step 4: Automatic Thresholding
    cv.threshold(edges, edges, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

    // Step 5: Dilation (Line expansion for visibility)
    if (dilate > 0) {
        let M = cv.Mat.ones(dilate + 1, dilate + 1, cv.CV_8U);
        cv.dilate(edges, edges, M);
        M.delete();
    }

    // Step 6: Map original colors only to the edges
    src.copyTo(mask, edges);

    // Prepare and return data
    const output = new ImageData(new Uint8ClampedArray(mask.data), mask.cols, mask.rows);
    postMessage(output, [output.data.buffer]);

    // Final Memory Cleanup
    src.delete(); gray.delete(); blurred.delete(); edges.delete(); mask.delete();
};
