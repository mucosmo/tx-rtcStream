var ffi = require('ffi-napi');

const fs = require('fs');
var filter = ffi.Library('./filter', {
    'avfilter': ['int', ['string', 'string']],
    "readfile": ['int', ['string', 'string']],
});

const video = '/opt/www/tx-rtcStream/files/resources/dh.mp4';
const input = '/opt/www/tx-rtcStream/server/clan/input.txt';
const output = '/opt/www/tx-rtcStream/server/clan/output.txt';

filter.avfilter(video, input);




