// 用于进程管理

global.processObj = {}

const kill = require('tree-kill');

module.exports = function (sessionId) {

    const pid = global.processObj[sessionId]
    if (pid) {
        kill(pid);
        return {sessionId, pid}
    }else{
        return `sessionId: ${sessionId} does not exist.`
    }

}