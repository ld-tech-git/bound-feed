importScripts('https://docs.opencv.org/4.10.0/opencv.js');

cv['onRuntimeInitialized'] = () => { postMessage("READY"); };

onmessage = function(e) {
    if (e.data === "READY" || !cv.Mat) return;

    const { img, panel, blur, k, sense, isFront } = e.data;
    let src = cv.matFromImageData(img);
    if (isFront) cv.flip(src, src, 1);

    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    let blurred = new cv.Mat();
    let edges = new cv.Mat();

    if (panel === 'A') {
        // PANEL A: Gaussian + Normalize + Otsu (Modern Smooth)
        cv.normalize(gray, gray, 0, 255, cv.NORM_MINMAX);
        let ksize = new cv.Size(blur, blur);
        cv.GaussianBlur(gray, blurred, ksize, 0);
        cv.Laplacian(blurred, edges, cv.CV_8U, k);
        
        let otsuVal = cv.threshold(edges, new cv.Mat(), 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
        cv.threshold(edges, edges, otsuVal * sense, 255, cv.THRESH_BINARY);
    } else {
        // PANEL B: Median + Fixed (Classic Harsh)
        cv.medianBlur(gray, blurred, blur);
        cv.Laplacian(blurred, edges, cv.CV_8U, k);
        cv.threshold(edges, edges, sense, 255, cv.THRESH_BINARY);
    }

    let mask = new cv.Mat(src.rows, src.cols, cv.CV_8UC4, [0, 0, 0, 255]);
    src.copyTo(mask, edges);

    const output = new ImageData(new Uint8ClampedArray(mask.data), mask.cols, mask.rows);
    postMessage(output, [output.data.buffer]);

    // Cleanup
    src.delete(); gray.delete(); blurred.delete(); edges.delete(); mask.delete();
};
