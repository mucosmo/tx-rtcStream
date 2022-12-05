// Class to handle child process used for running GStreamer

const child_process = require('child_process');
const { EventEmitter } = require('events');
const shell = require('shelljs');

const fs = require('fs')

const { getCodecInfoFromRtpParameters } = require('./utils');

const GSTREAMER_DEBUG_LEVEL = process.env.GSTREAMER_DEBUG_LEVEL || 3;
const GSTREAMER_COMMAND = 'gst-launch-1.0';
const GSTREAMER_OPTIONS = '-e -q';

module.exports = class GStreamer {
  constructor(rtpParameters) {
    this._rtpParameters = rtpParameters;
    this._process = undefined;
    this._observer = new EventEmitter();
    this._createProcess();
  }

  _createProcess() {
    // Use the commented out exe to create gstreamer dot file
    // const exe = `GST_DEBUG=${GSTREAMER_DEBUG_LEVEL} GST_DEBUG_DUMP_DOT_DIR=./dump ${GSTREAMER_COMMAND} ${GSTREAMER_OPTIONS}`;
    const exe = `GST_DEBUG=${GSTREAMER_DEBUG_LEVEL} ${GSTREAMER_COMMAND} ${GSTREAMER_OPTIONS}`;
    this._process = child_process.spawn(exe, this._commandArgs, {
      detached: false,
      shell: true
    });

    if (this._process.stderr) {
      this._process.stderr.setEncoding('utf-8');
    }

    if (this._process.stdout) {
      this._process.stdout.setEncoding('utf-8');
    }

    this._process.on('message', message =>
      console.log('gstreamer::process::message [pid:%d, message:%o]', this._process.pid, message)
    );

    this._process.on('error', error =>
      console.error('gstreamer::process::error [pid:%d, error:%o]', this._process.pid, error)
    );

    this._process.once('close', () => {
      console.log('gstreamer::process::close [pid:%d]', this._process.pid);
      this._observer.emit('process-close');
    });

    this._process.stderr.on('data', data =>
      console.log('gstreamer::process::stderr::data [data:%o]', data)
    );

    this._process.stdout.on('data', data => {
      // console.log('gstreamer::process::stdout::data [data:%o]', data.length)
    }
    );
  }

  kill() {
    console.log('kill() [pid:%d]', this._process.pid);
    this._process.kill('SIGINT');
  }

  // Build the gstreamer child process args
  get _commandArgs() {
    let commandArgs = [
      `rtpbin name=rtpbin latency=50 buffer-mode=0 sdes="application/x-rtp-source-sdes, cname=(string)${this._rtpParameters.video.rtpParameters.rtcp.cname}"`
    ];

    commandArgs = commandArgs.concat(this._videoArgs);
    commandArgs = commandArgs.concat(this._audioArgs);
    commandArgs = commandArgs.concat(this._sinkArgs);
    // commandArgs = commandArgs.concat(this._rtcpArgs);

    console.log(commandArgs)

    return commandArgs;
  }

  get _videoArgs() {
    const { video } = this._rtpParameters;
    // Get video codec info
    const videoCodecInfo = getCodecInfoFromRtpParameters('video', video.rtpParameters);

    const VIDEO_CAPS = `application/x-rtp,media=(string)video,clock-rate=(int)${videoCodecInfo.clockRate},payload=(int)${videoCodecInfo.payloadType},encoding-name=(string)${videoCodecInfo.codecName.toUpperCase()},ssrc=(uint)${video.rtpParameters.encodings[0].ssrc}`;

    return [
      `! udpsrc port=${video.remoteRtpPort} caps="${VIDEO_CAPS}"`, // remoteport 需正确
      '! rtpbin.recv_rtp_sink_0 rtpbin.',
      '! queue',
      '! rtpvp8depay',
      '! decodebin',
      '! videoflip method=4',
      // '! videoconvert', // 不需要进行转码，否则浪费性能
      // '! video/x-raw, format=I420',
      '! x264enc',
      '! mux.'
    ];
  }

  get _audioArgs() {
    const { audio } = this._rtpParameters;
    // Get audio codec info
    const audioCodecInfo = getCodecInfoFromRtpParameters('audio', audio.rtpParameters);

    const AUDIO_CAPS = `application/x-rtp,media=(string)audio,clock-rate=(int)${audioCodecInfo.clockRate},payload=(int)${audioCodecInfo.payloadType},encoding-name=(string)${audioCodecInfo.codecName.toUpperCase()},ssrc=(uint)${audio.rtpParameters.encodings[0].ssrc}`;

    return [
      `udpsrc port=${audio.remoteRtpPort} caps="${AUDIO_CAPS}"`,
      '! rtpbin.recv_rtp_sink_1 rtpbin.',
      '! queue',
      '! rtpopusdepay',
      '! opusdec',
      '! audioconvert',
      '! voaacenc',
      '! mux.'
    ];
  }

  get _rtcpArgs() {
    const { video, audio } = this._rtpParameters;

    return [
      `udpsrc address=127.0.0.1 port=${video.remoteRtcpPort}`,
      '!',
      'rtpbin.recv_rtcp_sink_0 rtpbin.send_rtcp_src_0',
      '!',
      `udpsink host=127.0.0.1 port=${video.localRtcpPort} bind-address=127.0.0.1 bind-port=${video.remoteRtcpPort} sync=false async=false`,
      `udpsrc address=127.0.0.1 port=${audio.remoteRtcpPort}`,
      '!',
      'rtpbin.recv_rtcp_sink_1 rtpbin.send_rtcp_src_1',
      '!',
      `udpsink host=127.0.0.1 port=${audio.localRtcpPort} bind-address=127.0.0.1 bind-port=${audio.remoteRtcpPort} sync=false async=false`
    ];
  }

  get _sinkArgs() {
    const fileName = this._rtpParameters.fileName;
    const RECORD_FILE_LOCATION_PATH = `/opt/application/tx-rtcStream/files/composite`;

    if (!fs.existsSync(RECORD_FILE_LOCATION_PATH)) {
      fs.mkdirSync(RECORD_FILE_LOCATION_PATH)
    }

    const dh = '/opt/application/tx-rtcStream/files/resources/dh.mp4';
    const video1 = '/opt/application/tx-rtcStream/files/resources/filevideo.mp4';
    const video2 = '/opt/application/tx-rtcStream/files/resources/video2.mp4';
    const png = '/opt/application/tx-rtcStream/files/resources/fileimage.png';
    const gif = '/opt/application/tx-rtcStream/files/resources/gif.gif';
    const mask = '/opt/application/tx-rtcStream/files/resources/mask.png';
    const svg = '/opt/application/tx-rtcStream/files/resources/svg.svg';
    const rtmp = 'rtmp://175.178.31.221:51013/live/m24072639832129537';
    const m3u8 = 'https://cosmoserver.tk:60125/files/1669358475054g2l5bihp6e/mediasoup_live.m3u8';
    const subtitles = '/opt/application/tx-rtcStream/files/resources/subtitles.srt';
    const font = '/usr/share/fonts/chinese/SIMKAI.TTF';
    const drawtext = '你好啊';
    const drawtextfile = '/opt/application/tx-rtcStream/files/resources/drawtext.txt';

    return [
      'matroskamux name=mux',
      `! fdsink`,
      `| ffmpeg -y -i -  -i ${png} -i ${mask} -i ${video2} -i ${gif} -i ${rtmp}  -filter_complex "[1]crop=100:50:200:200[cropped1];[2]alphaextract[amask];[amask]scale=150:150[vmask];[3:v]scale=150:150[cropped3];[cropped3][vmask]alphamerge[avatar];[0][cropped1]overlay=W-w-10:10[ov1];[ov1][avatar]overlay=10:10[ov2];[4:v]scale=50:50[gif];[ov2][gif]overlay=W-w-10:H/2[ov3];[5]scale=150:-1,chromakey=0x00ff00:0.3:0.05[ov4];[ov3][ov4]overlay=-20:H*0.6[ov5];[ov5]subtitles=${subtitles}[final];[final]drawtext=textfile=${drawtextfile}:fontfile=${font}:x=(w-text_w)/2:y=h-80*t:fontcolor=white:fontsize=40:shadowx=2:shadowy=2;[0:a][5:a]amix" -max_muxing_queue_size 1024  -c:v libx264  -preset slow -crf 25 ${RECORD_FILE_LOCATION_PATH}/${Date.now()}.mp4`
    ];
  }
}
