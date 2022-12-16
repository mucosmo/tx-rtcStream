import RTCFactory from "./RTCFactory";
import axios from "axios";
import LibGenerateUserSig from "./lib-generate-test-usersig-es.min";

class RTC2 {
  constructor(spec) {
    this.sp = (spec && spec.sp) || "baidu";
    this.client = null;
    this.isJoined = false;
    this.localStream = null;
    this.RtcObject = null;
    this.streams = [];
  }

  async init(params) {
    console.log("init-2");
    const response = await this.rtcApiRequest(
      "https://hz-test.ikandy.cn:60006/api/resource/sign",
      params.param
    );
    console.log("response:", response.data.data);
    const result = response.data.data;
    // const result = {}

    if (this.sp == "baidu") {
      // const response = await this.rtcApiRequest(`https://hz-test.ikandy.cn:60053/api/app/RTC/provider/${this.sp}/authentication/get`, params);
      const appId = params.appId || "appmfhg3tx233z9";
      const authenticationKey = result.Baidu;
      const userId = params.userId;
      const roomId = params.roomId;

      const options = { appId, authenticationKey, userId, roomId };
      this.RtcObject = RTCFactory.getInstance(this.sp, options);
      console.log("init-3");
    } else if (this.sp == "tencent") {
      // const response = await this.rtcApiRequest(`https://hz-test.ikandy.cn:60053/api/app/RTC/provider/${this.sp}/authentication/get`, params);

      const appId = params.appId || 1400539238;
      const userId = params.userId;
      const roomId = params.roomId;
      // let authenticationKey = result.Tencent;
      let authenticationKey = this.genTestUserSig({
        userID: params.userId,
        appkey:
          params.token.SECRETKEY ||
          "31205886d047e20e20627b9526dc664a3af342f04afccdb21217b6065f915157",
        appID: params.token.SDKAppID || 1400539238,
        expire: params.expire || 604800,
      });
      const options = { appId, authenticationKey, userId, roomId };
      //初始化的时候实例化对象
      this.RtcObject = RTCFactory.getInstance(this.sp, options);
      this.client = this.RtcObject.getClient();
    } else if (this.sp == "agora") {
      const mode = "rtc";
      const codec = "vp8";
      const appId = "704c89a1412c4f76b14107a0814598d2";
      const authenticationKey = null;
      const userId = params.userId;
      const roomId = params.roomId;
      //初始化的时候实例化对象
      const options = { appId, authenticationKey, userId, roomId, mode, codec };
      this.RtcObject = RTCFactory.getInstance(this.sp, options);
      this.client = this.RtcObject.getClient();
    } else if (this.sp == "mediasoup") {
      const userId = params.userId;
      const userName = 'params.userName';
      const roomId = params.roomId;
      //初始化的时候实例化对象
      const options = { userId, roomId, userName };
      this.RtcObject = RTCFactory.getInstance(this.sp, options);
      this.client = this.RtcObject.getClient();
    }
  }

  async rtcApiRequest(url, data) {
    try {
      return await axios({
        method: "post",
        url: url,
        data: data,
      });
    } catch (error) {
      console.log(error);
    }
  }

  async join() {
    if (this.isJoined) {
      console.warn("duplicate RtcClient.join() observed");
      return;
    }
    try {
      console.log("index-join-2");
      await this.RtcObject.join();
      console.log("index-join-3");
      this.isJoined = true;
    } catch (error) {
      console.error("join room failed! " + error);
    }
  }

  async leave() {
    try {
      await this.RtcObject.leave();
    } catch (error) {
      console.error("join room failed! " + error);
    }
  }

  async publish(localstream) {
    try {
      await this.RtcObject.publish(localstream);
    } catch (error) {
      console.error("publish room failed! " + error);
    }
  }

  async unpublish(localstream) {
    try {
      await this.RtcObject.unpublish(localstream);
    } catch (error) {
      console.error("unpublish room failed! " + error);
    }
  }

  async subscribe(remoteStream, options) {
    try {
      await this.RtcObject.subscribe(remoteStream, options);
    } catch (error) {
      console.error("unpublish room failed! " + error);
    }
  }

  async unsubscribe(remoteStream, callback) {
    try {
      await this.RtcObject.unsubscribe(remoteStream);
    } catch (error) {
      console.error("unpublish room failed! " + error);
    }
  }

  version = () => {
    return this.RtcObject.version();
  };

  getlocalStream(options) {
    return this.RtcObject.getLocalStream(options);
  }

  async resetLocalStream(options) {
    this.localStream = await this.RtcObject.resetLocalStream(options);
    return this.localStream;
  }

  async getDevices() {
    try {
      return await this.RtcObject.getDevices();
    } catch (error) {
      console.error("getDevices failed! " + error);
    }
  }

  async getCameras() {
    try {
      return await this.RtcObject.getCameras();
    } catch (error) {
      console.error("getDevices failed! " + error);
    }
  }

  on = (eventName, callback) => {
    this.RtcObject.on(eventName, (event) => {
      if (eventName === "stream-subscribed") {
        this.streams.push(event.stream);
      } else if (eventName === "stream-removed") {
        const index = this.streams.findIndex((stream) => {
          return stream.id === event.stream.id;
        });
        if (index > -1) {
          this.streams.splice(0, 1);
        }
      }
      callback(event);
    });
  };

  off = (eventName, callback) => {
    this.RtcObject.off(eventName, (event) => {
      callback(event);
    });
  };

  genTestUserSig = (params) => {
    let generator = new LibGenerateUserSig(
      params.appID,
      params.appkey,
      params.expire
    );
    let userSig = generator.genTestUserSig(params.userID);
    return userSig;
  };
}

export default RTC2;
