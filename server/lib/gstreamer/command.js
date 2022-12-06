// Class to handle child process used for running GStreamer

const child_process = require('child_process');
const { EventEmitter } = require('events');
const fs = require('fs');
const shell = require('shelljs');

const { getCodecInfoFromRtpParameters } = require('./utils');

const RECORD_FILE_LOCATION_PATH = process.env.RECORD_FILE_LOCATION_PATH || '../files/recorder';

const GSTREAMER_DEBUG_LEVEL = process.env.GSTREAMER_DEBUG_LEVEL || 3;
const GSTREAMER_COMMAND = 'gst-launch-1.0';
const GSTREAMER_OPTIONS = '-v -e -q';

module.exports = class GStreamer {
  constructor(rtpParameters) {
    this._rtpParameters = rtpParameters;
    this._process = undefined;
    this._observer = new EventEmitter();
    this._createProcess();
  }

  async _createProcess() {
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
      // this._process.stdout.setEncoding('utf-8');
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

    let bufarr=[]

    this._process.stdout.on('data', data => {

      // bufarr = bufarr.concat(data);

      // const len=32* 160
      


      // if(bufarr.length> len){
      //   const aa = bufarr.slice(0, len);

        
      //   bufarr = bufarr.slice(len);

      //   const buf = new Buffer.from(aa);
 
      //   global.asrUtil.write(buf);

      // }


        global.asrUtil.write(data);

 
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
      `rtpbin name=rtpbin latency=50 buffer-mode=0 sdes="application/x-rtp-source-sdes"`,
    ];

    // commandArgs = commandArgs.concat(this._videoArgs);
    commandArgs = commandArgs.concat(this._audioArgs);
    commandArgs = commandArgs.concat(this._sinkArgs);
    // commandArgs = commandArgs.concat(this._rtcpArgs);

    console.log('----- command ----')
    console.log(commandArgs)

    return commandArgs;
  }

  get _videoArgs() {
    const { video } = this._rtpParameters;
    // Get video codec info
    const videoCodecInfo = getCodecInfoFromRtpParameters('video', video.rtpParameters);

    /** 
     * minimum feasible configs,
     * these parametes must be correct:
     * 
     * payloadType / clock-rate / encoding-name
     * 
     */
    const VIDEO_CAPS = `application/x-rtp,media=(string)video,clock-rate=(int)${videoCodecInfo.clockRate},payload=(int)${videoCodecInfo.payloadType},encoding-name=(string)${videoCodecInfo.codecName.toUpperCase()}`;

    return [
      `! udpsrc port=${video.remoteRtpPort} caps="${VIDEO_CAPS}"`, // remoteport 需正确
      '! rtpbin.recv_rtp_sink_0 rtpbin.',
      '! queue',
      '! rtpvp8depay',
      '! mux.',
    ];
  }

  get _audioArgs() {
    const { audio } = this._rtpParameters;
    // Get audio codec info
    const audioCodecInfo = getCodecInfoFromRtpParameters('audio', audio.rtpParameters);

    const AUDIO_CAPS = `application/x-rtp,media=(string)audio,clock-rate=(int)${audioCodecInfo.clockRate},payload=(int)${audioCodecInfo.payloadType},encoding-name=(string)${audioCodecInfo.codecName.toUpperCase()}`;

    return [
      `! udpsrc port=${audio.remoteRtpPort} caps="${AUDIO_CAPS}"`,
      '! rtpbin.recv_rtp_sink_1 rtpbin.',
      '! queue',
      '! rtpopusdepay',
      '! opusdec',
      '! audioresample',
      '! audioconvert',
      '! audio/x-raw, rate=16000, format=S16LE,channels=1',

      // '! opusenc',
      // '! mux.'
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
    return [
      // 'webmmux name=mux',
      `! fdsink`
    ];
  }
}
