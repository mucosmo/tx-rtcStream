
let util = {
    "RTC": { //$infraType
        "spNo": "baidu", //告诉应用,应该使用哪个平台做消息订阅
        "baidu": {          
            "appID": "appmfvruz4551kg",
            "SDK": { //SDK资源路径, 需要考虑不同语言的包
                "js": "https://code.bdstatic.com/npm/baidurtc@1.1.2/dist/baidu.rtc.sdk.js",
                "uni-app": "",
            },
            "API": {  //API 不同方法的访问路径,需要细化有哪些方法,不同utilType方法可能不同

            }
        }
    },
    "TRTC": { //$infraType
        "spNo": "tencnet", //告诉应用,应该使用哪个平台做消息订阅
        "tencnet": {          
            "sdkAppID": "",
            "userSig": "",
            "SDK": { //SDK资源路径, 需要考虑不同语言的包
                "js": "",
                "uni-app": "",
            },
            "API": {  //API 不同方法的访问路径,需要细化有哪些方法,不同utilType方法可能不同

            }
        }
    }
}

export default util;