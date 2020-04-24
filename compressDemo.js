const path = require("path");
const fs = require('fs');

var Module = require('./build/genZip_wasm.js');

Module.onRuntimeInitialized = function(){
    console.log("---------------------INITIATING COMPRESSION--------------------------");
    let inDir = path.join(__dirname, './inputMarker/');
    let iset = fs.readFileSync(inDir + "pinball.iset");
    let fset = fs.readFileSync(inDir + "pinball.fset");
    let fset3 = fs.readFileSync(inDir + "pinball.fset3");
    
    let obj = {
        iset: iset.toString('hex'),
        fset: fset.toString('hex'),
        fset3: fset3.toString('hex')
    }
  
    let strObj = JSON.stringify(obj);

    let StrBuffer = Module._malloc(strObj.length + 1);
    Module.writeStringToMemory(strObj, StrBuffer);
    
    Module._compressZip(StrBuffer, strObj.length);
    
    let content = Module.FS.readFile("tempBinFile.bin");

    fs.writeFileSync(path.join(__dirname, './') + "compressedMarkers.zft", content);

    Module._free(StrBuffer);

    console.log("---------------------------------------------------------------------");
}
