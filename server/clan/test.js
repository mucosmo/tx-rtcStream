var ffi = require('ffi-napi');
var demo = ffi.Library('./libdemo',{'add':['int',['int','int']]});
console.log(demo.add(123456789,987654321));