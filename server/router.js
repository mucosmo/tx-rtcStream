/**
 * Create an Express based API server to manage Broadcaster requests.
 */

const express = require('express');
const bodyParser = require('body-parser');

const Logger = require('./lib/Logger');
const logger = new Logger();

const cp = require('child_process');

const { startSync, startAsync } = require('./lib/stream_pipeline/asr');
const { liveStreamUrl, liveStreamStop, streamComposite } = require('./lib/stream_pipeline/pull');

const dh = require('./lib/stream_pipeline/push');
const fs = require('fs');

async function createExpressApp() {
    logger.info('creating Express app...');

    expressApp = express();

    expressApp.use(bodyParser.json());

    /**
     * For every API request, verify that the roomId in the path matches and
     * existing room.
     */
    expressApp.param(
        'roomId', (req, res, next, roomId) => {

            // The room must exist for all API requests.
            if (!rooms.has(roomId)) {
                const error = new Error(`room with id "${roomId}" not found`);

                error.status = 404;
                throw error;
            }

            req.room = rooms.get(roomId);

            next();
        });

    /**
     * API GET resource that returns the mediasoup Router RTP capabilities of
     * the room.
     */
    expressApp.get(
        '/rooms/:roomId', (req, res) => {
            const data = req.room.getRouterRtpCapabilities();

            res.status(200).json(data);
        });

    /**
     * POST API to create a Broadcaster.
     */
    expressApp.post(
        '/rooms/:roomId/broadcasters', async (req, res, next) => {
            const {
                id,
                displayName,
                device,
            } = req.body;
            const rtpCapabilities = req.room.getRouterRtpCapabilities();
            try {
                const data = await req.room.createBroadcaster(
                    {
                        id,
                        displayName,
                        device,
                        rtpCapabilities
                    });

                res.status(200).json(data);
            }
            catch (error) {
                next(error);
            }
        });

    /**
     * DELETE API to delete a Broadcaster.
     */
    expressApp.delete(
        '/rooms/:roomId/broadcasters/:broadcasterId', (req, res) => {
            const { broadcasterId } = req.params;

            req.room.deleteBroadcaster({ broadcasterId });

            res.status(200).send('broadcaster deleted');
        });

    /**
     * POST API to create a mediasoup Transport associated to a Broadcaster.
     * It can be a PlainTransport or a WebRtcTransport depending on the
     * type parameters in the body. There are also additional parameters for
     * PlainTransport.
     */
    expressApp.post(
        '/rooms/:roomId/broadcasters/:broadcasterId/transports',
        async (req, res, next) => {
            const { broadcasterId } = req.params;
            const { type, rtcpMux, comedia, sctpCapabilities } = req.body;

            try {
                const data = await req.room.createBroadcasterTransport(
                    {
                        broadcasterId,
                        type,
                        rtcpMux,
                        comedia,
                        sctpCapabilities
                    });

                res.status(200).json(data);
            }
            catch (error) {
                next(error);
            }
        });

    /**
     * POST API to connect a Transport belonging to a Broadcaster. Not needed
     * for PlainTransport if it was created with comedia option set to true.
     */
    expressApp.post(
        '/rooms/:roomId/broadcasters/:broadcasterId/transports/:transportId/connect',
        async (req, res, next) => {
            const { broadcasterId, transportId } = req.params;
            const { dtlsParameters } = req.body;

            try {
                const data = await req.room.connectBroadcasterTransport(
                    {
                        broadcasterId,
                        transportId,
                        dtlsParameters
                    });

                res.status(200).json(data);
            }
            catch (error) {
                next(error);
            }
        });

    /**
     * POST API to create a mediasoup Producer associated to a Broadcaster.
     * The exact Transport in which the Producer must be created is signaled in
     * the URL path. Body parameters include kind and rtpParameters of the
     * Producer.
     */
    expressApp.post(
        '/rooms/:roomId/broadcasters/:broadcasterId/transports/:transportId/producers',
        async (req, res, next) => {
            const { broadcasterId, transportId } = req.params;
            const { kind, rtpParameters } = req.body;

            try {
                const data = await req.room.createBroadcasterProducer(
                    {
                        broadcasterId,
                        transportId,
                        kind,
                        rtpParameters
                    });

                res.status(200).json(data);
            }
            catch (error) {
                next(error);
            }
        });

    /**
     * POST API to create a mediasoup Consumer associated to a Broadcaster.
     * The exact Transport in which the Consumer must be created is signaled in
     * the URL path. Query parameters must include the desired producerId to
     * consume.
     */
    expressApp.post(
        '/rooms/:roomId/broadcasters/:broadcasterId/transports/:transportId/consume',
        async (req, res, next) => {
            const { broadcasterId, transportId } = req.params;
            const { producerId } = req.query;

            try {
                const data = await req.room.createBroadcasterConsumer(
                    {
                        broadcasterId,
                        transportId,
                        producerId
                    });

                res.status(200).json(data);
            }
            catch (error) {
                next(error);
            }
        });

    /**
     * POST API to create a mediasoup DataConsumer associated to a Broadcaster.
     * The exact Transport in which the DataConsumer must be created is signaled in
     * the URL path. Query body must include the desired producerId to
     * consume.
     */
    expressApp.post(
        '/rooms/:roomId/broadcasters/:broadcasterId/transports/:transportId/consume/data',
        async (req, res, next) => {
            const { broadcasterId, transportId } = req.params;
            const { dataProducerId } = req.body;

            try {
                const data = await req.room.createBroadcasterDataConsumer(
                    {
                        broadcasterId,
                        transportId,
                        dataProducerId
                    });

                res.status(200).json(data);
            }
            catch (error) {
                next(error);
            }
        });

    /**
     * POST API to create a mediasoup DataProducer associated to a Broadcaster.
     * The exact Transport in which the DataProducer must be created is signaled in
     */
    expressApp.post(
        '/rooms/:roomId/broadcasters/:broadcasterId/transports/:transportId/produce/data',
        async (req, res, next) => {
            const { broadcasterId, transportId } = req.params;
            const { label, protocol, sctpStreamParameters, appData } = req.body;

            try {
                const data = await req.room.createBroadcasterDataProducer(
                    {
                        broadcasterId,
                        transportId,
                        label,
                        protocol,
                        sctpStreamParameters,
                        appData
                    });

                res.status(200).json(data);
            }
            catch (error) {
                next(error);
            }
        });


    /**
    * 从房间拉取音频流并外送进行 ASR
    */
    expressApp.post(
        '/stream/pull/dm',
        async (req, res, next) => {
            try {
                if (req.body.mode === 'sync') { //同步模式
                    const rooms = Object.keys(global.streamInfo)
                    const peers = []
                    for (let room of rooms) {
                        const peersInRoom = Object.keys(global.streamInfo[room])
                        peers.push(peersInRoom)
                    }
                    const data = req.body.stream.mediasoup;
                    let roomIdNum = Number(data.room.slice(-1)) // 前段传递的伪数据
                    let userIdNum = Number(data.user.slice(-1))
                    const roomId = rooms[roomIdNum - 1]
                    const peerId = peers[roomIdNum - 1][userIdNum - 1]

                    const param = {
                        model: "async",
                        callback: {
                            onComplete: ""
                        },
                        config: req.body.config.config // 此处可能需要修改，不能暴露 token 
                    }

                    await startSync(roomId, peerId, param);
                    res.status(200).json({ mode: "sync", room: roomId, user: global.streamInfo[roomId][peerId]["name"] });

                } else if (req.body.mode === 'async') { //异步模式

                    const format = req.body.stream.file.format;
                    let file = req.body.stream.file.name;
                    file = `16k-${file.slice(-1)}.${format}`

                    const data = req.body.stream.file;
                    data.name = file;

                    const param = {
                        model: "async",
                        callback: {
                            onComplete: ""
                        },
                        config: req.body.config.config
                    }
                    await startAsync(file, param);
                    res.status(200).json({ mode: "async", format: format, file: file });

                }
            }
            catch (error) {
                console.log(error)
                next(error);
            }
        });

    /**
    * 从房间会话中生成直播流地址
    */
    expressApp.post(
        '/stream/pull/live',
        async (req, res, next) => {
            try {
                const rooms = Object.keys(global.streamInfo)
                const peers = []
                for (let room of rooms) {
                    const peersInRoom = Object.keys(global.streamInfo[room])
                    peers.push(peersInRoom)
                }
                const data = req.body;
                let roomIdNum = Number(data.room.slice(-1)) // 前段传递的伪数据
                let userIdNum = Number(data.user.slice(-1))
                const roomId = rooms[roomIdNum - 1]
                const peerId = peers[roomIdNum - 1][userIdNum - 1]

                const { sessionId, liveUrl } = liveStreamUrl(roomId, peerId);

                res.status(200).json({ room: roomId, user: global.streamInfo[roomId][peerId]["name"], liveUrl, sessionId });
            }
            catch (error) {
                console.log(error)
                next(error);
            }
        });

    /**
* 从房间会话中生成直播流地址
*/
    expressApp.post(
        '/stream/pull/live/stop',
        async (req, res, next) => {
            try {

                const sessionId = req.body.sessionId;
                const result = liveStreamStop(sessionId);

                res.status(200).json(result);
            }
            catch (error) {
                console.log(error)
                next(error);
            }
        });

    /**
     * 从房间拉流并进行相应操作（dm/rec/live/mux/transcript)
     */
    expressApp.post(
        '/stream/pull',
        async (req, res, next) => {
            try {
                const rooms = Object.keys(global.streamInfo)
                const peers = []
                for (let room of rooms) {
                    const peersInRoom = Object.keys(global.streamInfo[room])
                    peers.push(peersInRoom)
                }
                const data = req.body;
                let roomIdNum = Number(data.room.slice(-1)) // 前段传递的伪数据
                let userIdNum = Number(data.user.slice(-1))
                const roomId = rooms[roomIdNum - 1]
                const peerId = peers[roomIdNum - 1][userIdNum - 1]
                const { sessionId } = streamComposite(roomId, peerId);

                res.status(200).json({ sessionId });
            }
            catch (error) {
                console.log(error)
                next(error);
            }
        });


            /**
     * 从房间拉流并进行相应操作（dm/rec/live/mux/transcript)
     */
    expressApp.post(
        '/stream/render',
        async (req, res, next) => {
            try {

                const input = '/opt/www/tx-rtcStream/server/clan/input.txt';
                fs.writeFileSync(input, req.body.text, 'utf8');

                res.status(200).json({text: req.body});
            }
            catch (error) {
                next(error);
            }
        });


    /**
* 将外部流（数字人）推送到房间
*/
    expressApp.post(
        '/stream/push',
        async (req, res, next) => {
            try {
                const rooms = Object.keys(global.streamInfo)
                const data = req.body;
                let roomIdNum = Number(data.room.slice(-1)) // 前段传递的伪数据
                const roomId = rooms[roomIdNum - 1]

                const sessionId = await dh.start(roomId, data.streamAddr);
                console.log(sessionId);

                res.status(200).json({ room: `${data.room}(${roomId})`, streamAddr: data.streamAddr, sessionId });
            }
            catch (error) {
                console.log(error)
                next(error);
            }
        });



    /**
* 停止会话进程
*/
    expressApp.post(
        '/stream/session/stop',
        async (req, res, next) => {
            try {
                const sessionId = req.body.sessionId;
                const result = dh.stop(sessionId);
                res.status(200).json(result);
            }
            catch (error) {
                console.log(error)
                next(error);
            }
        });



    /**
     * Error handler.
     */
    expressApp.use(
        (error, req, res, next) => {
            if (error) {
                logger.warn('Express app %s', String(error));

                error.status = error.status || (error.name === 'TypeError' ? 400 : 500);

                res.statusMessage = error.message;
                res.status(error.status).send(String(error));
            }
            else {
                next();
            }
        });

    return expressApp;
}

module.exports = createExpressApp;