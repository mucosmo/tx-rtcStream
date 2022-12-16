import util from "./config";
import TRTC from "./sp/tencent";
import BRTC from "./sp/baidu";
import AgoraRTC from "./sp/agora";
import Mediasoup from './sp/mediasoup/RoomClient';

class RTCFactory {
  constructor(sp) {
    this.policy = sp || "tencent";
  }

  static getInstance(policy, options) {
    switch (policy) {
      case "tencent":
        return new TRTC(options);
      case "baidu":
        return new BRTC(options);
      case "agora":
        return new AgoraRTC(options);
      case "mediasoup":
        return new Mediasoup(options);
      default:
        return new TRTC(options);
    }
  }
}

export default RTCFactory;
