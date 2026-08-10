const fs = require('fs');
const path = require('path');

// Simple PNG generator for Eris App Icon (Liquid Glass Cyber Icon)
function createMinimalPng(size) {
    // Generate valid 1x1 or sized PNG data using basic PNG structure
    const zlib = require('zlib');

    // Simple PNG chunk builder
    function makeChunk(type, data) {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length, 0);
        const typeBuf = Buffer.from(type);
        const body = Buffer.concat([typeBuf, data]);
        
        // CRC32
        const crc = Buffer.alloc(4);
        let c = 0xffffffff;
        for (let i = 0; i < body.length; i++) {
            c ^= body[i];
            for (let j = 0; j < 8; j++) {
                c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
            }
        }
        crc.writeUInt32BE((c ^ 0xffffffff) >>> 0, 0);
        return Buffer.concat([len, body, crc]);
    }

    const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    // IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; // 8-bit
    ihdr[9] = 6; // RGBA
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace
    const ihdrChunk = makeChunk('IHDR', ihdr);

    // IDAT - Raw pixel rows (size x size of Cyber Cyan/Indigo gradient)
    const rowSize = 1 + size * 4;
    const rawData = Buffer.alloc(size * rowSize);

    for (let y = 0; y < size; y++) {
        const offset = y * rowSize;
        rawData[offset] = 0; // filter type 0
        for (let x = 0; x < size; x++) {
            const pxOffset = offset + 1 + x * 4;
            // Radial distance for circular liquid glass icon
            const dx = (x - size / 2) / (size / 2);
            const dy = (y - size / 2) / (size / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.9) {
                // Cyber Cyan/Purple Gradient with specular highlight
                rawData[pxOffset] = Math.floor(6 + dist * 50);     // R
                rawData[pxOffset + 1] = Math.floor(182 - dist * 100); // G
                rawData[pxOffset + 2] = Math.floor(212 + dist * 40);  // B
                rawData[pxOffset + 3] = 255;                          // A
            } else {
                // Transparent border
                rawData[pxOffset] = 6;
                rawData[pxOffset + 1] = 9;
                rawData[pxOffset + 2] = 20;
                rawData[pxOffset + 3] = 255;
            }
        }
    }

    const compressed = zlib.deflateSync(rawData);
    const idatChunk = makeChunk('IDAT', compressed);

    // IEND
    const iendChunk = makeChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const icon192 = createMinimalPng(192);
const icon512 = createMinimalPng(512);

fs.writeFileSync(path.join(__dirname, 'icon-192.png'), icon192);
fs.writeFileSync(path.join(__dirname, 'icon-512.png'), icon512);

console.log('Successfully created icon-192.png and icon-512.png');
