import AgoraRTC from "agora-rtc-sdk-ng";

class Agora {
  constructor(options) {
    this.appId = options.appId || "";
    this.userSig =
      "006704c89a1412c4f76b14107a0814598d2IABYwcfP7ugcSKjzVPK8/0GWe1AM1l464h6Ld+ue+xjue9SAPkgAAAAAEABOH1vQbKApYgEAAQCJoCli";
    this.userId = options.userId || "";
    this.roomId = options.roomId || "room001";
    this.mode = options.mode || "rtc";
    this.useStringRoomId = true;
    this.client = null;
    this.localStream = null;
    this.remoteStreams = new Map();

    this.codec = options.codec || "vp8";

    this.callbacks = [];

    this.subscribeList = new Map();
  }

  getClient = () => {
    if (!this.client) {
      this.client = AgoraRTC.createClient({
        mode: this.mode,
        codec: this.codec || "vp8",
      });
    }
    return this.client;
  };

  async getLocalStream(spec) {
    if (!this.localStream) {
      return await this.awaitLocalStream(spec);
    }
    return this.localStream;
  }

  async awaitLocalStream(spec) {
    const tracks = [];
    spec.audio && tracks.push(await AgoraRTC.createMicrophoneAudioTrack());
    if (spec.video) tracks.push(await AgoraRTC.createCameraVideoTrack());
    else if (spec.screen) tracks.push(await AgoraRTC.createScreenVideoTrack());

    // const [microphoneTrack, cameraTrack] =
    //   await AgoraRTC.createMicrophoneAndCameraTracks();
    this.localStream = new LocalStream(tracks);
    return this.localStream;
  }

  async resetLocalStream(options) {
    await this.unpublish();
    const tracks = [];
    options.audio && tracks.push(await AgoraRTC.createMicrophoneAudioTrack());
    if (options.video) tracks.push(await AgoraRTC.createCameraVideoTrack());
    else if (options.screen)
      tracks.push(await AgoraRTC.createScreenVideoTrack());
    this.localStream = new LocalStream(tracks, options.mirror);
    await this.publish(this.localStream);
    return this.localStream;
  }

  async getDevices() {
    return await AgoraRTC.getDevices();
  }

  async getCameras() {
    return await AgoraRTC.getCameras();
  }

  async join() {
    this.getClient().on("user-published", this.userPublished.bind(this));
    this.getClient().on("user-unpublished", this.userUnpublished.bind(this));
    console.log('object :>> ', this);
    await this.getClient().join(
      this.appId,
      this.roomId,
      this.userSig,
      this.userId
    );
    console.error("join room success");
  }

  async leave() {
    this.localStream.close();
    await this.getClient().leave();
  }

  async publish(localStream) {
    await this.getClient().publish(localStream.tracks);
  }

  async unpublish(localStream) {
    await this.getClient().unpublish();
  }

  async subscribe(remoteStream, options) {
    //wrapper remoteStream for trigger in rtc.jsx
    if (remoteStream.user.hasVideo && !remoteStream.hasVideoAdded) {
      await this.getClient().subscribe(remoteStream.user, "video");
      remoteStream.hasVideoAdded = true;
      if (!remoteStream.subcribed) {
        // remoteStream.play();
        remoteStream.subcribed = true;
        this.callbacks["stream-subscribed"] &&
          this.callbacks["stream-subscribed"].length > 0 &&
          this.callbacks["stream-subscribed"].forEach((callback) => {
            callback({ stream: remoteStream });
          });
      }
    } else if (remoteStream.user.hasAudio && !remoteStream.hasAudioAdded) {
      await this.getClient().subscribe(remoteStream.user, "audio");
      remoteStream.hasAudioAdded = true;
      if (!remoteStream.subcribed) {
        // remoteStream.play();
        remoteStream.subcribed = true;
        this.callbacks["stream-subscribed"] &&
          this.callbacks["stream-subscribed"].length > 0 &&
          this.callbacks["stream-subscribed"].forEach((callback) => {
            callback({ stream: remoteStream });
          });
      }
    }
  }

  async unsubscribe(remoteStream, callback) {
    // 拒绝接收该远端流所包含的任何音视频数据

    await this.getClient().unsubscribe(remoteStream.user);
  }

  version = () => {
    return WEBTRTC.VERSION;
  };

  on(eventName, callback) {
    console.log(eventName);
    console.log("this.callbacks store:", this.callbacks);
    this.callbacks[eventName] = this.callbacks[eventName]
      ? this.callbacks[eventName].push(callback)
      : [callback];
  }

  off(eventName, callback) {
    console.log(eventName);
    if (this.callbacks[eventName]) {
      const index = this.callbacks[eventName].findIndex((t) => t === callback);
      if (index > -1) {
        this.callbacks[eventName].splice(index, 1);
      }
    }
  }

  async userPublished(user, mediaType) {
    // merge videoEvent audioEvent to one remoteStream
    if (!this.remoteStreams.get(user.uid)) {
      const remoteStream = new RemoteStream(user, mediaType);
      this.remoteStreams.set(user.uid, remoteStream);
      //触发
      this.callbacks["stream-added"] &&
        this.callbacks["stream-added"].length > 0 &&
        this.callbacks["stream-added"].forEach((callback) => {
          callback({ stream: remoteStream });
        });
      console.log("远端视频流进入的回调", mediaType, JSON.stringify(user));
    } else {
      //更新
      const remoteStream = this.remoteStreams.get(user.uid).updateMedia(user);
      this.remoteStreams.set(user.uid, remoteStream);
      //执行订阅
      await this.subscribe(remoteStream, {});
      if (remoteStream.played) remoteStream.play();
      console.log("远端视频流更新的回调", mediaType, JSON.stringify(user));
    }
  }

  async userUnpublished(user, mediaType) {
    const stream = this.remoteStreams.get(user.uid);
    this.remoteStreams.delete(user.uid);
    if (stream) {
      this.callbacks["stream-removed"] &&
        this.callbacks["stream-removed"].length > 0 &&
        this.callbacks["stream-removed"].forEach((callback) => {
          callback({ stream: stream });
        });
      console.log("远端视频流离开的回调", mediaType, JSON.stringify(user));
    }
  }
}

class LocalStream {
  constructor(tracks, mirror) {
    this.tracks = tracks;
    this.mirror = mirror === void 0 ? true : mirror;
  }

  switchDevice(type, deviceId) {
    for (let i = 0; i < this.tracks.length; i++) {
      if (this.tracks[i].trackMediaType === type) {
        this.tracks[i].setDevice(deviceId);
        break;
      }
    }
  }

  muteVideo() {
    this.localVideoTrack.setMuted(true);
  }

  muteAudio() {
    this.localAudioTrack.setMuted(true);
  }

  unmuteVideo() {
    this.localVideoTrack.setMuted(false);
  }

  unmuteAudio() {
    this.localAudioTrack.setMuted(false);
  }

  close() {
    this.tracks.forEach((track) => {
      track.close();
    });
  }

  stop() {
    this.tracks.forEach((track) => {
      track.stop();
    });
  }

  play(tag_name, options) {
    const config = {
      mirror: this.mirror
    }
    if(options&&options.objectFit) {
      config.fit = options.objectFit
    }
    this.tracks.forEach((track) => {
      track.trackMediaType === "video" ? track.play(tag_name, config) : track.play();
    });
  }
}

class RemoteStream {
  constructor(user, mediaType) {
    this.userId = user.uid;
    this.user = user;
    this.hasAudioAdded = false;
    this.hasVideoAdded = false;
    this.played = false;
    this.subcribed = false;
  }

  updateMedia(user) {
    this.userId = user.uid;
    this.user = user;
    return this;
  }

  muteVideo() {
    this.user.videoTrack.setMuted(true);
  }

  muteAudio() {
    this.user.audioTrack.setMuted(true);
  }

  unmuteVideo() {
    this.user.videoTrack.setMuted(false);
  }

  unmuteAudio() {
    this.user.audioTrack.setMuted(false);
  }

  close() {
    this.user.audioTrack.stop();
    this.user.videoTrack.stop();
  }

  stop() {
    this.user.audioTrack.stop();
    this.user.videoTrack.stop();
  }

  play(tag_name, options) {
    console.error("remoteStream-video-play - 0", this);
    tag_name && (this.tag_name = tag_name);
    if(options&&options.objectFit) {
      this.fit = options.objectFit
    }
    this.played = true;
    if (this.user.videoTrack && !this.user.videoTrack.isPlaying) {
      console.log("remoteStream-video-play :>> ", this.tag_name);
      this.user.videoTrack.play(this.tag_name, {fit:this.fit});
    }
    if (this.user.audioTrack && !this.user.audioTrack.isPlaying) {
      console.log("remoteStream-audio-play :>> ", this.tag_name);

      this.user.audioTrack.play();
    }
  }
}

export default Agora;
