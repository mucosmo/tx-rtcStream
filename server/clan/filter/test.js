var ffi = require('ffi-napi');

const fs = require('fs');
var filter = ffi.Library('./filter', {
    'avfilter': ['int', ['string', 'string']],
    "readfile": ['int', ['string', 'string']],
    "pushStream": ['int', ['string', 'string']],

});

const video = '/opt/application/tx-rtcStream/files/resources/filevideo.mp4';
const input = '/opt/application/tx-rtcStream/server/clan/input.txt';
const output = '/opt/application/tx-rtcStream/server/clan/output.txt';

const rtmp = 'rtmp://121.5.133.154:1935/myapp/12345';

// filter.avfilter(video, input);
filter.pushStream(video, rtmp);




