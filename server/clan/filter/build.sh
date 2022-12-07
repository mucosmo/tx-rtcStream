rm -rf filtering_video.o transcoding.o

make
gcc -fPIC -shared -rdynamic  filtering_video.o -L/opt/program/ffmpeg/lib -lavcodec -lavformat -lavfilter -lavutil -lavdevice -o filtering_video.so

gcc -fPIC -shared -rdynamic  transcoding.o -L/opt/program/ffmpeg/lib -lavcodec -lavformat -lavfilter -lavutil -lavdevice -o transcoding.so