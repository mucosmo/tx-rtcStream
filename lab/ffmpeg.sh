#!/usr/bin/env bash

timestamp=$(date +%s)

outputvideo=../files/composites/shell-${timestamp}.

# 568*320
video1=../files/resources/filevideo.mp4
# 568*320
office=../files/resources/office.mp4
# 568*320
video2=../files/resources/video2.mp4
# 1401*1261
png=../files/resources/fileimage.png
gif=../files/resources/gif.gif
mask=../files/resources/mask.png
svg=../files/resources/svg.svg
rtmp=rtmp://175.178.31.221:51013/live/m25126490957938689
m3u8=http://hz-test.ikandy.cn:60125/files/1669358475054g2l5bihp6e/mediasoup_live.m3u8
dh=../files/resources/dh.mp4
subtitles=../files/resources/subtitles.srt
font=/usr/share/fonts/chinese/SIMKAI.TTF
drawtext="你好啊"
drawtextfile=../files/resources/drawtext.txt
screen5s=../files/resources/screen5s.mp4


# ffmpeg -hide_banner -h filter=transpose

# ffplay -hide_banner -f lavfi -i testsrc -vf transpose=1

# ffmpeg -i resources/filevideo.mp4 -vf "hqdn3d,pad=2*iw" output.mp4

# gif
# ffmpeg -i ${video1} -ignore_loop 0 -i ${gif} -filter_complex "[0:v][1:v]overlay=10:10:shortest=1" output.mp4

# 滤镜图中有空格时，需要用双引号括起来，否则会报错
# ffmpeg -i resources/filevideo.mp4 -lavfi "split[main][tmp];[tmp]crop=iw:ih/2:0:0,vflip[flip];[main][flip]overlay=0:H/2" ${outputvideo}

# 需要 --enable-librsvg
# ffmpeg -i ${svg} test.png

# 字幕向上滚动
# ffplay -hide_banner -f lavfi -i color=size=640x480:duration=10:rate=25:color=green -vf "drawtext=fontfile=/path/to/helvitca.ttf:fontsize=100:fontcolor=FFFFFF:x=(w-text_w)/2:y=h-80*t:text='Hello World'"

# # alphamerge 时两个对象大小必须一致
# ffmpeg -i ${video1} -i ${png} -i ${png} -i ${mask} -i ${video2} -i ${gif} -i ${svg} -loop 3 -filter_complex "[1]crop=100:50:0:0[cropped1];[2]crop=100:50:0:0[cropped2];[3]alphaextract[amask];[amask]scale=100:100[vmask];[4:v]scale=100:100[cropped4];[cropped4][vmask]alphamerge[avatar];[0][cropped1]overlay=W-w-10:10[ov1];[ov1][cropped2]overlay=W-w-10:100[ov2];[ov2][avatar]overlay=W-w:H/3[ov3];[5:v]scale=50:50[gif];[ov3][gif]overlay=W-w-10:H/2[ov4];[ov4]subtitles=resources/subtitles.srt[final];[final]drawtext=text=string1:fontfile=foo.ttf:x=(w-text_w)/2:y=h-80*t:fontcolor=white:fontsize=40:shadowx=2:shadowy=2" -max_muxing_queue_size 1024 ${outputvideo}

# # 从会议中拉取流
# ffmpeg -i ${video1} -i ${png} -i ${mask} -i ${video2} -i ${gif} -filter_complex "[1]crop=100:50:200:200[cropped1];[2]alphaextract[amask];[amask]scale=150:150[vmask];[3:v]scale=150:150[cropped3];[cropped3][vmask]alphamerge[avatar];[0][cropped1]overlay=W-w-10:10[ov1];[ov1][avatar]overlay=10:10[ov2];[4:v]scale=50:50[gif];[ov2][gif]overlay=W-w-10:H/2" -max_muxing_queue_size 1024 -f matroska - | ffplay -


# # 添加绿幕背景
# ffmpeg -i ${video1} -i ${png} -i ${mask} -i ${video2} -i ${gif} -i ${dh}  -filter_complex "[1]crop=100:50:200:200[cropped1];[2]alphaextract[amask];[amask]scale=150:150[vmask];[3:v]scale=150:150[cropped3];[cropped3][vmask]alphamerge[avatar];[0][cropped1]overlay=W-w-10:10[ov1];[ov1][avatar]overlay=10:10[ov2];[4:v]scale=50:50[gif];[ov2][gif]overlay=W-w-10:H/2[ov3];[5:v]scale=150:-1,chromakey=0x00ff00:0.3:0.05[ov4];[ov3][ov4]overlay=-20:H*0.6[ov5];[ov5]subtitles=${subtitles}[final];[final]drawtext=text=string1:fontfile=${font}:x=(w-text_w)/2:y=h-80*t:fontcolor=white:fontsize=40:shadowx=2:shadowy=2" -max_muxing_queue_size  1024  ${outputvideo}flv

# # # 循环播放
# ffmpeg -i ${video1}    -filter_complex "loop=loop=-1:size=500:start=0" -max_muxing_queue_size  1024  -r 25 -f flv rtmp://121.5.133.154:1935/myapp/12345

# # 简单转码, 设置码率(清晰度) -b 2M     直播时固定输入帧率 -re
# ffmpeg -re -i ${office} -filter_complex "scale=500:-1,drawtext=fontfile=${font}:text=TXCO:x=30:y=20:fontcolor=green:fontsize=50" -c:v flv -b:v 3M -f flv rtmp://121.5.133.154:1935/myapp/12345


# # -q 参数可以压制调试模式的数据输出
#  gst-launch-1.0 -v videotestsrc pattern=snow ! video/x-raw,width=1280,height=720  ! filesink location= /dev/stdout | ffmpeg -y -i - -codec copy -f flv test.flv


# # 从 gstreamer 输出到 ffmpeg
# # fdsink 可替换成 filesink location=/dev/stdout
# gst-launch-1.0 -v -q  videotestsrc pattern=0 ! video/x-raw,width=1280,height=720  ! matroskamux ! fdsink | ffmpeg -y -i - -i ${rtmp} -filter_complex "[1:v]scale=150:-1[ov1];[0][ov1]overlay=-20:H*0.6" -c:v libx264 -t 5 -preset faster -crf 25 -r 30 ${outputvideo}mp4

# # 错误条纹
# gst-launch-1.0 -v -q filesrc location=${rtmp} ! fdsink | ffmpeg -i - -i ${png} -i ${mask} -i ${video2} -i ${gif} -i ${dh}  -filter_complex "[1]crop=100:50:200:200[cropped1];[2]alphaextract[amask];[amask]scale=150:150[vmask];[3:v]scale=150:150[cropped3];[cropped3][vmask]alphamerge[avatar];[0][cropped1]overlay=W-w-10:10[ov1];[ov1][avatar]overlay=10:10[ov2];[4:v]scale=50:50[gif];[ov2][gif]overlay=W-w-10:H/2[ov3];[5:v]chromakey=0x00ff00:0.3:0.05[ov4];[ov3][ov4]overlay=-20+5*n:H*0.5[ov5];[ov5]subtitles=${subtitles}[final];[final]drawtext=textfile=${drawtextfile}:reload=1:fontfile=${font}:x=(w-text_w)/2:y=h-80*t:fontcolor=white:fontsize=40:shadowx=2:shadowy=2" -max_muxing_queue_size 1024 -f flv rtmp://localhost:1935/myapp/12345


# # 打开多个文件时可以把其他文件放到 filter 中的 movie 路径
# ffmpeg -re -i ${office} -filter_complex "movie=${png}[m0];movie=${video1}[m1];[m0]scale=200:-1[m0scale];[m1]scale=300:-1[m1scale];[0][m0scale]overlay=2:2[out1];[out1][m1scale]overlay=200:100" -t 5 ${outputvideo}mp4

 ffmpeg -re -i ${screen5s} -filter_complex "scale=200:350" -t 5 ${outputvideo}mp4




# # #  test-hz 服务器上 ffmpeg 的构造
# PKG_CONFIG_PATH="/opt/program/ffmpeg/lib/pkgconfig" ./configure \
#   --pkg-config-flags="--static" \
#   --extra-cflags="-I/opt/program/ffmpeg/include" \
#   --extra-ldflags="-L/opt/program/ffmpeg/lib" \
#   --extra-libs="-lpthread -lm" \
#   --ld="g++"  --prefix=/opt/program/ffmpeg --enable-shared --enable-gpl --enable-version3 --enable-static --disable-debug --disable-ffplay --disable-indev=sndio --disable-outdev=sndio --cc=gcc --enable-fontconfig  --enable-gnutls --enable-gmp --enable-gray --enable-libaom --enable-libfribidi --enable-libass --enable-libfreetype --enable-libmp3lame --enable-libopus --enable-libvpx  --enable-libx264 --enable-libx265 


# # c 程序转码时绘制文本
# drawtext=text=string1:fontfile=/usr/share/fonts/chinese/SIMKAI.TTF:x=(w-text_w)/2:y=h-80*t:fontcolor=white:fontsize=40

# # 源码 overlay image 和 video
#  movie=/opt/application/tx-rtcStream/files/resources/fileimage.png[m0];movie=/opt/application/tx-rtcStream/files/resources/screen5s.mp4[m1];[in][m0]overlay=20:200[out1];[out1][m1]overlay=200:100

# # 源码 scale 大小
# scale=200:-300
