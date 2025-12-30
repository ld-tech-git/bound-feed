let isBusy = false;

self.onmessage = function(e) {
    if (isBusy) return; 
    isBusy = true;

    const { img, panel, scale, blur, sense, k, oldCode, isFront } = e.data;
    const data = img.data;
    const w = img.width;
    const h = img.height;
    const copy = new Uint8ClampedArray(data);

    // --- LAPLACIAN LOGIC ---
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            
            // Kernel convolution (kSize thickness)
            let sum = 0;
            const neighbors = [
                ((y - k) * w + x) * 4,
                ((y + k) * w + x) * 4,
                (y * w + (x - k)) * 4,
                (y * w + (x + k)) * 4
            ];

            for(let n of neighbors) {
                if(n >= 0 && n < data.length) sum += copy[n];
            }
            
            let val = Math.abs(copy[idx] * 4 - sum) * sense;
            
            // Apply blur/strength logic
            if (val < (blur * 5)) val = 0;

            data[idx] = data[idx+1] = data[idx+2] = val;
            data[idx+3] = 255;
        }
    }

    self.postMessage(img, [img.data.buffer]);
    isBusy = false;
};
