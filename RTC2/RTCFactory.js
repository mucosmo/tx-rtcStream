// import util from "./config.js";
// import TRTC from "./sp/tencent.js";
// import BRTC from "./sp/baidu.js";
// import AgoraRTC from "./sp/agora.js";
import Mediasoup from './sp/mediasoup/RoomClient.js';

class RTCFactory {
  constructor(sp) {
    this.policy = sp || "tencent";
  }

  static getInstance(policy, options) {
    switch (policy) {
      // case "tencent":
      //   return new TRTC(options);
      // case "baidu":
      //   return new BRTC(options);
      // case "agora":
      //   return new AgoraRTC(options);
      case "mediasoup":
        return new Mediasoup(options);
      default:
        return new Mediasoup(options);
    }
  }
}

export default RTCFactory;
