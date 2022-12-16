let cases = [
    {
        action: {
            "type": "func",
            "name": "create",
            "param": {

            }
        },
        tipTpl: '测初始化函数'
    },
    {
        action: {
            "type": "func",
            "name": "join",
            "param": {
                "appId": 'c1e4086c57c640c994dcdf20cd295c44',
                "channel": "demo_channel_name",
                "token": null
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
            "name": "publish",
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
            "name": "leave",
            "param": {
                
            }
        },
        dep: {
            "status.create": 'created'
        },
        tipTpl: '测初始化函数'
    },
]

export default cases;