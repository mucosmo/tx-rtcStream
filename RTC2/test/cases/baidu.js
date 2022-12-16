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

            }
        },
        dep: {
            "status.getData": true
        },
        tipTpl: '测初始化函数'
    },
]

export default cases;