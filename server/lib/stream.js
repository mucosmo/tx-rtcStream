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
    static addPeer(roomId, peerId, info,consumers) {
        streamInfo[roomId][peerId] = {}

        if (info.video) {
            streamInfo[roomId][peerId]["video"] = info.video
        }
        if (info.audio) {
            streamInfo[roomId][peerId]["audio"] = info.audio
        }

        streamInfo[roomId][peerId]['consumers'] = consumers


    }

    // 删除某个房间用户
    static deleltePeer(roomId, peerId) {
        delete streamInfo[roomId][peerId]
    }
}

module.exports = Stream;


