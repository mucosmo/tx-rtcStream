let asrUtil;



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

module.exports.start = async (roomId, peerId) => {
    await this.close();
    await this.open();
    console.log(`识别如下用户的声音=> roomId: ${roomId}, peerId: ${peerId}`)

    const recordInfo = global.streamInfo[roomId][peerId]["audio"]
    const consumers = global.streamInfo[roomId][peerId]["consumers"]

    global.peer.process = new GStreamer({audio: recordInfo});

    setTimeout(async () => {
        for (const [id, consumer] of consumers) {
            // Sometimes the consumer gets resumed before the GStreamer process has fully started
            // so wait a couple of seconds
            await consumer.resume();
            await consumer.requestKeyFrame();
        }
    }, 1000);

}

module.exports.close = async () => {
    asrUtil.close()

    global.asrUtil = asrUtil;
}

