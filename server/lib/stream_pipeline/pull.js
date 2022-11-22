/**
 * 该文件用户拉流（从会话房间拉流，然后推送给外部（ASR 语音识别，playUrl 直播地址）
 */

const GStreamer = require('../gstreamer/command-playurl')

const fs = require('fs')

/**
 *  把房间的音视频流转化成直播地址
 */
module.exports.liveStreamUrl = (roomId, peerId) => {
    const recordInfo = global.streamInfo[roomId][peerId]
    const filePath = `${recordInfo.fileName}/mediasoup_live.m3u8`
    if (!fs.existsSync(`/opt/www/tx-rtcStream/files/${filePath}`)) {
        const consumers = global.streamInfo[roomId][peerId]["consumers"]
        global.peer.process = new GStreamer(recordInfo);
        setTimeout(async () => {
            for (const [id, consumer] of consumers) {
                // Sometimes the consumer gets resumed before the GStreamer process has fully started
                // so wait a couple of seconds
                await consumer.resume();
                await consumer.requestKeyFrame();
            }
        }, 1000);
    }


    return `http://hz-test.ikandy.cn:60125/files/${filePath}`
}