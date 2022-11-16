import AsrUtil from "./AsrUtil";
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs))
let fs = require("fs");


export default async function demo() {
    var param ={
        // 模式 : async || callback
        model:"async",
        //callback模式必填
        callback: {
            onComplete:""
        },
        //预留配置
        config:{task:{}}
    }
    //实例话对象
    const asrUtil = new AsrUtil(param);
    //建立连接
    await asrUtil.open("TX_5G_ASR_TEST_");
    setTimeout(() => {
        console.log("开始发送测试音频>>>>>>>>>:");
        //测试音频文件
        var fileStream
        var bytesPerFrame = (16000 * 2 / 1000) * 160;//16000的采样率，16bits=2bytes， 1000ms，  一个数据帧 160ms
        var buffer = [];
        fileStream = fs.createReadStream('D:/work/node_js/speech-act-api/pcmFile/16k-0.pcm');
        fileStream.on('readable', () => {
            while (null !== (buffer = fileStream.read(bytesPerFrame))) {
                //写入音频数据
                asrUtil.write(buffer);
                sleep(50);
            }
        });
        

    }, 1000)

    //关闭连接,结束时调用
    asrUtil.close();

}

