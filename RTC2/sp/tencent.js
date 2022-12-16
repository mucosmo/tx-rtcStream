import WEBTRTC from "trtc-js-sdk";

class TRTC {
  constructor(options) {
    this.sdkAppId = options.appId || "";
    this.userSig = options.authenticationKey || "";
    this.userId = options.userId || "";
    this.roomId = options.roomId || "";
    this.mode = options.mode || "rtc";
    this.useStringRoomId = options.useStringRoomId||true;
    this.client = null;
    this.localStream = null;
    this.role = "anchor";
    this.devices = ["screen"];
  }

  getClient = () => {
    if (!this.client) {
      this.client = WEBTRTC.createClient({
        sdkAppId: this.sdkAppId,
        userId: this.userId,
        userSig: this.userSig,
        mode: this.mode,
        useStringRoomId: this.useStringRoomId,
      });
    }

    return this.client;
  };

  getLocalStream = (spec) => {
    if (!this.localStream) {
      this.localStream = WEBTRTC.createStream(spec);
    }
    return this.localStream;
  };

  resetLocalStream = async (spec) => {
    this.localStream.close();
    await this.unpublish(this.localStream);
    this.localStream = WEBTRTC.createStream(spec);
    await this.publish(this.localStream);
    return this.localStream;
  };

  getDevices = async () => {
    return WEBTRTC.getDevices();
  };

  getCameras = async () => {
    return WEBTRTC.getCameras();
  };

  async join() {
    console.log("join ", { roomId: this.roomId, role: this.role });
    await this.getClient().join({ roomId: this.roomId, role: this.role });
  }

  async leave() {
    this.localStream?.close();
    this.localStream = null;
    // await this.unpublish(this.localStream)
    const result = await this.getClient().leave();
    return result
  }

  async publish(localStream) {
    console.log("tencent-publish-1", localStream);
    await localStream.initialize();
    await this.getClient().publish(localStream);
    console.log("tencent-publish-2", localStream);
  }

  async unpublish(localstream) {
    this.localStream?.stop();
    await this.getClient().unpublish(localstream);
  }

  async subscribe(remoteStream, options) {
    await this.getClient().subscribe(remoteStream, options);
  }

  async unsubscribe(remoteStream) {
    // 拒绝接收该远端流所包含的任何音视频数据
    await this.getClient().unsubscribe(remoteStream);
  }

  version = () => {
    return WEBTRTC.VERSION;
  };

  on(eventName, callback) {
    this.client.on(eventName, callback);
  }

  off(eventName, callback) {
    this.client.off(eventName, callback);
  }
}

export default TRTC;
