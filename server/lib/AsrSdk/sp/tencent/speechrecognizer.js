import { WebSocket } from 'ws';


export default class SpeechRecognizer {
  constructor(params) {
    this.appid = params.appid || '';
    this.secretid = params.secretid || '';
    this.socket = null;
    this.isSignSuccess = false; // 是否鉴权成功
    this.isSentenceBegin = false; // 是否一句话开始
    this.asrUrl=params.asrUrl;
    this.query = {
      ...params
    };

  }
  // 暂停识别，关闭连接
  stop() {
    if (this.socket && this.socket.readyState === 1) {
      this.socket.send(JSON.stringify({ type: 'end' }));
    } else {
      this.OnError('连接未建立或连接已关闭');
      if (this.socket && this.socket.readyState === 1) {
        this.socket.close();
      }
    }
  }
 
  // 建立websocket链接 data 为用户收集的音频数据
  async start() {
    const url = this.asrUrl;
    console.log("【Tencent ASR】connect URL:======>",url);
    if (!url) {
      this.OnError('鉴权失败');
      return
    }
    const self = this;
    this.socket = new WebSocket(`wss://${url}`);
    this.socket.onopen = (e) => { // 连接建立时触发
    };
    this.socket.onmessage = (e) => { // 连接建立时触发
      const response = JSON.parse(e.data);
      if (response.code !== 0) {
        this.OnError(response.message);
        self.socket.close();
        return;
      } else {
        if (!this.isSignSuccess) {
          this.OnRecognitionStart(response);
          this.isSignSuccess = true;
        }
        if (response.final === 1) {
          this.isRecognizeComplete = true;
          this.OnRecognitionComplete(response);
          return;
        }
        if (response.result) {
          if (response.result.slice_type === 0) {
            this.OnSentenceBegin(response);
            this.isSentenceBegin = true;
          } else if (response.result.slice_type === 2) {
            if (!this.isSentenceBegin) {
              this.OnSentenceBegin(response);
            }
            this.OnSentenceEnd(response);
          } else {
            this.OnRecognitionResultChange(response);
          }
        }
      }
    };
    this.socket.onerror = (e) => { // 通信发生错误时触发
      this.socket.close();
      this.OnError(e);
    }
    this.socket.onclose = (event) => {
      if (!this.isRecognizeComplete) {
        this.OnError(event.reason);
      }
    }
  }
  // 发送数据
  write(data) {
    if (!this.socket || this.socket.readyState !== 1) {
      this.OnError('连接未建立，请稍后发送数据！')
      return
    }
    this.socket.send(data);
  };
  // 开始识别的时候
  OnRecognitionStart(res) {

  }
  // 一句话开始的时候
  OnSentenceBegin(res) {

  }
  // 识别结果发生变化的时候
  OnRecognitionResultChange() {

  }
  // 一句话结束的时候
  OnSentenceEnd() {

  }
  // 识别结束的时候
  OnRecognitionComplete() {

  }
  // 识别失败
  OnError() {

  }
}

global.SpeechRecognizer = SpeechRecognizer;
