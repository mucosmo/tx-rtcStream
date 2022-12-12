
timestamp=$(date +%s)
outputvideo=/opt/application/tx-rtcStream/files/composites/c-${timestamp}.mp4

# # RTMP 推流
# ./transcoding /opt/application/tx-rtcStream/files/resources/screen5s.mp4 rtmp://121.5.133.154:1935/myapp/12345


# RTMP 生成文件
./transcoding /opt/application/tx-rtcStream/files/resources/screen5s.mp4 ${outputvideo}

end_time=$(date +%s)


echo c-execution time was `expr $end_time - $timestamp` s
