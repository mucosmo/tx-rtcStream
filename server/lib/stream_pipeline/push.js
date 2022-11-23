const axios = require('axios');

const cp = require('child_process');

const kill = require('../../lib/child_process')

const request = axios.create({
    baseURL: 'https://hz-test.ikandy.cn:4443/',
    timeout: 10000,
});


const dhcp = {};

async function start(roomId, streamAddr) {
    // 数字人 id
    const dhID = Math.random().toString(36).slice(2);

    // 验证房间是否存在
    await request.get(`/rooms/${roomId}`).then(res => {
        // console.log(res.data);
    }).catch(err => {
        console.error(err)
    })

    // 创建数字人
    await request.post(`rooms/${roomId}/broadcasters`, {
        id: dhID,
        displayName: 'DH-TX',
        device: { "name": "GStreamer" }
    }).catch(err => {
        console.error(err)
    })

    // 创建 mediasoup audio plainTransport
    let audioTransport;
    await request.post(`rooms/${roomId}/broadcasters/${dhID}/transports`, {
        type: 'plain',
        comedia: true,
        rtcpMux: false
    }).then(res => {
        audioTransport = res.data
    }).catch(err => {
        console.error(err)
    })

    // 创建 mediasoup audio plainTransport
    let videoTransport;
    await request.post(`rooms/${roomId}/broadcasters/${dhID}/transports`, {
        type: 'plain',
        comedia: true,
        rtcpMux: false
    }).then(res => {
        videoTransport = res.data
    }).catch(err => {
        console.error(err)
    })


    const AUDIO_SSRC = 1111, AUDIO_PT = 100, VIDEO_SSRC = 2222, VIDEO_PT = 101

    // 创建 mediasoup audio producer
    await request.post(`/rooms/${roomId}/broadcasters/${dhID}/transports/${audioTransport.id}/producers`, {
        kind: 'audio',
        rtpParameters: {
            codecs: [
                {
                    mimeType: "audio/opus",
                    payloadType: AUDIO_PT,
                    clockRate: 48000,
                    channels: 2,
                    parameters: {
                        "sprop-stereo": 1
                    }
                }
            ],
            encodings: [{
                ssrc: AUDIO_SSRC
            }]
        },

    }).then(res => {
        // videoTransport = res.data
    }).catch(err => {
        console.error(err)
    })


    // 创建 mediasoup video producer
    await request.post(`/rooms/${roomId}/broadcasters/${dhID}/transports/${videoTransport.id}/producers`, {
        kind: 'video',
        rtpParameters: {
            codecs: [
                {
                    mimeType: "video/vp8",
                    payloadType: VIDEO_PT,
                    clockRate: 90000
                }
            ],
            encodings: [{
                ssrc: VIDEO_SSRC
            }]
        },

    }).then(res => {
        // videoTransport = res.data
    }).catch(err => {
        console.error(err)
    })

    // 执行 gstreamer 命令
    const command = [
        `gst-launch-1.0`,
        'rtpbin name=rtpbin',
        `rtmpsrc location=${streamAddr} `,
        `! flvdemux  name=demux`,
        `demux.video`,
        `! queue`,
        `! decodebin`,
        `! videoconvert `,
        `! vp8enc target-bitrate=1000000 deadline=1 cpu-used=4`,
        `! rtpvp8pay pt=${VIDEO_PT} ssrc=${VIDEO_SSRC} picture-id-mode=2`,
        `! rtpbin.send_rtp_sink_0`,
        `rtpbin.send_rtp_src_0 ! udpsink host=${videoTransport.ip} port=${videoTransport.port}`,
        `rtpbin.send_rtcp_src_0 ! udpsink host=${videoTransport.ip} port=${videoTransport.rtcpPort} sync=false async=false`,
        `demux.audio`,
        `! queue`,
        `! decodebin`,
        `! audioresample`,
        `! audioconvert`,
        `! opusenc`,
        `! rtpopuspay pt=${AUDIO_PT} ssrc=${AUDIO_SSRC}`,
        `! rtpbin.send_rtp_sink_1`,
        `rtpbin.send_rtp_src_1 ! udpsink host=${audioTransport.ip} port=${audioTransport.port}`,
        `rtpbin.send_rtcp_src_1 ! udpsink host=${audioTransport.ip} port=${audioTransport.rtcpPort} sync=false async=false`
    ].join(' ');

    dhcp[roomId] = cp.spawn(command,  {
        detached: false,
        shell: true
      })

      const sessionId = `tx_push_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;

      global.processObj[sessionId] = dhcp[roomId].pid;

      return sessionId;

}

// 停止推送数字人
 function stop(sessionId) {
    return kill(sessionId);
}

module.exports = {
    start,
    stop
};