import RTC from './index.js';


const client = new RTC({ sp: 'mediasoup' });

await client.init({ roomId: 'zdwiu3he', userId: 'peerIdSdk01' });

await client.join();

// await client.leave();