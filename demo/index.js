var dropZone = document.getElementById('drop_zone');
dropZone.addEventListener('dragleave' , handleDragLeave, false);
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleIsetSelect, false);

var dropZFT = document.getElementById('drop_zft');
dropZFT.addEventListener('dragleave' , handleDragLeave, false);
dropZFT.addEventListener('dragover', handleDragOver, false);
dropZFT.addEventListener('drop', handleZftSelect, false);

let mime = "application/octet-stream";

async function handleIsetSelect(e) {
    e.stopPropagation();
    e.preventDefault();

    var files = e.dataTransfer.files;

    try {
        const fileContents = await addFiles(files);
        console.log("contents: ",fileContents);
        if(checkFilesExt(fileContents)){
            throw "Invalid file";
            // console.log("fake");
        }else{
            compressZip(fileContents);
        }
        
    } catch (e) {
        console.error(e)
    }
}

async function handleZftSelect(e) {
    e.stopPropagation();
    e.preventDefault();

    var files = e.dataTransfer.files;

    try {
        const fileContents = await addFiles(files);
        console.log("contents: ",fileContents);
        let name = fileContents[0].file.name;
        let dot = name.indexOf('.');
        let ext = name.slice(dot+1);
        if(ext != "zft"){
            throw "Invalid file";
        }else{
            decompressZip(fileContents);
        }
        
    } catch (e) {
        console.error(e)
    }
}

function addFiles(files) {
    return Promise.all([].map.call(files, function (file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onloadend = function () {
                resolve({ result: reader.result, file: file });
            };
            reader.readAsArrayBuffer(file);
        });
    })).then(function (results) {
        return results;
    });
}

function checkFilesExt(arrBuff){
    let invalid = false;
    for(let i=0; i < arrBuff.length; i++){
        let name = arrBuff[i].file.name;
        let dot = name.indexOf('.');
        let ext = name.slice(dot+1);
        if(ext != "iset" && ext != "fset" && ext != "fset3"){
            invalid = true;
            break;
        }
    }
    return invalid
}

function compressZip(arrBuff){
    let name = arrBuff[0].file.name;
    let dot = name.indexOf('.');
    let filename = name.slice(0, dot);
    
    let obj = {
        iset: "a",
        fset: "b",
        fset3: "c"
    }

    for(let i=0; i < arrBuff.length; i++){
        let name = arrBuff[i].file.name;
        let dot = name.indexOf('.');
        let ext = name.slice(dot+1);
        let hex = buf2hex(arrBuff[i].result);
        obj[ext] = hex;
    }
    
    let strObj = JSON.stringify(obj);

    let StrBuffer = Module._malloc(strObj.length + 1);
    Module.writeStringToMemory(strObj, StrBuffer);
    
    Module._compressZip(StrBuffer, strObj.length);

    let content = Module.FS.readFile("tempBinFile.bin");

    var a = document.createElement('a');
    a.download = filename + ".zft";
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();

    Module._free(StrBuffer);
}

function decompressZip(arrBuff){
    let name = arrBuff[0].file.name;
    let dot = name.indexOf('.');
    let filename = name.slice(0, dot);
    
    Module.FS.writeFile("/inBinFile.bin", new Uint8Array(arrBuff[0].result));

    Module._decompressZip();

    let contentIsetUint8 = Module.FS.readFile("tempIset.iset");
    let contentFsetUint8 = Module.FS.readFile("tempFset.fset");
    let contentFset3Uint8 = Module.FS.readFile("tempFset3.fset3");

    let hexStrIset = Utf8ArrayToStr(contentIsetUint8);
    let hexStrFset = Utf8ArrayToStr(contentFsetUint8);
    let hexStrFset3 = Utf8ArrayToStr(contentFset3Uint8);

    let contentIset = hexToBuffer(hexStrIset)
    let contentFset = hexToBuffer(hexStrFset)
    let contentFset3 = hexToBuffer(hexStrFset3);
    
    // console.log(contentIset)
    var a = document.createElement('a');
    a.download = filename + ".iset";
    a.href = URL.createObjectURL(new Blob([contentIset], { type: mime }));
    a.style.display = 'none';

    var b = document.createElement('a');
    b.download = filename + ".fset";
    b.href = URL.createObjectURL(new Blob([contentFset], { type: mime }));
    b.style.display = 'none';

    var c = document.createElement('a');
    c.download = filename + ".fset3";
    c.href = URL.createObjectURL(new Blob([contentFset3], { type: mime }));
    c.style.display = 'none';

    document.body.appendChild(a);
    a.click();

    document.body.appendChild(b);
    b.click();

    document.body.appendChild(c);
    c.click();
}

function handleDragOver(e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  
    e.target.style.backgroundColor = "rgb(200,200,200)";
}

function handleDragLeave(e) {
    e.stopPropagation();
    e.preventDefault();

    e.target.style.backgroundColor = "rgb(255,255,255)";
}

function buf2hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

function hexToBuffer(hex) {
    var typedArray = new Uint8Array(hex.match(/.{1,2}/g).map(function (h) {
        return parseInt(h, 16)
        }))
    
    return typedArray;
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
