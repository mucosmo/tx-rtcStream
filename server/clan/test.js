var ffi = require('ffi-napi');
var demo = ffi.Library('./filter',{'avfilter':['int',['string']]});

const video = '/opt/www/tx-rtcStream/files/resources/dh.mp4'
demo.avfilter(video);