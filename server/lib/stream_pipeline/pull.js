/**
 * 该文件用户拉流（从会话房间拉流，然后推送给外部（ASR 语音识别，playUrl 直播地址）
 */

const GStreamer = require('../gstreamer/command-playurl')

/**
 *  把房间的音视频流转化成直播地址
 */
module.exports.liveStreamUrl =  (roomId, peerId) => {
    console.log(`--- start live stream ----- roomId: ${roomId}, peerId: ${peerId}`)

    const recordInfo = global.streamInfo[roomId][peerId]
    const consumers = global.streamInfo[roomId][peerId]["consumers"]

    global.peer.process = new GStreamer(recordInfo );

    setTimeout(async () => {
        for (const [id, consumer] of consumers) {
            // Sometimes the consumer gets resumed before the GStreamer process has fully started
            // so wait a couple of seconds
            await consumer.resume();
            await consumer.requestKeyFrame();
        }
    }, 1000);
}