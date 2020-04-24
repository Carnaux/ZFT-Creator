const path = require("path");
const fs = require('fs');

var Module = require('./build/genZip_wasm.js');

Module.onRuntimeInitialized = function(){
    console.log("---------------------INITIATING DECOMPRESSION--------------------------");
    let content = fs.readFileSync(path.join(__dirname, './') + "compressedMarkers.zft");
   
    Module.FS.writeFile("/inBinFile.bin", content);

    Module._decompressZip();

    let contentIsetUint8 = Module.FS.readFile("tempIset.iset");
    let contentFsetUint8 = Module.FS.readFile("tempFset.fset");
    let contentFset3Uint8 = Module.FS.readFile("tempFset3.fset3");

    let hexStrIset = Utf8ArrayToStr(contentIsetUint8);
    let hexStrFset = Utf8ArrayToStr(contentFsetUint8);
    let hexStrFset3 = Utf8ArrayToStr(contentFset3Uint8);
  
    let contentIset = new Buffer.from(hexStrIset, 'hex');
    let contentFset = new Buffer.from(hexStrFset, 'hex');
    let contentFset3 = new Buffer.from(hexStrFset3, 'hex');

    let outDir = path.join(__dirname, '/output/'); 

    if(!fs.existsSync(outDir)){
        fs.mkdirSync(outDir);
    }

    fs.writeFileSync(outDir + "tempMarker.iset", contentIset);
    fs.writeFileSync(outDir + "tempMarker.fset", contentFset);
    fs.writeFileSync(outDir + "tempMarker.fset3", contentFset3);
   
    console.log("-----------------------------------------------------------------------")
}

function Utf8ArrayToStr(array) {
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while(i < len) {
    c = array[i++];
    switch(c >> 4)
    { 
      case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c);
        break;
      case 12: case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++];
        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
        break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(((c & 0x0F) << 12) |
                       ((char2 & 0x3F) << 6) |
                       ((char3 & 0x3F) << 0));
        break;
    }
    }

    return out;
}
