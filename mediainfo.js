// 用 ffprobe 获取的信息
`Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '/opt/application/tx-rtcStream/files/resources/screen18s.mp4':
  Metadata:
    major_brand     : isom
    minor_version   : 512
    compatible_brands: isomiso2avc1mp41
    encoder         : Lavf58.20.100
  Duration: 00:00:17.40, start: 0.000000, bitrate: 1557 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, smpte170m/bt470bg/smpte170m, progressive), 720x1280, 1502 kb/s, 30 fps, 30 tbr, 90k tbn (default)
    Metadata:
      handler_name    : VideoHandler
      vendor_id       : [0][0][0][0]
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, mono, fltp, 48 kb/s (default)
    Metadata:
      handler_name    : SoundHandler
      vendor_id       : [0][0][0][0]`

// 从 mediaInfo 获取的信息
const info = {
    "creatingLibrary": {
        "name": "MediaInfoLib",
        "version": "22.06",
        "url": "https://mediaarea.net/MediaInfo"
    },
    "media": {
        "@ref": "C:\\Users\\eddie\\Desktop\\screen18s.mp4",
        "track": [
            {
                "@type": "General",
                "VideoCount": "1",
                "AudioCount": "1",
                "FileExtension": "mp4",
                "Format": "MPEG-4",
                "Format_Profile": "Base Media",
                "CodecID": "isom",
                "CodecID_Compatible": "isom/iso2/avc1/mp41",
                "FileSize": "3388449",
                "Duration": "17.400",
                "OverallBitRate_Mode": "VBR",
                "OverallBitRate": "1557908",
                "FrameRate": "30.000",
                "FrameCount": "522",
                "StreamSize": "17340",
                "HeaderSize": "17332",
                "DataSize": "3371117",
                "FooterSize": "0",
                "IsStreamable": "Yes",
                "File_Created_Date": "UTC 2022-12-09 10:44:58.316",
                "File_Created_Date_Local": "2022-12-09 18:44:58.316",
                "File_Modified_Date": "UTC 2022-12-09 10:45:03.710",
                "File_Modified_Date_Local": "2022-12-09 18:45:03.710",
                "Encoded_Application": "Lavf58.20.100" // *Lib*av*format version 58.20.100, info for debugging, and lavf is part of ffmpeg
            },
            {
                "@type": "Video",
                "StreamOrder": "0",
                "ID": "1",
                "Format": "AVC",
                "Format_Profile": "High",
                "Format_Level": "3.1",
                "Format_Settings_CABAC": "Yes",
                "Format_Settings_RefFrames": "1",
                "Format_Settings_GOP": "M=1, N=31",
                "CodecID": "avc1",
                "Duration": "17.400",
                "Duration_FirstFrame": "-0.000",
                "BitRate": "1502168",
                "Width": "720",
                "Height": "1280",
                "Sampled_Width": "720",
                "Sampled_Height": "1280",
                "PixelAspectRatio": "1.000",
                "DisplayAspectRatio": "0.562",
                "Rotation": "0.000",
                "FrameRate_Mode": "CFR",
                "FrameRate": "30.000",
                "FrameCount": "522",
                "Standard": "NTSC",
                "ColorSpace": "YUV",
                "ChromaSubsampling": "4:2:0",
                "BitDepth": "8",
                "ScanType": "Progressive",
                "StreamSize": "3267215",
                "colour_description_present": "Yes",
                "colour_description_present_Source": "Container / Stream",
                "colour_range": "Limited",
                "colour_range_Source": "Container / Stream",
                "colour_primaries": "BT.709",
                "colour_primaries_Source": "Container",
                "colour_primaries_Original": "BT.601 PAL",
                "colour_primaries_Original_Source": "Stream",
                "transfer_characteristics": "BT.709",
                "transfer_characteristics_Source": "Container",
                "transfer_characteristics_Original": "BT.601",
                "transfer_characteristics_Original_Source": "Stream",
                "matrix_coefficients": "BT.709",
                "matrix_coefficients_Source": "Container",
                "matrix_coefficients_Original": "BT.601",
                "matrix_coefficients_Original_Source": "Stream",
                "extra": {
                    "CodecConfigurationBox": "avcC"
                }
            },
            {
                "@type": "Audio",
                "StreamOrder": "1",
                "ID": "2",
                "Format": "AAC",
                "Format_AdditionalFeatures": "LC",
                "CodecID": "mp4a-40-2",
                "Duration": "17.260",
                "BitRate_Mode": "VBR",
                "BitRate": "48000",
                "BitRate_Maximum": "50625",
                "Channels": "1",
                "ChannelPositions": "Front: C",
                "ChannelLayout": "C",
                "SamplesPerFrame": "1024",
                "SamplingRate": "48000",
                "SamplingCount": "828480",
                "FrameRate": "46.875",
                "FrameCount": "809",
                "Compression_Mode": "Lossy",
                "StreamSize": "103894",
                "StreamSize_Proportion": "0.03066",
                "Default": "Yes",
                "AlternateGroup": "1"
            }
        ]
    }
}
