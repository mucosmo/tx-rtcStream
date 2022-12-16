// import { EventEmitter } from "events"; //(http://nodejs.cn/api/)Node.js文档
// import { io } from "socket.io-client"; //(https://socket.io/docs/v4/client-api/)socket.ioClientAPI
import protooClient from "protoo-client";
import Logger from "./Logger.js";
import * as mediasoupClient from "mediasoup-client";

const logger = new Logger("RoomClient");

export function getProtooUrl({ roomId, peerId }) {
  return `wss://cosmoserver.tk:4443/?roomId=${roomId}&peerId=${peerId}`;
}

class Mediasoup {
  constructor(options) {
    console.log('constructor() [roomId:"%s"]', options.roomId);
    this._closed = false; //Closed flag.
    this._roomId = options.roomId; //Room id.
    this._userName = options.userName; //userName.
    this._userId = options.userId; //userId.
    this._protooUrl = null;
    this._device = options.userName; //userName.
    this.client = null;
    this._socket = null; //socket.
    this._mediasoupDevice = null; //mediaSoup-client Device instance.
    this._sendTransport = null; //mediaSoup Transport for sending.
    this._recvTransport = null; //mediaSoup Transport for receiving.
    this._micProducer = null; //Local mic mediaSoup Producer.
    this._webcamProducer = null; //Local webcam mediaSoup Producer.
    this._shareProducer = null; //Local share mediaSoup Producer.
    this._consumers = new Map(); //mediaSoup Consumers.
    this._consumersLength = 0; //mediaSoup Consumers.
    this.remoteStreams = new Map();
    this.callbacks = [];
    this._handlerName = options.handlerName;
    // protoo-client Peer instance.
    // @type {protooClient.Peer}
    this._protoo = null;

  }

  /**离开房间 */
  async leave() {
    console.log(`peerId ${this._userId} leave the room`)
    this.close();
  }
  /*客户端关闭*/
  close() {
    if (this._closed) return;
    this._closed = true;
    console.log("close()");
    // Close protoo Peer
    this._protoo.close();
    // Close mediasoup Transports.
    if (this._sendTransport) this._sendTransport.close();
    if (this._recvTransport) this._recvTransport.close();
  }

  /**获取客户端 */
  getClient = () => {
    if (!this._protoo) {
      this._protooUrl = getProtooUrl({ roomId: this._roomId, peerId: this._userId });

      const protooTransport = new protooClient.WebSocketTransport(this._protooUrl);
      this._protoo = new protooClient.Peer(protooTransport);
    }
    return this._protoo;
  };

  /**加入房间 */
  async join() {
    this._protoo.on('open', () => { this._joinRoom() });

    this._protoo.on('failed', () => {
      console.log('WebSocket connection failed');
    });

    this._protoo.on('disconnected', () => {
      console.log('WebSocket connection disconnected');
      // Close mediasoup Transports.
      if (this._sendTransport) {
        this._sendTransport.close();
        this._sendTransport = null;
      }

      if (this._recvTransport) {
        this._recvTransport.close();
        this._recvTransport = null;
      }
    });

    this._protoo.on('close', () => {
      if (this._closed)
        return;
      this.close();
    });

    // eslint-disable-next-line no-unused-vars
    this._protoo.on('request', async (request, accept, reject) => {
      console.log(
        'proto "request" event [method:%s, data:%o]',
        request.method, request.data);

      switch (request.method) {
        case 'newConsumer':
          {
            if (!this._consume) {
              reject(403, 'I do not want to consume');

              break;
            }

            const {
              peerId,
              producerId,
              id,
              kind,
              rtpParameters,
              type,
              appData,
              producerPaused
            } = request.data;

            try {
              const consumer = await this._recvTransport.consume(
                {
                  id,
                  producerId,
                  kind,
                  rtpParameters,
                  appData: { ...appData, peerId } // Trick.
                });

              if (this._e2eKey && e2e.isSupported()) {
                e2e.setupReceiverTransform(consumer.rtpReceiver);
              }

              // Store in the map.
              this._consumers.set(consumer.id, consumer);

              consumer.on('transportclose', () => {
                this._consumers.delete(consumer.id);
              });

              const { spatialLayers, temporalLayers } =
                mediasoupClient.parseScalabilityMode(
                  consumer.rtpParameters.encodings[0].scalabilityMode);

              // store.dispatch(stateActions.addConsumer(
              //   {
              //     id: consumer.id,
              //     type: type,
              //     locallyPaused: false,
              //     remotelyPaused: producerPaused,
              //     rtpParameters: consumer.rtpParameters,
              //     spatialLayers: spatialLayers,
              //     temporalLayers: temporalLayers,
              //     preferredSpatialLayer: spatialLayers - 1,
              //     preferredTemporalLayer: temporalLayers - 1,
              //     priority: 1,
              //     codec: consumer.rtpParameters.codecs[0].mimeType.split('/')[1],
              //     track: consumer.track
              //   },
              //   peerId));

              // We are ready. Answer the protoo request so the server will
              // resume this Consumer (which was paused for now if video).
              accept();

              // // If audio-only mode is enabled, pause it.
              // if (consumer.kind === 'video' && store.getState().me.audioOnly)
              //   this._pauseConsumer(consumer);
            }
            catch (error) {
              console.error('"newConsumer" request failed:%o', error);

              // store.dispatch(requestActions.notify(
              //   {
              //     type: 'error',
              //     text: `Error creating a Consumer: ${error}`
              //   }));

              throw error;
            }

            break;
          }

        case 'newDataConsumer':
          {
            if (!this._consume) {
              reject(403, 'I do not want to data consume');

              break;
            }

            if (!this._useDataChannel) {
              reject(403, 'I do not want DataChannels');

              break;
            }

            const {
              peerId, // NOTE: Null if bot.
              dataProducerId,
              id,
              sctpStreamParameters,
              label,
              protocol,
              appData
            } = request.data;

            try {
              const dataConsumer = await this._recvTransport.consumeData(
                {
                  id,
                  dataProducerId,
                  sctpStreamParameters,
                  label,
                  protocol,
                  appData: { ...appData, peerId } // Trick.
                });

              // Store in the map.
              this._dataConsumers.set(dataConsumer.id, dataConsumer);

              dataConsumer.on('transportclose', () => {
                this._dataConsumers.delete(dataConsumer.id);
              });

              dataConsumer.on('open', () => {
                console.log('DataConsumer "open" event');
              });

              dataConsumer.on('close', () => {
                logger.warn('DataConsumer "close" event');

                this._dataConsumers.delete(dataConsumer.id);

                // store.dispatch(requestActions.notify(
                //   {
                //     type: 'error',
                //     text: 'DataConsumer closed'
                //   }));
              });

              dataConsumer.on('error', (error) => {
                console.error('DataConsumer "error" event:%o', error);

                // store.dispatch(requestActions.notify(
                //   {
                //     type: 'error',
                //     text: `DataConsumer error: ${error}`
                //   }));
              });

              dataConsumer.on('message', (message) => {
                console.log(
                  'DataConsumer "message" event [streamId:%d]',
                  dataConsumer.sctpStreamParameters.streamId);

                // TODO: For debugging.
                window.DC_MESSAGE = message;

                if (message instanceof ArrayBuffer) {
                  const view = new DataView(message);
                  const number = view.getUint32();

                  if (number == Math.pow(2, 32) - 1) {
                    logger.warn('dataChannelTest finished!');

                    this._nextDataChannelTestNumber = 0;

                    return;
                  }

                  if (number > this._nextDataChannelTestNumber) {
                    logger.warn(
                      'dataChannelTest: %s packets missing',
                      number - this._nextDataChannelTestNumber);
                  }

                  this._nextDataChannelTestNumber = number + 1;

                  return;
                }
                else if (typeof message !== 'string') {
                  logger.warn('ignoring DataConsumer "message" (not a string)');

                  return;
                }

                switch (dataConsumer.label) {
                  case 'chat':
                    {
                      // const { peers } = store.getState();
                      const peersArray = Object.keys(peers)
                        .map((_peerId) => peers[_peerId]);
                      const sendingPeer = peersArray
                        .find((peer) => peer.dataConsumers.includes(dataConsumer.id));

                      if (!sendingPeer) {
                        logger.warn('DataConsumer "message" from unknown peer');

                        break;
                      }

                      // store.dispatch(requestActions.notify(
                      //   {
                      //     title: `${sendingPeer.displayName} says:`,
                      //     text: message,
                      //     timeout: 5000
                      //   }));

                      break;
                    }

                  case 'bot':
                    {
                      // store.dispatch(requestActions.notify(
                      //   {
                      //     title: 'Message from Bot:',
                      //     text: message,
                      //     timeout: 5000
                      //   }));

                      break;
                    }
                }
              });

              // // TODO: REMOVE
              // window.DC = dataConsumer;

              // store.dispatch(stateActions.addDataConsumer(
              //   {
              //     id: dataConsumer.id,
              //     sctpStreamParameters: dataConsumer.sctpStreamParameters,
              //     label: dataConsumer.label,
              //     protocol: dataConsumer.protocol
              //   },
              //   peerId));

              // We are ready. Answer the protoo request.
              accept();
            }
            catch (error) {
              console.error('"newDataConsumer" request failed:%o', error);

              // store.dispatch(requestActions.notify(
              //   {
              //     type: 'error',
              //     text: `Error creating a DataConsumer: ${error}`
              //   }));

              throw error;
            }

            break;
          }
      }
    });

    this._protoo.on('notification', (notification) => {
      // console.log(
      // 	'proto "notification" event [method:%s, data:%o]',
      // 	notification.method, notification.data);

      switch (notification.method) {
        case 'producerScore':
          {
            const { producerId, score } = notification.data;

            // store.dispatch(
            //   stateActions.setProducerScore(producerId, score));

            break;
          }

        case 'newPeer':
          {
            const peer = notification.data;

            console.log(`${peer.displayName} has joined the room`);

            // store.dispatch(
            //   stateActions.addPeer(
            //     { ...peer, consumers: [], dataConsumers: [] }));

            // store.dispatch(requestActions.notify(
            //   {
            //     text: `${peer.displayName} has joined the room`
            //   }));

            break;
          }

        case 'peerClosed':
          {
            const { peerId } = notification.data;

            // store.dispatch(
            //   stateActions.removePeer(peerId));

            break;
          }

        case 'peerDisplayNameChanged':
          {
            const { peerId, displayName, oldDisplayName } = notification.data;

            // store.dispatch(
            //   stateActions.setPeerDisplayName(displayName, peerId));

            console.log(`${oldDisplayName} is now ${displayName}`);

            // store.dispatch(requestActions.notify(
            //   {
            //     text: `${oldDisplayName} is now ${displayName}`
            //   }));

            break;
          }

        case 'downlinkBwe':
          {
            console.log('\'downlinkBwe\' event:%o', notification.data);

            break;
          }

        case 'consumerClosed':
          {
            const { consumerId } = notification.data;
            const consumer = this._consumers.get(consumerId);

            if (!consumer)
              break;

            consumer.close();
            this._consumers.delete(consumerId);

            const { peerId } = consumer.appData;

            // store.dispatch(
            //   stateActions.removeConsumer(consumerId, peerId));

            break;
          }

        case 'consumerPaused':
          {
            const { consumerId } = notification.data;
            const consumer = this._consumers.get(consumerId);

            if (!consumer)
              break;

            consumer.pause();

            // store.dispatch(
            //   stateActions.setConsumerPaused(consumerId, 'remote'));

            break;
          }

        case 'consumerResumed':
          {
            const { consumerId } = notification.data;
            const consumer = this._consumers.get(consumerId);

            if (!consumer)
              break;

            consumer.resume();

            // store.dispatch(
            //   stateActions.setConsumerResumed(consumerId, 'remote'));

            break;
          }

        case 'consumerLayersChanged':
          {
            const { consumerId, spatialLayer, temporalLayer } = notification.data;
            const consumer = this._consumers.get(consumerId);

            if (!consumer)
              break;

            // store.dispatch(stateActions.setConsumerCurrentLayers(
            //   consumerId, spatialLayer, temporalLayer));

            break;
          }

        case 'consumerScore':
          {
            const { consumerId, score } = notification.data;

            // store.dispatch(
            //   stateActions.setConsumerScore(consumerId, score));

            break;
          }

        case 'dataConsumerClosed':
          {
            const { dataConsumerId } = notification.data;
            const dataConsumer = this._dataConsumers.get(dataConsumerId);

            if (!dataConsumer)
              break;

            dataConsumer.close();
            this._dataConsumers.delete(dataConsumerId);

            const { peerId } = dataConsumer.appData;

            // store.dispatch(
            //   stateActions.removeDataConsumer(dataConsumerId, peerId));

            break;
          }

        case 'activeSpeaker':
          {
            const { peerId } = notification.data;

            // store.dispatch(
            //   stateActions.setRoomActiveSpeaker(peerId));

            break;
          }

        default:
          {
            console.error(
              'unknown protoo notification.method "%s"', notification.method);
          }
      }
    });
  }

  /*初始化房间*/
  async _joinRoom() {
    console.log(`${this._userId} is joining the room`);

    try {
      this._mediasoupDevice = new mediasoupClient.Device({
        handlerName: 'Chrome74',
      });

      console.log('_mediasoupDevice', this._mediasoupDevice)
      const routerRtpCapabilities = await this.client.request(
        "getRouterRtpCapabilities"
      );
      console.log('routerRtpCapabilities', routerRtpCapabilities)
      await this._mediasoupDevice.load({ routerRtpCapabilities });

      // NOTE: Stuff to play remote audios due to browsers' new autoplay policy.
      //
      // Just get access to the mic and DO NOT close the mic track for a while.
      // Super hack!
      {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        console.log('streamss', stream)
        const audioTrack = stream.getAudioTracks()[0];

        audioTrack.enabled = false;

        setTimeout(() => audioTrack.stop(), 120000);
      }
      // Create mediasoup Transport for sending (unless we don't want to produce).
      if (this._produce) {
        const transportInfo = await this.client.request(
          "createWebRtcTransport",
          {
            forceTcp: this._forceTcp,
            producing: true,
            consuming: false,
            sctpCapabilities: this._useDataChannel
              ? this._mediasoupDevice.sctpCapabilities
              : undefined,
          }
        );

        const {
          id,
          iceParameters,
          iceCandidates,
          dtlsParameters,
          sctpParameters,
        } = transportInfo;

        this._sendTransport = this._mediasoupDevice.createSendTransport({
          id,
          iceParameters,
          iceCandidates,
          dtlsParameters: {
            ...dtlsParameters,
            // Remote DTLS role. We know it's always 'auto' by default so, if
            // we want, we can force local WebRTC transport to be 'client' by
            // indicating 'server' here and vice-versa.
            role: "auto",
          },
          sctpParameters,
          iceServers: [],
          proprietaryConstraints: PC_PROPRIETARY_CONSTRAINTS,
          additionalSettings: {
            encodedInsertableStreams: this._e2eKey && e2e.isSupported(),
          },
        });

        this._sendTransport.on(
          "connect",
          (
            { dtlsParameters },
            callback,
            errback // eslint-disable-line no-shadow
          ) => {
            this.client
              .request("connectWebRtcTransport", {
                transportId: this._sendTransport.id,
                dtlsParameters,
              })
              .then(callback)
              .catch(errback);
          }
        );

        this._sendTransport.on(
          "produce",
          async ({ kind, rtpParameters, appData }, callback, errback) => {
            try {
              // eslint-disable-next-line no-shadow
              const { id } = await this.client.request("produce", {
                transportId: this._sendTransport.id,
                kind,
                rtpParameters,
                appData,
              });

              callback({ id });
            } catch (error) {
              errback(error);
            }
          }
        );

        this._sendTransport.on(
          "producedata",
          async (
            { sctpStreamParameters, label, protocol, appData },
            callback,
            errback
          ) => {
            console.log(
              '"producedata" event: [sctpStreamParameters:%o, appData:%o]',
              sctpStreamParameters,
              appData
            );

            try {
              // eslint-disable-next-line no-shadow
              const { id } = await this.client.request("produceData", {
                transportId: this._sendTransport.id,
                sctpStreamParameters,
                label,
                protocol,
                appData,
              });

              callback({ id });
            } catch (error) {
              errback(error);
            }
          }
        );
      }

      // Create mediasoup Transport for receiving (unless we don't want to consume).
      if (this._consume) {
        const transportInfo = await this.client.request(
          "createWebRtcTransport",
          {
            forceTcp: this._forceTcp,
            producing: false,
            consuming: true,
            sctpCapabilities: this._useDataChannel
              ? this._mediasoupDevice.sctpCapabilities
              : undefined,
          }
        );

        const {
          id,
          iceParameters,
          iceCandidates,
          dtlsParameters,
          sctpParameters,
        } = transportInfo;

        this._recvTransport = this._mediasoupDevice.createRecvTransport({
          id,
          iceParameters,
          iceCandidates,
          dtlsParameters: {
            ...dtlsParameters,
            // Remote DTLS role. We know it's always 'auto' by default so, if
            // we want, we can force local WebRTC transport to be 'client' by
            // indicating 'server' here and vice-versa.
            role: "auto",
          },
          sctpParameters,
          iceServers: [],
          additionalSettings: {
            encodedInsertableStreams: this._e2eKey && e2e.isSupported(),
          },
        });

        this._recvTransport.on(
          "connect",
          (
            { dtlsParameters },
            callback,
            errback // eslint-disable-line no-shadow
          ) => {
            this.client
              .request("connectWebRtcTransport", {
                transportId: this._recvTransport.id,
                dtlsParameters,
              })
              .then(callback)
              .catch(errback);
          }
        );
      }

      // Join now into the room.
      // NOTE: Don't send our RTP capabilities if we don't want to consume.
      const { peers } = await this.client.request("join", {
        displayName: this._displayName,
        device: this._device,
        rtpCapabilities: this._consume
          ? this._mediasoupDevice.rtpCapabilities
          : undefined,
        sctpCapabilities:
          this._useDataChannel && this._consume
            ? this._mediasoupDevice.sctpCapabilities
            : undefined,
      });

      /* store.dispatch(stateActions.setRoomState("connected"));

      // Clean all the existing notifcations.
      store.dispatch(stateActions.removeAllNotifications());

      store.dispatch(
        requestActions.notify({
          text: "You are in the room!",
          timeout: 3000,
        })
      ); */

      for (const peer of peers) {
        /* store.dispatch(
          stateActions.addPeer({ ...peer, consumers: [], dataConsumers: [] })
        ); */
      }

      // Enable mic/webcam.
      if (this._produce) {
        // Set our media capabilities.
        /* store.dispatch(
          stateActions.setMediaCapabilities({
            canSendMic: this._mediasoupDevice.canProduce("audio"),
            canSendWebcam: this._mediasoupDevice.canProduce("video"),
          })
        ); */

        this.enableMic();

        const devicesCookie = cookiesManager.getDevices();

        if (
          !devicesCookie ||
          devicesCookie.webcamEnabled ||
          this._externalVideo
        )
          this.enableWebcam();

        this._sendTransport.on("connectionstatechange", (connectionState) => {
          if (connectionState === "connected") {
            this.enableChatDataProducer();
            this.enableBotDataProducer();
          }
        });
      }

      // NOTE: For testing.
      if (window.SHOW_INFO) {
        // const { me } = store.getState();

        // store.dispatch(stateActions.setRoomStatsPeerId(me.id));
      }
    } catch (error) {
      console.error("_joinRoom() failed:%o", error);

      /* store.dispatch(
        requestActions.notify({
          type: "error",
          text: `Could not join the room: ${error}`,
        })
      ); */

      this.close();
    }
  }
  /*其他事件*/
  otherSocketEvent(socket) {
    let _this = this;
    /*消费者关闭，远端生产者那边关闭触发*/
    socket.on("consumerClosed", ({ consumerId }) => {
      try {
        const consumer = _this._consumers.get(consumerId);
        consumer.close();
        _this._consumers.delete(consumerId);
        _this._consumersLength = _this._consumers.size;
      } catch (e) {
        console.error(e);
      }
    });
    /*消费者暂停，远端生产者那边暂停触发*/
    socket.on("consumerPaused", ({ consumerId }) => {
      try {
        const consumer = _this._consumers.get(consumerId);
        consumer.pause();
      } catch (e) {
        console.error(e);
      }
    });
    /*消费者恢复，远端生产者那边恢复触发*/
    socket.on("consumerResumed", ({ consumerId }) => {
      try {
        const consumer = _this._consumers.get(consumerId);
        consumer.resume();
      } catch (e) {
        console.error(e);
      }
    });
    /*创建新的消费者,远端已经创建成功*/
    socket.on("newConsumer", async (data, callback) => {
      try {
        const {
          producerId,
          id,
          kind,
          rtpParameters,
          type,
          appData,
          producerPaused,
        } = data;
        console.log(`recvTransport创建的consume：${kind}`);
        const consumer = await _this._recvTransport.consume({
          id,
          producerId,
          kind,
          rtpParameters,
          appData,
        });
        _this._consumers.set(consumer.id, consumer);
        _this._consumersLength = _this._consumers.size;
        consumer.on("transportclose", () => {
          _this._consumers.delete(consumer.id);
          _this._consumersLength = _this._consumers.size;
        });
        callback(responseSuccess());
      } catch (error) {
        callback(responseError(error));
      }
    });
  }
  /*创建micProducer音频生产者*/
  async enableMic() {
    let _this = this;
    if (_this._micProducer) {
      return;
    }
    if (!_this._mediasoupDevice.canProduce("audio")) {
      console.log("cannot produce audio");
      return;
    }
    let track;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      track = stream.getAudioTracks()[0];
      console.log("sendTransport创建micProducer============》produce：audio");
      _this._micProducer = await _this._sendTransport.produce({
        track,
        codecOptions: {
          opusStereo: 1,
          opusDtx: 1,
        },
      });
      _this._micProducer.on("transportclose", () => {
        _this._micProducer = null;
      });
      _this._micProducer.on("trackended", () => {
        _this.disableMic();
      });
    } catch (error) {
      console.log("Error enabling microphone:", error);
      if (track) {
        track.stop();
      }
    }
  }
  /*创建_webcamProducer视频生产者*/
  async enableWebcam() {
    let _this = this;
    if (_this._webcamProducer) {
      return;
    } else if (_this._shareProducer) {
      await _this.disableShare(); //禁用视频
    }
    if (!_this._mediasoupDevice.canProduce("video")) {
      console.error("cannot produce video");
      return;
    }
    let track;
    let device;
    try {
      device = await _this.getWebcamDevice();
      if (!device) {
        throw new Error("no webcam devices");
      }
      const VIDEO_CONSTRAINS = {
        qvga: { width: { ideal: 320 }, height: { ideal: 240 } },
        vga: { width: { ideal: 640 }, height: { ideal: 480 } },
        hd: { width: { ideal: 1280 }, height: { ideal: 720 } },
      };
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { ideal: device.deviceId },
          ...VIDEO_CONSTRAINS["hd"],
        },
      });
      track = stream.getVideoTracks()[0];
      const codecOptions = { videoGoogleStartBitrate: 1000 };
      /*指定视频编码*/
      /*
      let codec;
      if (_this._forceH264) {
        codec = _this._mediasoupDevice.rtpCapabilities.codecs.find((c) => c.mimeType.toLowerCase() === 'video/h264');
        if (!codec) {
          throw new Error('desired H264 codec+configuration is not supported');
        }
      } else if (_this._forceVP9) {
        codec = _this._mediasoupDevice.rtpCapabilities.codecs.find((c) => c.mimeType.toLowerCase() === 'video/vp9');
        if (!codec) {
          throw new Error('desired VP9 codec+configuration is not supported');
        }
      }*/
      console.log("sendTransport创建webcamProducer===========》produce：video");
      _this._webcamProducer = await _this._sendTransport.produce({
        track,
        codecOptions,
      });
      _this._webcamProducer.on("transportclose", () => {
        _this._webcamProducer = null;
      });
      _this._webcamProducer.on("trackended", () => {
        _this.disableWebcam();
      });
    } catch (error) {
      console.error("Error enabling webcam", error);
      if (track) {
        track.stop();
      }
    }
  }
  /*启动屏幕共享*/
  async enableShare() {
    let _this = this;
    if (_this._shareProducer) {
      return;
    } else if (_this._webcamProducer) {
      await _this.disableWebcam();
    }
    if (!_this._mediasoupDevice.canProduce("video")) {
      console.error("enableShare() | cannot produce video");
      return;
    }
    let track;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: false,
        video: {
          displaySurface: "monitor",
          logicalSurface: true,
          cursor: true,
          width: { max: 1920 },
          height: { max: 1080 },
          frameRate: { max: 30 },
        },
      });
      if (!stream) {
        return;
      }
      track = stream.getVideoTracks()[0];
      const codecOptions = { videoGoogleStartBitrate: 1000 };
      _this._shareProducer = await _this._sendTransport.produce({
        track,
        codecOptions,
        appData: {
          share: true,
        },
      });
      _this._shareProducer.on("transportclose", () => {
        _this._shareProducer = null;
      });
      _this._shareProducer.on("trackended", () => {
        _this.disableShare();
      });
    } catch (error) {
      console.error(error);
      if (track) {
        track.stop();
      }
    }
  }
  /*禁止麦克风*/
  async disableMic() {
    if (!this._micProducer) {
      return;
    }
    this._micProducer.close();
    try {
      await socketPromise(this._socket, "closeProducer", {
        producerId: this._micProducer.id,
      });
    } catch (error) {
      console.error(error.message);
    }
    this._micProducer = null;
  }
  /*禁止屏幕共享*/
  async disableShare() {
    let _this = this;
    if (!_this._shareProducer) {
      return;
    }
    _this._shareProducer.close();
    try {
      await socketPromise(_this._socket, "closeProducer", {
        producerId: _this._shareProducer.id,
      });
    } catch (error) {
      console.error("Error closing server-side share Producer", error);
    }
    _this._shareProducer = null;
  }
  /*禁止视频*/
  async disableWebcam() {
    let _this = this;
    if (!_this._webcamProducer) {
      return;
    }
    _this._webcamProducer.close();
    try {
      await socketPromise(_this._socket, "closeProducer", {
        producerId: _this._webcamProducer.id,
      });
    } catch (error) {
      console.error(error);
    }
    _this._webcamProducer = null;
  }
  /* 获取视频设备 */
  async getWebcamDevice() {
    const webcams = new Map(); // Reset the list.
    const devices = await navigator.mediaDevices.enumerateDevices();
    for (const device of devices) {
      if (device.kind !== "videoinput") {
        continue;
      }
      webcams.set(device.deviceId, device);
    }
    const array = Array.from(webcams.values());
    return new Promise((resolve, reject) => {
      if (array.length > 0) {
        resolve(array[0]);
      }
      reject();
    });
  }
  /*暂停麦克风*/
  async muteMic() {
    this._micProducer.pause();
    try {
      await socketPromise(this._socket, "pauseProducer", {
        producerId: this._micProducer.id,
      });
    } catch (e) {
      console.log(e);
    }
  }
  /*启动麦克风*/
  async unmuteMic() {
    this._micProducer.resume();
    try {
      await socketPromise(this._socket, "resumeProducer", {
        producerId: this._micProducer.id,
      });
    } catch (e) {
      console.log(e);
    }
  }

  async publish() { }

  async unpublish() { }

  disconnected(idx) {
    const remoteStream = this.remoteStreams.get(idx);
    this.remoteStreams.delete(idx);
    this.callbacks["stream-removed"] &&
      this.callbacks["stream-removed"].length > 0 &&
      this.callbacks["stream-removed"].forEach((callback) => {
        callback({ stream: remoteStream });
      });
    console.log("远端视频流离开的回调", JSON.stringify(idx));
  }

  connect(id, dispaly, attribute) {
    const remoteStream = new RemoteStream(id, attribute, dispaly);

    this.remoteStreams.set(id, remoteStream);
    this.callbacks["stream-added"] &&
      this.callbacks["stream-added"].length > 0 &&
      this.callbacks["stream-added"].forEach((callback) => {
        callback({ stream: remoteStream });
      });
    console.log(
      "远端用户流上线的回调",
      "id: ",
      id,
      "display: ",
      dispaly,
      "attribute: ",
      attribute
    );
  }
  async subscribe() {
    this.callbacks["stream-subscribed"] &&
      this.callbacks["stream-subscribed"].length > 0 &&
      this.callbacks["stream-subscribed"].forEach((callback) => {
        callback({ stream: remoteStream });
      });
  }

  async unsubscribe() { }

  version() { }

  on(eventName, callback) {
    console.log(eventName);
    console.log("this.callbacks store:", this.callbacks);
    this.callbacks[eventName] = this.callbacks[eventName]
      ? this.callbacks[eventName].push(callback)
      : [callback];
  }

  off(eventName, callback) {
    console.log(eventName);
    if (this.callbacks[eventName]) {
      const index = this.callbacks[eventName].findIndex((t) => t === callback);
      if (index > -1) {
        this.callbacks[eventName].splice(index, 1);
      }
    }
  }
}

/*给socketio创建返回Promise的一个发射事件方法*/
function socketPromise(socket, eventName, data = {}) {
  return new Promise((resolve, reject) => {
    socket.emit(eventName, data, (res) => {
      if (res.status == 200) {
        resolve(res.data);
      } else {
        reject(res.error);
      }
    }); //socket.emit(eventName [, ...args][, ack]);//args传参，sck服务端回调函数
  });
}
/*（工具类）socketio响应成功*/
function responseSuccess(data) {
  return {
    status: 200, //成功状态
    data,
  };
}
/*（工具类）socketio响应失败*/
function responseError(error) {
  return {
    status: 1, //失败状态
    error,
  };
}

export default Mediasoup;
