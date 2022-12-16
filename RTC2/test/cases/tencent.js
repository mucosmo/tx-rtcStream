let cases = [
    {
        action: {
            "type": "func",
            "name": "getData",
            "param": {
                "userId": '123',
                "roomId": 'room001'
            }
        },
        tipTpl: '测初始化函数'
    },
    {
        action: {
            "type": "func",
            "name": "create",
            "param": {
                appid: "appmfvruz4551kg",
                authenticationKey: "eJyrVgrxCdYrSy1SslIy0jNQ0gHzM1NS80oy0zLBwoZGxlDh4pTsxIKCzBQlK0MTAwNTY0sLAwOITGpFQWZRKlDc1NTUyAAmWpKZCxIzMzEAqjc3N4WakpkONDUw0NGr0NjUJbzKszw8PSwpwyA1L7XAJ9DT0T3f2d3S2zzU38w-yyDfzdzCVqkWAEa3Lyo_",
                mode: "rtc",
                roomId: "room001",
                userId: "123",
                userid: "1003506"
            }
        },
        dep: {
            "status.getData": 'true'
        },
        tipTpl: '测初始化函数'
    },
    {
        action: {
            "type": "func",
            "name": "subscribe",
            "param": {

            }
        },
        dep: {
            "status.create": 'created'
        },
        tipTpl: '测初始化函数'
    },
    {
        action: {
            "type": "func",
            "name": "join",
            "param": {
                "userId": '123',
                "roomId": "room001"
            }
        },
        dep: {
            "status.create": 'created'
        },
        tipTpl: '测初始化函数'
    },
    {
        action: {
            "type": "func",
            "name": "createStream",
            "param": {
                "userId": '123',
                "audio": true,
                "video": false
            }
        },
        dep: {
            "status.create": 'created'
        },
        tipTpl: '测初始化函数'
    },
    {
        action: {
            "type": "func",
            "name": "initialize",
            "param": {

            }
        },
        dep: {
            "status.createStream": 'createStreamed'
        },
        tipTpl: '测初始化函数'
    },
    {
        action: {
            "type": "func",
            "name": "publish",
            "param": {

            }
        },
        dep: {
            "status.createStream": 'createStreamed'
        },
        tipTpl: '测初始化函数'
    },
    // {
    //     action: {
    //         "type": "func",
    //         "name": "switchCamera",
    //         "param": {

    //         }
    //     },
    //     dep: {
    //         "status.create": 'created',
    //         "status.createStream": 'createStreamed'
    //     },
    //     tipTpl: '测初始化函数'
    // },
    {
        action: {
            "type": "func",
            "name": "switchAudio",
            "param": {

            }
        },
        dep: {
            "status.initialize": true
        },
        tipTpl: '测初始化函数'
    },
]
export default cases;