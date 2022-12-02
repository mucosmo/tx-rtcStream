var ffi = require('ffi-napi');
var demo = ffi.Library('./libfilter',{'main':['int',['string']]});

console.log(demo)

const video = '/opt/www/tx-rtcStream/files/resources/dh.mp4'
demo.main(video);