let streamInfo = {}

let peerRoom = new Map();

global.peerRoom = peerRoom;

global.streamInfo = streamInfo;

class Stream {
    // 删除房间
    static addRoom(roomId) {
        streamInfo[roomId] = {}
    }


    // 删除房间
    static deleteRoom(roomId) {
        delete streamInfo[roomId]
    }

    // 房间有新用户
    static addPeer(peer, info, type) {
        const peerId =  peer.data.peerId;
        const roomId = global.peerRoom.get(peerId)

        streamInfo[roomId][peerId] = streamInfo[roomId][peerId] ?? {}

        if (type === 'video') {
            streamInfo[roomId][peerId]["video"] = info.video
            streamInfo[roomId][peerId]["fileName"] = info.fileName
        }
        if (type === 'audio') {
            streamInfo[roomId][peerId]["audio"] = info.audio
        }
        streamInfo[roomId][peerId]['consumers'] = peer.data.consumers
        streamInfo[roomId][peerId]['name'] = peer.data.displayName
    }

    // 删除某个房间用户
    static deletePeer(roomId, peerId) {
        delete streamInfo[roomId][peerId]
    }
}

module.exports = Stream;


