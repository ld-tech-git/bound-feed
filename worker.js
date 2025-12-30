/**
 * Laplacian Pro Worker Engine - v44
 * Logic: Verified v13/v17 Engine (Adaptive Auto-Threshold & Median)
 * Feature: Fire & Forget Gating added to prevent frame stacking lag.
 */

let isBusy = false; // The "Fire & Forget" gate

self.onmessage = function(e) {
    // --- FIRE & FORGET GATE ---
    // If the worker is already busy processing, drop this frame immediately.
    if (isBusy) return;
    isBusy = true;

    const { img, blur, sense, k, oldCode, panel } = e.data;
    const data = img.data;
    const w = img.width;
    const h = img.height;
    
    // Create static copy for neighborhood sampling
    const copy = new Uint8ClampedArray(data);

    // --- PANEL B LOGIC (Legacy / Median) ---
    if (panel === 'B') {
        if (oldCode) {
            // v13 Adaptive Auto-Threshold Logic
            for (let y = k; y < h - k; y++) {
                for (let x = k; x < w - k; x++) {
                    const idx = (y * w + x) * 4;
                    const up = ((y - k) * w + x) * 4, down = ((y + k) * w + x) * 4, 
                          left = (y * w + (x - k)) * 4, right = (y * w + (x + k)) * 4;

                    const localAvgR = (copy[up] + copy[down] + copy[left] + copy[right]) / 4;
                    const localAvgG = (copy[up+1] + copy[down+1] + copy[left+1] + copy[right+1]) / 4;
                    const localAvgB = (copy[up+2] + copy[down+2] + copy[left+2] + copy[right+2]) / 4;

                    let rDiff = Math.abs(copy[idx] - localAvgR) * sense;
                    let gDiff = Math.abs(copy[idx+1] - localAvgG) * sense;
                    let bDiff = Math.abs(copy[idx+2] - localAvgB) * sense;

                    const thresholdGap = blur * 1.5; 
                    if ((rDiff + gDiff + bDiff) / 3 < thresholdGap) {
                        data[idx] = data[idx+1] = data[idx+2] = 0;
                    } else {
                        data[idx] = rDiff; data[idx+1] = gDiff; data[idx+2] = bDiff;
                    }
                    data[idx+3] = 255;
                }
            }
        } else {
            // v17 Median Filter logic
            for (let y = k; y < h - k; y++) {
                for (let x = k; x < w - k; x++) {
                    const idx = (y * w + x) * 4;
                    const valsR = [copy[idx], copy[idx-4], copy[idx+4], copy[idx-(w*4)], copy[idx+(w*4)]].sort();
                    const valsG = [copy[idx+1], copy[idx-3], copy[idx+5], copy[idx-(w*4)+1], copy[idx+(w*4)+1]].sort();
                    const valsB = [copy[idx+2], copy[idx-2], copy[idx+6], copy[idx-(w*4)+2], copy[idx+(w*4)+2]].sort();
                    
                    data[idx] = valsR[2];
                    data[idx+1] = valsG[2];
                    data[idx+2] = valsB[2];
                    data[idx+3] = 255;
                }
            }
        }
    } 
    // --- PANEL A LOGIC (v17 Weighted Laplacian) ---
    else {
        for (let y = k; y < h - k; y++) {
            for (let x = k; x < w - k; x++) {
                const idx = (y * w + x) * 4;
                const up = ((y - k) * w + x) * 4, down = ((y + k) * w + x) * 4, 
                      left = (y * w + (x - k)) * 4, right = (y * w + (x + k)) * 4;

                let rEdge = Math.abs(copy[idx] * 4 - (copy[up] + copy[down] + copy[left] + copy[right])) * sense;
                let gEdge = Math.abs(copy[idx+1] * 4 - (copy[up+1] + copy[down+1] + copy[left+1] + copy[right+1])) * sense;
                let bEdge = Math.abs(copy[idx+2] * 4 - (copy[up+2] + copy[down+2] + copy[left+2] + copy[right+2])) * sense;

                if ((rEdge + gEdge + bEdge) / 3 < (blur * 3)) {
                    data[idx] = data[idx+1] = data[idx+2] = 0;
                } else {
                    data[idx] = rEdge; data[idx+1] = gEdge; data[idx+2] = bEdge;
                }
                data[idx+3] = 255;
            }
        }
    }

    // Pass processed data back using transferable buffers
    self.postMessage(img, [img.data.buffer]);
    
    // --- OPEN THE GATE ---
    isBusy = false;
};
