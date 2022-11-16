let asrUtil;
let fs = require("fs");


const GStreamer = require('./gstreamer/command')

import('./AsrSdk/AsrUtil.js').then(async mod => {
    const AsrSDK = mod.default;
    asrUtil = new AsrSDK();
    global.asrUtil = asrUtil;
})

module.exports.open = async () => {
    await asrUtil.open("TX_5G_ASR_TEST_");
    global.asrUtil = asrUtil;

}

module.exports.startSync = async (roomId, peerId) => {
    await this.close();
    await this.open();
    console.log(`识别如下用户的声音 >>>>>>>>> roomId: ${roomId}, peerId: ${peerId}`)

    const recordInfo = global.streamInfo[roomId][peerId]["audio"]
    const consumers = global.streamInfo[roomId][peerId]["consumers"]

    global.peer.process = new GStreamer({ audio: recordInfo });

    setTimeout(async () => {
        for (const [id, consumer] of consumers) {
            // Sometimes the consumer gets resumed before the GStreamer process has fully started
            // so wait a couple of seconds
            await consumer.resume();
            await consumer.requestKeyFrame();
        }
    }, 1000);
}

/**
 * 异步读取音频文件并进行识别
 * 
 * @param {*} roomId 
 * @param {*} peerId 
 */
module.exports.startAsync = async (file) => {
    await this.close();
    await this.open();
    setTimeout(() => {
        console.log("开始识别音频文件 >>>>>>>>>:");
        var fileStream
        var bytesPerFrame = (16000 * 2 / 1000) * 160;//16000的采样率，16bits=2bytes， 1000ms，  一个数据帧 160ms
        var buffer = [];
        fileStream = fs.createReadStream(`../files/${file}`);
        fileStream.on('readable', () => {
            while (null !== (buffer = fileStream.read(bytesPerFrame))) {
                global.asrUtil.write(buffer);
            }
        });
    }, 1000)

}

module.exports.close = async () => {
    asrUtil.close()

    global.asrUtil = asrUtil;
}

