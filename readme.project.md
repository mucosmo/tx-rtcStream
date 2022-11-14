### 注意
1. 更改了如下文件 
- ```aiortc/node_modules/mediasoup-client-aiortc/lib/FakeRTCDataChannel.js``` 中的 
```js
this._readyState = 'open'; // 原值为 status.readyState
```

2. AsrSDK 的输入是 ```audio/x-raw,format=S16LE,channels=1,rate=16000``` 的 PCM 格式文件（或者其他）
