import axios from "axios";
import config from "./config.js";
import SpeechRecognizer from "./sp/tencent/speechrecognizer.js";

export default class AsrUtil {
    constructor() {
        this.url = config.url;
        this.sessionId;
        this.asrUrl;

        this.speechRecognizer = null;
        this.isCanSendData = false;
        this.isCanStop = false;
    }

    async open(sessionId) {
        try {
            this.sessionId = sessionId;
            var param = {
                sessionId: sessionId,
                //配置文件
                config: {
                    task:{}

                }
            }
            var options = {
                url: this.url + "/asr/url/ws",
                method: 'POST',
                data: param
            };
            var result = await axios(options);
            if (result.status == 200) {
                this.asrUrl = result.data.data.asrUrl;
                var params = {
                    asrUrl: this.asrUrl,
                    //配置参数
                    hotword_id: '08003a00000000000000000000000000',
                    needvad: 1,
                    filter_dirty: 1,
                    filter_modal: 1,
                    filter_punc: 1,
                    convert_num_mode: 1,
                    word_info: 2
                }
                //连接socket
                if (!this.speechRecognizer) {
                    this.speechRecognizer = new SpeechRecognizer(params);
                }
                // 开始识别
                this.speechRecognizer.OnRecognitionStart = (res) => {
                    console.log('【ASR】开始识别', res);
                    this.isCanSendData = true;
                    this.isCanStop = true;

                };
                // 一句话开始
                this.speechRecognizer.OnSentenceBegin = (res) => {
                    console.log('【ASR】一句话开始', res);
                };
                // 一句话结束
                this.speechRecognizer.OnSentenceEnd = (res) => {
                    console.log('【ASR】一句话结束', res);
                    //TODO传入会话中控                    
                    this.sendResult(res.result.voice_text_str);
                };
                // 识别结束
                this.speechRecognizer.OnRecognitionComplete = (res) => {
                    console.log('【ASR】识别结束', res);
                    this.isCanSendData = false;
                };
                // 识别错误
                this.speechRecognizer.OnError = (res) => {
                    console.log('【ASR】识别失败', res);
                };

                await this.speechRecognizer.start();
            } else {
                console.log("ASR服务错误：", result);
            }
        } catch (e) {
            console.log(e);
        }
    }

    write(data){
        this.speechRecognizer.write(data);
    }

    close(){
        if (this.isCanStop) {
            this.speechRecognizer.stop();
        }
    }

   async sendResult(text){
        if(text){
            var param = {
                text: text,
                receivers:"parent"
            }
            var options = {
                url: this.url + "/text/send",
                method: 'POST',
                headers: {token:config.token},
                data: param
            };
            var result = await axios(options);
            console.log("【ASR】发生ASR结果到会话空间。",result.data);
        }
    }
    
}