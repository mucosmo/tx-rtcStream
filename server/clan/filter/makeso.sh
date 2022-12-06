rm -rf filtering_video.o
make
gcc -fPIC -shared -rdynamic  filtering_video.o -L/opt/program/ffmpeg/lib -lavcodec -lavformat -lavfilter -lavutil -o filter.so