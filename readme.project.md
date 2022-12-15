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
4. 流合成
5. ipass_oauth  ipass_config (json schema)
6. ffmpeg 合成时，文件的 loop, 文件有效性的检测，播放的中断（显示静止帧）
7. 3D 模型旋转 (transpose?)

### bug
1. 第三方服务可能停止，需要做处理， 比如调用 ASR 服务（60102）
2. 及时停止 asr 服务
3. 推送数字人后，刷新房间，数字人没有了
4. 蒙版头像去背景没有作用
5. ffmpeg 中 scale 的动态参数（n,t,pos）无法使用

## notice
1. m3u8, hls 格式进行推流服务提供给用户
2. 当前由 gst 发起的进程没有及时 kill
```shell
ps -ef | grep gst-launch | awk '{ print $2 }' | xargs kill -9
```
3. ffmpeg filter 中参数名称可省略，此时需按照默认顺序填写
4. filter graph 重新初始化时 n , t 等参数会重新开始