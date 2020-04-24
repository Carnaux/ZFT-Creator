#include <emscripten.h>
#ifdef _WIN32
#  include <Windows.h>
#else
#  include <sys/stat.h>
#endif
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "libs/zlib/zlib.h"

static const char *zipname = "/tempBinFile.bin";
static const char *inzipname = "/inBinFile.bin";

const int mem_size_4mb = 4*1024*1024;

unsigned char* hexstr_to_char(const char* hexstr);
int extractDataAndSave(const char* str);

uint EMSCRIPTEN_KEEPALIVE compressZip(char* src, int srclen) {
    FILE *fp;

    char *b = malloc (srclen);

    printf("Uncompressed size is: %lu", strlen(src));
    printf("\n----------\n");

    z_stream defstream;
    defstream.zalloc = Z_NULL;
    defstream.zfree = Z_NULL;
    defstream.opaque = Z_NULL;
    defstream.avail_in = (uInt)srclen; 
    defstream.next_in = (Bytef *)src; 
    defstream.avail_out = (uInt)srclen;
    defstream.next_out = (Bytef *)b;

    deflateInit(&defstream, Z_BEST_COMPRESSION);
    deflate(&defstream, Z_FINISH);
    deflateEnd(&defstream);
     
    printf("Compressed size is: %lu\n", strlen(b));

    fp = fopen(zipname,"wb");
    fwrite (b, defstream.total_out, 1, fp);
    fclose(fp);

    free(b);
    
    return 0;
}

uint EMSCRIPTEN_KEEPALIVE decompressZip(){
    FILE *fp;
    char* in;
    char* out;
    int filesize, ret;

    char *c = malloc (mem_size_4mb);

    fp = fopen (inzipname, "rb");
    if (fp == NULL)
    {
        fprintf (stderr, "Error opening %s for reading\n", inzipname);
        return 1;
    }

    fseek (fp, 0, SEEK_END);
    filesize = ftell (fp);
    fseek (fp, 0, SEEK_SET);

    in = malloc (filesize);
    
    if (in == NULL)
    {
        fprintf (stderr, "Error mallocing %i bytes for inflate\n", filesize);
        return 1;
    }
    ret = fread (in, 1, filesize, fp);
    fclose (fp);
    remove(inzipname);
    
    z_stream infstream;
    infstream.zalloc = Z_NULL;
    infstream.zfree = Z_NULL;
    infstream.opaque = Z_NULL;
    infstream.avail_in = filesize;
    infstream.next_in = (Bytef *) in;
    infstream.avail_out = (uInt)mem_size_4mb;
    infstream.next_out = (Bytef *) c;

    inflateInit(&infstream);
    inflate(&infstream, Z_NO_FLUSH);
    inflateEnd(&infstream);

    free(in);
    
    extractDataAndSave(c);
    printf("Uncompressed size is: %lu\n", strlen(c));
    // printf("Uncompressed string is: %s\n", c);

    free(c);
    return 0;
}

int extractDataAndSave(const char* str){
    // string and variable name structure
    // 
    //                iset_final_index
    //               V
    // str = {"iset":"test","fset":"test2","fset3":"test3"}
    //       ∧
    //        Beginning of str or iset_initial_index 
    //                      
    // 
    // iset_final_index    fset_initial_index
    //                V    V
    //  str = {"iset":"test","fset":"test2","fset3":"test3"}
    //                 ---- <- iset_content
    //  

    FILE *tempIset;
    FILE *tempFset;
    FILE *tempFset3;

    int iset_final_index = 9;

    char *fsetInitialIndex = strstr(str, "\",\"fset\":\"");
    int fset_initial_index = (fsetInitialIndex - str);

    int fset_final_index = (fset_initial_index + 10);

    int iset_content_size = fset_initial_index - iset_final_index;

    char *fset3InitialIndex = strstr(str, "\",\"fset3\":\"");
    int fset3_initial_index = (fset3InitialIndex - str);
    int fset3_final_index = (fset3_initial_index + 11);

    int fset_content_size = fset3_initial_index - fset_final_index;

    char *endOfStr = strstr(str, "\"}");
    int endPos = endOfStr - str;
    
    int fset3_content_size = endPos - fset3_final_index;

    // ---ISET---
    char *iset_contentHex = malloc(iset_content_size);
    strncpy(iset_contentHex, str + iset_final_index, iset_content_size);
  
    tempIset = fopen("/tempIset.iset", "w");
    fwrite(iset_contentHex, iset_content_size, 1, tempIset);
    fclose(tempIset);

    free(iset_contentHex);

    // ---FSET---
    char *fset_contentHex = malloc(fset_content_size);
    strncpy(fset_contentHex, str + fset_final_index, fset_content_size);


    tempFset = fopen("/tempFset.fset", "w");
    fwrite(fset_contentHex, fset_content_size, 1, tempFset);
    fclose(tempFset);

    free(fset_contentHex);

    // ---FSET3---
    char *fset3_contentHex = malloc(fset3_content_size);
    strncpy(fset3_contentHex, str + fset3_final_index, fset3_content_size);

    tempFset3 = fopen("/tempFset3.fset3", "w");
    fwrite(fset3_contentHex, fset3_content_size, 1, tempFset3);
    fclose(tempFset3);

    free(fset3_contentHex);
    

    return 0;
}

unsigned char* hexstr_to_char(const char* hexstr)
{
    size_t len = strlen(hexstr);
    if(len % 2 != 0){
        return NULL;
    }
    size_t final_len = len / 2;
    unsigned char* chrs = (unsigned char*)malloc((final_len+1) * sizeof(*chrs));
    for (size_t i=0, j=0; j<final_len; i+=2, j++){
        chrs[j] = (hexstr[i] % 32 + 9) % 25 * 16 + (hexstr[i+1] % 32 + 9) % 25;
    }
    chrs[final_len] = '\0';
    
    return chrs;
}