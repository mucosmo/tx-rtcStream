### 注意
1. 更改了如下文件 
- ```aiortc/node_modules/mediasoup-client-aiortc/lib/FakeRTCDataChannel.js``` 中的 
```js
this._readyState = 'open'; // 原值为 status.readyState
```

2. AsrSDK 的输入是 ```audio/x-raw,format=S16LE,channels=1,rate=16000``` 的 PCM 格式文件（或者其他）


### 任务
1. 音视频流连接，推出去
2. 音视频流接入房间
3. 多个 session 测试 ASR 的并发能力

### bug
1. 第三方服务可能停止，需要做处理， 比如调用 ASR 服务（60102）
2. 及时停止 asr 服务

## notice
1. m3u8, hls 格式进行推流服务提供给用户