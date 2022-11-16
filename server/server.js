#!/usr/bin/env node

process.title = 'mediasoup-demo-server';
process.env.DEBUG = process.env.DEBUG || '*INFO* *WARN* *ERROR*';

const config = require('./config');

/* eslint-disable no-console */
// console.log('process.env.DEBUG:', process.env.DEBUG);
// console.log('config.js:\n%s', JSON.stringify(config, null, '  '));
/* eslint-enable no-console */

const fs = require('fs');
const https = require('https');
const url = require('url');
const protoo = require('protoo-server');
const mediasoup = require('mediasoup');
const express = require('express');
const bodyParser = require('body-parser');
const { AwaitQueue } = require('awaitqueue');
const Logger = require('./lib/Logger');
const utils = require('./lib/utils');
const Room = require('./lib/Room');
const interactiveServer = require('./lib/interactiveServer');
const interactiveClient = require('./lib/interactiveClient');

const createExpressApp = require('./router')

const WebSocket = require('ws');

const logger = new Logger();

const Stream = require('./lib/stream');

// Async queue to manage rooms.
// @type {AwaitQueue}
const queue = new AwaitQueue();

// Map of Room instances indexed by roomId.
// @type {Map<Number, Room>}
const rooms = new Map();

// HTTPS server.
// @type {https.Server}
let httpsServer;

// Express application.
// @type {Function}
let expressApp;

// Protoo WebSocket server.
// @type {protoo.WebSocketServer}
let protooWebSocketServer;

// mediasoup Workers.
// @type {Array<mediasoup.Worker>}
const mediasoupWorkers = [];

// Index of next mediasoup Worker to use.
// @type {Number}
let nextMediasoupWorkerIdx = 0;

run();

async function run() {
	// Open the interactive server.
	await interactiveServer();

	// Open the interactive client.
	if (process.env.INTERACTIVE === 'true' || process.env.INTERACTIVE === '1')
		await interactiveClient();

	// Run a mediasoup Worker.
	await runMediasoupWorkers();

	// Create Express app.
	await createExpressApp();

	// Run HTTPS server.
	await runHttpsServer();

	// // Run websocket server for ASR.
	// await runAsrSocketServer();

	// Run a protoo WebSocketServer.
	await runProtooWebSocketServer();

	// Log rooms status every X seconds.
	setInterval(() => {
		for (const room of rooms.values()) {
			room.logStatus();
		}
	}, 120000);
}

/**
 * Launch as many mediasoup Workers as given in the configuration file.
 */
async function runMediasoupWorkers() {
	const { numWorkers } = config.mediasoup;

	logger.info('running %d mediasoup Workers...', numWorkers);

	for (let i = 0; i < numWorkers; ++i) {
		const worker = await mediasoup.createWorker(
			{
				logLevel: config.mediasoup.workerSettings.logLevel,
				logTags: config.mediasoup.workerSettings.logTags,
				rtcMinPort: Number(config.mediasoup.workerSettings.rtcMinPort),
				rtcMaxPort: Number(config.mediasoup.workerSettings.rtcMaxPort)
			});

		worker.on('died', () => {
			logger.error(
				'mediasoup Worker died, exiting  in 2 seconds... [pid:%d]', worker.pid);

			setTimeout(() => process.exit(1), 2000);
		});

		mediasoupWorkers.push(worker);

		// Create a WebRtcServer in this Worker.
		if (process.env.MEDIASOUP_USE_WEBRTC_SERVER !== 'false') {
			// Each mediasoup Worker will run its own WebRtcServer, so those cannot
			// share the same listening ports. Hence we increase the value in config.js
			// for each Worker.
			const webRtcServerOptions = utils.clone(config.mediasoup.webRtcServerOptions);
			const portIncrement = mediasoupWorkers.length - 1;

			for (const listenInfo of webRtcServerOptions.listenInfos) {
				listenInfo.port += portIncrement;
			}

			const webRtcServer = await worker.createWebRtcServer(webRtcServerOptions);

			worker.appData.webRtcServer = webRtcServer;
		}

		// Log worker resource usage every X seconds.
		setInterval(async () => {
			const usage = await worker.getResourceUsage();

			logger.info('mediasoup Worker resource usage [pid:%d]: %o', worker.pid, usage);
		}, 120000);
	}
}



/**
 * Create a Node.js HTTPS server. It listens in the IP and port given in the
 * configuration file and reuses the Express application as request listener.
 */
async function runHttpsServer() {
	logger.info('running an HTTPS server...');

	expressApp = await createExpressApp();


	// HTTPS server for the protoo WebSocket server.
	const tls =
	{
		cert: fs.readFileSync(config.https.tls.cert),
		key: fs.readFileSync(config.https.tls.key)
	};

	httpsServer = https.createServer(tls, expressApp);

	await new Promise((resolve) => {
		httpsServer.listen(
			Number(config.https.listenPort), config.https.listenIp, resolve);
	});
}

/**
 * Create a Node.js websocket to connect asr service. 
 */
async function runAsrSocketServer() {
	logger.info('running an AsrSocket server...');
	const wss = new WebSocket.Server({ port: 60115 });

	wss.on('connection', function (ws) {
		console.log('client connected');
		ws.on('message', function (data, isBinary) {
			const message = isBinary ? data : data.toString()
			if (message === 'asrReady') {
				readyToSendBuffer(ws)
			}
		});
	});
}

/**
 * client is ready to accept buufer
 */
async function readyToSendBuffer(ws) {
	console.log("开始发送测试音频>>>>>>>>>:");
	//测试音频文件
	const bytesPerFrame = (16000 * 2 / 1000) * 160;//16000的采样率，16bits=2bytes， 1000ms，  一个数据帧 160ms
	const filePath = '../files/recorder/asrbot.pcm'
	const fileStream = fs.createReadStream(filePath);
	fileStream.on('readable', () => {
		while (null !== (buffer = fileStream.read(bytesPerFrame))) {
			ws.send(buffer);
		}
	})
}

/**
 * Create a protoo WebSocketServer to allow WebSocket connections from browsers.
 */
async function runProtooWebSocketServer() {
	logger.info('running protoo WebSocketServer...');

	// Create the protoo WebSocket server.
	protooWebSocketServer = new protoo.WebSocketServer(httpsServer,
		{
			maxReceivedFrameSize: 960000, // 960 KBytes.
			maxReceivedMessageSize: 960000,
			fragmentOutgoingMessages: true,
			fragmentationThreshold: 960000
		});

	// Handle connections from clients.
	protooWebSocketServer.on('connectionrequest', (info, accept, reject) => {
		// The client indicates the roomId and peerId in the URL query.
		const u = url.parse(info.request.url, true);
		const roomId = u.query['roomId'];
		const peerId = u.query['peerId'];

		if (!roomId || !peerId) {
			reject(400, 'Connection request without roomId and/or peerId');

			return;
		}

		// Stream.addPeer(roomId,peerId)

 

		logger.info(
			'protoo connection request [roomId:%s, peerId:%s, address:%s, origin:%s]',
			roomId, peerId, info.socket.remoteAddress, info.origin);

			global.peerRoom.set(peerId, roomId);


		// Serialize this code into the queue to avoid that two peers connecting at
		// the same time with the same roomId create two separate rooms with same
		// roomId.
		queue.push(async () => {
			const room = await getOrCreateRoom({ roomId });

			// Accept the protoo WebSocket connection.
			const protooWebSocketTransport = accept();

			room.handleProtooConnection({ peerId, protooWebSocketTransport });
		})
			.catch((error) => {
				logger.error('room creation or room joining failed:%o', error);

				reject(error);
			});
	});
}

/**
 * Get next mediasoup Worker.
 */
function getMediasoupWorker() {
	const worker = mediasoupWorkers[nextMediasoupWorkerIdx];

	if (++nextMediasoupWorkerIdx === mediasoupWorkers.length)
		nextMediasoupWorkerIdx = 0;

	return worker;
}

/**
 * Get a Room instance (or create one if it does not exist).
 */
async function getOrCreateRoom({ roomId }) {
	let room = rooms.get(roomId);

	// If the Room does not exist create a new one.
	if (!room) {
		logger.info('creating a new Room [roomId:%s]', roomId);

		const mediasoupWorker = getMediasoupWorker();

		room = await Room.create({ mediasoupWorker, roomId });

		rooms.set(roomId, room);

		Stream.addRoom(roomId);

		room.on('close', () => {
			rooms.delete(roomId);
			Stream.deleteRoom(roomId);
		});

	}

	return room;
}
