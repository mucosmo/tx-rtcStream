/**
 * 该文件用户拉流（从会话房间拉流，然后推送给外部（ASR 语音识别，playUrl 直播地址）
 */

const GStreamer = require('../gstreamer/command-playurl')

const fs = require('fs')

const kill = require('../../lib/child_process')

/**
 *  把房间的音视频流转化成直播地址
 */
module.exports.liveStreamUrl = (roomId, peerId) => {
    const recordInfo = global.streamInfo[roomId][peerId]
    if (!fs.existsSync(`/opt/www/tx-rtcStream/files/${recordInfo.fileName}`)) {
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

    const filePath = `${recordInfo.fileName}/mediasoup_live.m3u8`
    const sessionId = `tx_live_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    global.processObj[sessionId] = global.peer.process._process.pid;
    return { sessionId, liveUrl: `http://hz-test.ikandy.cn:60125/files/${filePath}` }
}

/**
 *  把房间的音视频流转化成直播地址
 */
module.exports.liveStreamStop = (sessionId) => {
    kill(sessionId)
}