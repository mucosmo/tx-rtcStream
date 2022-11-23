// 用于进程管理

global.processObj = {}

const kill = require('tree-kill');

module.exports =  function (sessionId) {
    kill(global.processObj[sessionId])
}