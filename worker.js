importScripts('https://docs.opencv.org/4.10.0/opencv.js');

cv['onRuntimeInitialized'] = () => { postMessage("READY"); };

onmessage = function(e) {
    if (e.data === "READY" || !cv.Mat) return;

    const { img, panel, blur, k, sense, isFront } = e.data;
    let src = cv.matFromImageData(img);
    if (isFront) cv.flip(src, src, 1);

    let gray = new cv.Mat(), blurred = new cv.Mat(), edges = new cv.Mat();
    let mask = new cv.Mat(src.rows, src.cols, cv.CV_8UC4, [0, 0, 0, 255]);

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    if (panel === 'A') {
        // PANEL A LOGIC: Gaussian + Normalize + Otsu
        cv.normalize(gray, gray, 0, 255, cv.NORM_MINMAX);
        if (blur > 1) cv.GaussianBlur(gray, blurred, new cv.Size(blur, blur), 0);
        else gray.copyTo(blurred);
        
        cv.Laplacian(blurred, edges, cv.CV_8U, k);
        let otsuVal = cv.threshold(edges, new cv.Mat(), 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
        cv.threshold(edges, edges, otsuVal * sense, 255, cv.THRESH_BINARY);
    } else {
        // PANEL B LOGIC: Median + Fixed Threshold
        if (blur > 1) cv.medianBlur(gray, blurred, blur);
        else gray.copyTo(blurred);
        
        cv.Laplacian(blurred, edges, cv.CV_8U, k);
        cv.threshold(edges, edges, sense, 255, cv.THRESH_BINARY);
    }

    src.copyTo(mask, edges);
    const output = new ImageData(new Uint8ClampedArray(mask.data), mask.cols, mask.rows);
    postMessage(output, [output.data.buffer]);

    src.delete(); gray.delete(); blurred.delete(); edges.delete(); mask.delete();
};
