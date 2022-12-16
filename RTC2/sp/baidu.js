import "baidurtc";
import RTC_BASE from "./rtc_base";

class BRTC extends RTC_BASE {
  constructor(options) {
    super();
    this.sdkAppId = options.appId || "";
    this.userSig = options.authenticationKey || "";
    this.userId = options.userId || "";
    this.roomId = options.roomId || "";
    this.mode = options.mode || "rtc";
    this.client = null;
    this.localStream = null;
    this.remoteStreams = new Map();
    this.devices = [];
    this.callbacks = {};
  }

  async join() {
    console.log("baidu-BRTC_Start");
    await new Promise((resolve, reject) => {
      console.log("baidu-BRTC_Start-2", this);

      BRTC_Start({
        server: "wss://rtc.exp.bcelive.com/janus",
        appid: this.sdkAppId,
        token: this.userSig,
        roomname: this.roomId,
        userid: this.userId,
        displayname: "brtc webclient",
        showvideobps: true,
        showspinner: true,
        autopublish: false,
        autosubscribe: false,
        remotevideoon: (idx) => {
          this.remotevideoon(idx);
        },
        remotevideooff: (idx) => {
          this.remotevideooff(idx);
        },
        remotevideocoming: (id, dispaly, attribute) => {
          this.remotevideocoming(id, dispaly, attribute);
        },
        remotevideoleaving: (id) => {
          this.remotevideoleaving(id);
        },
        onlocalstream: (stream, stream_name) => {
          console.log("baidu-onlocalstream");
          this.onlocalstream(stream, stream_name);
        },
        onlocalstream_end: (stream_name) => {
          console.log("baidu-onlocalstream_end");
          this.onlocalstream_end(stream_name);
        },
        localvideopublishing: (streamInfo) => {
          console.log(streamInfo);
          this.localvideopublishing();
        },
        localvideopublished_ok: () => {
          this.localvideopublished_ok();
        },
        success() {
          console.log("baidusuccess :>> ");
          resolve();
        },
        error(err) {
          console.log("error: ", JSON.stringify(err));
        },
      });
    });
  }

  remotevideoon(idx) {
    console.log("远端视频流到达的回调", JSON.stringify(idx));
  }

  remotevideooff(idx) {
    const remoteStream = this.remoteStreams.get(idx);
    this.remoteStreams.delete(idx)
    this.callbacks["stream-removed"] &&
      this.callbacks["stream-removed"].length > 0 &&
      this.callbacks["stream-removed"].forEach((callback) => {
        callback({ stream: remoteStream });
      });
    console.log("远端视频流离开的回调", JSON.stringify(idx));
  }

  remotevideocoming(id, dispaly, attribute) {
    const remoteStream = new RemoteStream(id, attribute, dispaly);
    this.remoteStreams.set(id, remoteStream);
    this.callbacks["stream-added"] &&
      this.callbacks["stream-added"].length > 0 &&
      this.callbacks["stream-added"].forEach((callback) => {
        callback({ stream: remoteStream });
      });
    console.log(
      "远端用户流上线的回调",
      "id: ",
      id,
      "display: ",
      dispaly,
      "attribute: ",
      attribute
    );
  }

  remotevideoleaving(id) {
    console.log("远端用户流离开的回调", JSON.stringify(id));
  }

  localvideopublishing() {
    console.log("本地视频开始发布的回调");
  }

  localvideopublished_ok() {
    console.log("本地视频成功发布到回调");
  }

  onlocalstream(stream, name) {
    console.log("本地视频流", name, "stream", stream);
    // this.localStream = new LocalStream(name, stream);
    if (!this.localStream) this.localStream = new LocalStream();
    this.localStream.stream = stream;
    this.localStream.name = name;
    this.localStream.status = 2;
  }

  onlocalstream_end(name) {
    console.log("本地视频流关闭" + name);
    this.localStream = null;
  }

  async leave() {
    await BRTC_Stop();
  }

  async publish(localStream) {
    // var callback = {
    //   success: function (devices) {
    //     this.devices = devices;
    //   },
    // };
    // BRTC_GetVideoDevices(callback);
    // await BRTC_StopPublish()
    BRTC_SetParamSettings({
      usingdatachannel: localStream.option.datachannel || false,
      usingaudio: localStream.option.audio || false,
      usingvideo: localStream.option.video || false,
      videoprofile: "hires",
      sharescreen: localStream.option.screen || false,
    });
    localStream.status = 1;
    BRTC_StartPublish();
  }

  async unpublish(localstream) {
    await BRTC_StopPublish();
  }

  async subscribe(remoteStream) {
    console.log("subscribe1 :>> ");
    this.callbacks["stream-subscribed"] &&
      this.callbacks["stream-subscribed"].length > 0 &&
      this.callbacks["stream-subscribed"].forEach((callback) => {
        callback({ stream: remoteStream });
      });
    // remoteStream.id;
    // await BRTC_SubscribeStreaming(tag_name, feedid);
  }

  async unsubscribe(feedid) {
    // 拒绝接收该远端流所包含的任何音视频数据
    await BRTC_StopSubscribeStreaming(feedid);
  }

  version() {
    return BRTC_Version;
  }

  async getDevices() {
    return await this.getCameras();
  }

  async getCameras() {
    return await new Promise((resolve, reject) => {
      BRTC_GetVideoDevices({
        success: (devices) => {
          resolve(devices);
        },
      });
    });
  }

  getLocalStream(spec) {
    if (!this.localStream) {
      this.localStream = new LocalStream(spec);
    }
    return this.localStream;
  }

  async resetLocalStream(spec) {
    await BRTC_StopPublish();
    const params = {
      usingvideo: spec.video,
      usingaudio: spec.audio,
      sharescreen: spec.screen,
    };
    BRTC_SetParamSettings({
      ...params,
    });
    BRTC_StartPublish();
    this.localStream = new LocalStream(spec);
    this.localStream.status = 1;
    return this.localStream;
  }

  on(eventName, callback) {
    console.log('tententnet>>>>>',eventName,this.callbacks)
    console.log(eventName);
    this.callbacks[eventName] = this.callbacks[eventName]
      ? this.callbacks[eventName].push(callback)
      : [callback];
    // switch (eventName) {
    //   case "stream-added":
    //     console.log("stream-added");
    //     this.callbacks["stream-added"] = this.callbacks["stream-added"]
    //       ? this.callbacks["stream-added"].push(callback)
    //       : [callback];
    //     break;
    //   case "stream-subscribed":
    //     console.log("stream-subscribed");
    //     this.callbacks["stream-subscribed"] = this.callbacks[
    //       "stream-subscribed"
    //     ]
    //       ? this.callbacks["stream-subscribed"].push(callback)
    //       : [callback];
    //     break;
    //   case "stream-removed":
    //     console.log("stream-removed");
    //     this.callbacks["stream-removed"] = this.callbacks["stream-removed"]
    //       ? this.callbacks["stream-removed"].push(callback)
    //       : [callback];
    //     break;
    //   default:
    //     console.log("default event");
    // }
  }
  off(eventName, callback) {
    console.log('tententnet>>>>>',eventName,this.callbacks)
    console.log(eventName);
    if (this.callbacks[eventName]) {
      const index = this.callbacks[eventName].findIndex((t) => t === callback);
      if (index > -1) {
        this.callbacks[eventName].splice(index, 1);
      }
    }
  }
}

class Client {}

class LocalStream {
  constructor(option) {
    this.option = option;
    this.status = 0;
  }

  play(tag_name, options) {
    if (this.status > 0) {
      const timer = setInterval(() => {
        if (this.status === 2) {
          const div = document.getElementById(tag_name);
          console.log("play", this);
          if (div) {
            this.tag_name = tag_name
            const video = document.createElement("video");
            video.style.width = "100%";
            video.style.height = "100%";
            options &&
              options.objectFit &&
              (video.style.objectFit = options.objectFit);
            video.srcObject = this.stream;
            div.appendChild(video);
            video.play();
          } else {
            console.error("dom元素不存在");
          }
          clearInterval(timer);
        }
      }, 50);
    } else {
      console.error("尚未推送");
    }

    // BRTC_DeviceTest_Start({
    //   localvideoviewid: tag_name,
    //   videoprofile: "hires",
    // });
    // BRTC_SetParamSettings(this.options);
    // BRTC_StartPublish();
  }

  switchDevice(type, deviceId) {
    BRTC_ReplaceVideo(deviceId);
  }

  muteVideo() {
    BRTC_MuteCamera(true);
  }

  muteAudio() {
    BRTC_MuteMicphone(true);
  }

  unmuteVideo() {
    BRTC_MuteCamera(false);
  }

  unmuteAudio() {
    BRTC_MuteMicphone(false);
  }

  stop() {
    document.getElementById(this.tag_name).removeChild(document.getElementById(this.tag_name).firstChild)
  }

  close() {
    document.getElementById(this.tag_name).removeChild(document.getElementById(this.tag_name).firstChild)
    BRTC_StopPublish();
  }
}

class RemoteStream {
  constructor(feedid, attribute, dispaly) {
    this.id = feedid;
    this.userId = feedid;
    this.name = dispaly;
    this.attribute = attribute;
  }

  play(tag_name) {
    this.tag_name = tag_name
    console.log("RemoteStream-play", this, tag_name);
    BRTC_SubscribeStreaming(tag_name, this.id);
  }

  muteVideo() {}

  muteAudio() {}

  unmuteVideo() {}

  unmuteAudio() {}

  stop() {
    document.getElementById(this.tag_name).removeChild(document.getElementById(this.tag_name).firstChild)
  }

  close() {
    document.getElementById(this.tag_name).removeChild(document.getElementById(this.tag_name).firstChild)
  }
}

export default BRTC;
