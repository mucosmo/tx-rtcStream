/**视频合成时需要处理的文件格式*/
type srcFormat = "video" | "audio" | "picture" | "lipSync";

/**数据源*/
const src = {
    videos: [{
        path: "dh.mp4",
        metadata: {
            duration: "00:01:02.21",
            bitrate: 1160,
            codec: "h264", //libx264
            format: "yuv420",
            w: 800,
            h: 600,
            fps: 30,
            tbn: 30000, //视频流时间基准
            tbr: 30 // 帧率
        }
    }],
    audios: [
        {
            path: "speech.mp3",
            metadata: {
                duration: "00:02:02.50",
                bitrate: 24,
                codec: "mp3", //libmp3lame
                channels: 1,
                samplerate: 16000,
            }
        }

    ],
    pictures: [{
        path: "face.png",
        metadata: {
            codec: "png",
            format: "rgb24",
            w: 1200,
            h: 900,
            fps: 25
        }
    }
    ],
    lipSyncs: [{
        path: "subtitles.src",
        text: "hello"
    }]
}

/**初始模板*/
const tpl = {
    videos: [{
        layer: 0, //层级
        src: "", // 数据源
        filters: [], // 滤波器组
        validFilters: ["scale", "drawtext"], // 可接受的 filter 名称列表
        start: 0, //开始帧
        end: 30, //结束帧
        scale: { //缩放
            x: 1,
            y: -1
        },
        area: { //位置和大小
            x: 10,
            y: 10,
            w: 100,
            h: 200
        }
    }
    ],
    pictures: [
        {
            layer: 1,
            src: "",
            filters: [],
            validFilters: ["crop", "chromakey"],
            start: 0,
            end: 30,
            area: {
                x: 10,
                y: 10,
                w: 100,
                h: 200
            }
        }
    ],
    audios: [
        {
            layer: 5,
            src: "",
            filter: [],
            validFilters: ["hass", "compand"],
            start: 0,
            end: 30,
        }
    ]
}

/**从数据源到模板区块的映射关系*/
const tplMap = new Map();
tplMap.set("tpl.videos[0].src", src.videos[1]);
tplMap.set("tpl.audios[1].src", src.audios[0]);
tplMap.set("tpl.pictures[0].src", src.pictures[3]);

/**对模板区块控制*/
tplMap.set("tpl.videos[0].layer", 2);
tplMap.set("tpl.videos[0].area", { x: 10, y: 20, w: 200, h: 200 });
tplMap.set("tpl.videos[0].scale", { x: 0.5, y: 2 });

/**滤波器示例*/
const filters0 = [
    {
        name: "drawtext",
        options: {
            fontsize: 10,
            color: "green",
            fontfile: "SIMKAI.TTF",
            textfile: "subtitles.srt",
            weight: "light",
            background: "red",
            opacity: 0.2,
        }
    },
    {
        name: "alphaextract",
    },
]
const filters1 = [
    {
        name: "chromakey",
        options: {
            color: 0x00ff00,
            similarity: 0.3,
            blend: 0.4,
        }
    }
]

/**对模板中区块进行滤波*/
tplMap.set("tpl.videos[0].filters", filters0);
tplMap.set("tpl.pictures[0].filters", filters1);

/**更新模板区块的滤波器参数*/
tplMap.set("tpl.videos[0].filters[0].text", "world");
tplMap.set("tpl.videos[0].filters[0].opacity", 0.5);
tplMap.set("tpl.videos[0].filters[0].blend", 0.3);
