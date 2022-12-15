/*
 * Copyright (c) 2010 Nicolas George
 * Copyright (c) 2011 Stefano Sabatini
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * @file
 * API example for decoding and filtering
 * @example filtering_video.c
 */

#define _XOPEN_SOURCE 600 /* for usleep */
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>

#include <unistd.h>
#include <fcntl.h>

#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavfilter/buffersink.h>
#include <libavfilter/buffersrc.h>
#include <libavutil/opt.h>
#include <libavutil/time.h>
#include <libavdevice/avdevice.h>

const char *filter_descr = "scale=100:-1,drawtext=fontfile=/usr/share/fonts/chinese/SIMKAI.TTF:text=100:x=(w-tw)/2:y=h-10:fontcolor=green:fontsize=30";
/* other way:
   scale=78:24 [scl]; [scl] transpose=cclock // assumes "[in]" and "[out]" to be input output pads respectively
 */

static AVFormatContext *fmt_ctx;
static AVCodecContext *dec_ctx;
static AVCodecContext *enc_ctx;
AVFilterContext *buffersink_ctx;
AVFilterContext *buffersrc_ctx;
AVFilterGraph *filter_graph;
static int video_stream_index = -1;

static int64_t last_pts = AV_NOPTS_VALUE;

AVFormatContext *octx = NULL;

/**
 * 错误输出
 */
int XError(int errNum)
{
    printf("--- My Error");
    char buf[1024] = {0};
    av_strerror(errNum, buf, sizeof(buf));
    // cout << buf << endl;
    // getchar();
    return -1;
}
/**
 * 帧率转小数
 */
static double r2d(AVRational r)
{
    return r.num == 0 || r.den == 0 ? 0. : (double)r.num / (double)r.den;
}

static int open_input_file(const char *filename)
{
    const AVCodec *dec;
    int ret;

    if ((ret = avformat_open_input(&fmt_ctx, filename, NULL, NULL)) < 0)
    {
        av_log(NULL, AV_LOG_ERROR, "Cannot open input file\n");
        return ret;
    }

    if ((ret = avformat_find_stream_info(fmt_ctx, NULL)) < 0)
    {
        av_log(NULL, AV_LOG_ERROR, "Cannot find stream information\n");
        return ret;
    }

    /* select the video stream */
    ret = av_find_best_stream(fmt_ctx, AVMEDIA_TYPE_VIDEO, -1, -1, &dec, 0); // 数据流的编解码器
    if (ret < 0)
    {
        av_log(NULL, AV_LOG_ERROR, "Cannot find a video stream in the input file\n");
        return ret;
    }
    video_stream_index = ret; // 1

    printf("--- video_stream_index: %d \n", ret); // 1
    printf("--- dec name: %s \n", dec->name);     // 264

    // av_usleep(100000000000);

    /* create decoding context */
    dec_ctx = avcodec_alloc_context3(dec); // 解码上下文
    // enc_ctx = avcodec_alloc_context3(dec); // 编码上下文
    if (!dec_ctx)
        return AVERROR(ENOMEM);
    avcodec_parameters_to_context(dec_ctx, fmt_ctx->streams[video_stream_index]->codecpar);
    // avcodec_parameters_to_context(enc_ctx, fmt_ctx->streams[video_stream_index]->codecpar);

    /* init the video decoder */
    if ((ret = avcodec_open2(dec_ctx, dec, NULL)) < 0)
    // if ((ret = avcodec_open2(dec_ctx, dec, NULL)) < 0 || (ret = avcodec_open2(enc_ctx, dec, NULL)) < 0)
    {
        av_log(NULL, AV_LOG_ERROR, "Cannot open video decoder\n");
        return ret;
    }

    return 0;
}

static int init_filters(const char *filters_descr)
{
    char args[512];
    int ret = 0;
    const AVFilter *buffersrc = avfilter_get_by_name("buffer");
    const AVFilter *buffersink = avfilter_get_by_name("buffersink");
    AVFilterInOut *outputs = avfilter_inout_alloc();
    AVFilterInOut *inputs = avfilter_inout_alloc();
    AVRational time_base = fmt_ctx->streams[video_stream_index]->time_base;
    enum AVPixelFormat pix_fmts[] = {AV_PIX_FMT_GRAY8, AV_PIX_FMT_NONE};

    filter_graph = avfilter_graph_alloc();
    if (!outputs || !inputs || !filter_graph)
    {
        ret = AVERROR(ENOMEM);
        goto end;
    }

    /* buffer video source: the decoded frames from the decoder will be inserted here. */
    snprintf(args, sizeof(args),
             "video_size=%dx%d:pix_fmt=%d:time_base=%d/%d:pixel_aspect=%d/%d",
             dec_ctx->width, dec_ctx->height, dec_ctx->pix_fmt,
             time_base.num, time_base.den,
             dec_ctx->sample_aspect_ratio.num, dec_ctx->sample_aspect_ratio.den);

    ret = avfilter_graph_create_filter(&buffersrc_ctx, buffersrc, "in",
                                       args, NULL, filter_graph);
    if (ret < 0)
    {
        av_log(NULL, AV_LOG_ERROR, "Cannot create buffer source\n");
        goto end;
    }

    /* buffer video sink: to terminate the filter chain. */
    ret = avfilter_graph_create_filter(&buffersink_ctx, buffersink, "out",
                                       NULL, NULL, filter_graph);
    if (ret < 0)
    {
        av_log(NULL, AV_LOG_ERROR, "Cannot create buffer sink\n");
        goto end;
    }

    ret = av_opt_set_int_list(buffersink_ctx, "pix_fmts", pix_fmts,
                              AV_PIX_FMT_NONE, AV_OPT_SEARCH_CHILDREN);
    if (ret < 0)
    {
        av_log(NULL, AV_LOG_ERROR, "Cannot set output pixel format\n");
        goto end;
    }

    /*
     * Set the endpoints for the filter graph. The filter_graph will
     * be linked to the graph described by filters_descr.
     */

    /*
     * The buffer source output must be connected to the input pad of
     * the first filter described by filters_descr; since the first
     * filter input label is not specified, it is set to "in" by
     * default.
     */
    outputs->name = av_strdup("in");
    outputs->filter_ctx = buffersrc_ctx;
    outputs->pad_idx = 0;
    outputs->next = NULL;

    /*
     * The buffer sink input must be connected to the output pad of
     * the last filter described by filters_descr; since the last
     * filter output label is not specified, it is set to "out" by
     * default.
     */
    inputs->name = av_strdup("out");
    inputs->filter_ctx = buffersink_ctx;
    inputs->pad_idx = 0;
    inputs->next = NULL;

    if ((ret = avfilter_graph_parse_ptr(filter_graph, filters_descr,
                                        &inputs, &outputs, NULL)) < 0)
        goto end;

    if ((ret = avfilter_graph_config(filter_graph, NULL)) < 0)
        goto end;

end:
    avfilter_inout_free(&inputs);
    avfilter_inout_free(&outputs);

    return ret;
}

/**
 * 创建输出流上下文
 */
int create_pipeline(AVFormatContext *ictx, const char *outUrl)
{

    av_dump_format(ictx, 0, "inUrl", 0);

    int re = avformat_alloc_output_context2(&octx, 0, "flv", outUrl);
    if (!octx)
    {
        return XError(re);
    }
    // cout << "octx create success!" << endl;

    //配置输出流
    //遍历输入的AVStream

    // printf("--- nb_stream: %d \n", ictx->nb_streams); // 2
    for (int i = 0; i < ictx->nb_streams; i++)
    {
        //创建输出流
        AVStream *out = avformat_new_stream(octx, ictx->streams[i]->codecpar);
        if (!out)
        {
            return XError(0);
        }
        //复制配置信息,同于MP4
        // re = avcodec_copy_context(out->codec, ictx->streams[i]->codec);
        re = avcodec_parameters_copy(out->codecpar, ictx->streams[i]->codecpar);
        // out->codec->codec_tag = 0;
        out->codecpar->codec_tag = 0;
    }

    av_dump_format(octx, 0, outUrl, 1);

    // rtmp推流

    //打开io
    re = avio_open(&octx->pb, outUrl, AVIO_FLAG_WRITE);
    if (!octx->pb)
    {
        return XError(re);
    }

    //写入头信息
    re = avformat_write_header(octx, 0);
    // printf("in code id = %d 。 out code id = %d\n", ictx->streams[0]->codecpar->codec_id, octx->streams[0]->codecpar->codec_id); // 86018: AAC
    // printf("in code id = %d 。 out code id = %d\n", ictx->streams[1]->codecpar->codec_id, octx->streams[1]->codecpar->codec_id); // 27: h264

    // av_usleep(1000000000);

    if (re < 0)
    {
        return XError(re);
    }
    return 0;
}

/**
 * 发送压缩后的数据包到服务器
 */
int send_packet_rtmp(AVFormatContext *ictx, AVFormatContext *octx, AVPacket pkt, long long startTime)
{
    // int re = av_read_frame(ictx, &pkt);
    // if (re != 0)
    // {
    //     return XError(re);
    // }

    //计算转换pts dts
    AVRational itime = ictx->streams[pkt.stream_index]->time_base;
    AVRational otime = octx->streams[pkt.stream_index]->time_base;

    printf("itime: %d, %d \n", itime.num, itime.den);
    printf("otime: %d, %d \n", otime.num, otime.den);

    pkt.pts = av_rescale_q(pkt.pts, itime, otime);
    pkt.dts = av_rescale_q(pkt.dts, itime, otime);
    pkt.duration = av_rescale_q(pkt.duration, itime, otime);
    pkt.pos = -1;

    printf("--- ptk.pts %ld \n", pkt.pts);
    // printf("--- ptk.dts %ld \n", pkt.dts);
    // printf("--- ptk.duration %ld \n", pkt.duration);

    printf("--- codec_type %d \n", ictx->streams[pkt.stream_index]->codecpar->codec_type);

    //视频帧推送速度
    if (ictx->streams[pkt.stream_index]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO)
    {
        //已经过去的时间
        long long now = av_gettime() - startTime;
        long long pts = 0;
        pts = pkt.pts * (1000 * 1000 * r2d(otime));
        if (pts > now)
        {
            av_usleep(pts - now);
            // cout << pts - now<<endl;
        }

        // cout << pkt.dts << "-----" << pkt.pts << endl;
    }
    int re = av_interleaved_write_frame(octx, &pkt);
    if (re < 0)
    {
        return XError(re);
    }

    return 0;
}

int encodeContext()
{
    /* find the mpeg1video encoder */

    char *codec_name = "libx264";
    AVCodec *codec = avcodec_find_encoder_by_name(codec_name);
    if (!codec)
    {
        fprintf(stderr, "Codec '%s' not found\n", codec_name);
        exit(1);
    }

    enc_ctx = avcodec_alloc_context3(codec);
    if (!enc_ctx)
    {
        fprintf(stderr, "Could not allocate video codec context\n");
        exit(1);
    }

    /* put sample parameters */
    enc_ctx->bit_rate = 400000;
    /* resolution must be a multiple of two */
    enc_ctx->width = 5558;
    enc_ctx->height = 362;
    /* frames per second */
    enc_ctx->time_base = (AVRational){1, 25};
    enc_ctx->framerate = (AVRational){25, 1};

    /* emit one intra frame every ten frames
     * check frame pict_type before passing frame
     * to encoder, if frame->pict_type is AV_PICTURE_TYPE_I
     * then gop_size is ignored and the output of encoder
     * will always be I frame irrespective to gop_size
     */
    enc_ctx->gop_size = 10;
    enc_ctx->max_b_frames = 1;
    enc_ctx->pix_fmt = AV_PIX_FMT_YUV420P;

    printf("--- codec->id: %d \n", codec->id);

    if (codec->id == AV_CODEC_ID_H264)
        av_opt_set(enc_ctx->priv_data, "preset", "slow", 0);

    /* open it */
    int ret = avcodec_open2(enc_ctx, codec, NULL);

    if (ret < 0)
    {
        return XError(ret);
    }

    return 0;
}

int avfilter(const char *filename, const char *input, const char *outUrl)
{
    int ret;
    AVPacket *packet;
    AVFrame *frame;
    AVFrame *filt_frame;

    frame = av_frame_alloc();
    filt_frame = av_frame_alloc();
    packet = av_packet_alloc();
    if (!frame || !filt_frame || !packet)
    {
        fprintf(stderr, "Could not allocate frame or packet\n");
        exit(1);
    }

    if ((ret = open_input_file(filename)) < 0)
        goto end;
    if ((ret = init_filters(filter_descr)) < 0)
        goto end;

    // encodeContext(); // 创建编码上下文

    create_pipeline(fmt_ctx, outUrl);

    for (int i = 0; i < filter_graph->nb_filters; i++)
    {
        AVFilterContext *filter_ctxn = filter_graph->filters[i];
        printf("filter name: %s \n", filter_ctxn->name);
    }

    /* read all packets */
    long long startTime = av_gettime();

    while (1)
    {
        if ((ret = av_read_frame(fmt_ctx, packet)) < 0)
            break;

        printf("--- av_read_frame => packet->pts: %ld \n", packet->pts);

        if (packet->stream_index == video_stream_index)
        {
            ret = avcodec_send_packet(dec_ctx, packet); // 原始数据输入到解码器
            if (ret < 0)
            {
                av_log(NULL, AV_LOG_ERROR, "Error while sending a packet to the decoder\n");
                break;
            }

            while (ret >= 0)
            {
                ret = avcodec_receive_frame(dec_ctx, frame); // 解码后的一帧数据
                if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF)
                {
                    break;
                }
                else if (ret < 0)
                {
                    av_log(NULL, AV_LOG_ERROR, "Error while receiving a frame from the decoder\n");
                    goto end;
                }

                frame->pts = frame->best_effort_timestamp;

                printf("--- avcodec_receive_frame => frame->pts: %ld \n", frame->pts);

                if ((access("/opt/application/tx-rtcStream/server/clan/input.txt", F_OK)) != -1)
                {
                    char buff[1024] = {0};
                    FILE *f = fopen(input, "r+");
                    // scale=100:-1,drawtext=fontfile=/usr/share/fonts/chinese/SIMKAI.TTF:text=100:x=(w-tw)/2:y=h-10:fontcolor=green:fontsize=30
                    fgets(buff, 1024, f); //正确读取全文格式:while( fgets(buff,1024,f) ) ....;
                    fclose(f);
                    init_filters(buff);
                }

                // AVFilterContext *filter_ctx1 = filter_graph->filters[3];
                // av_opt_set(filter_ctx1->priv, "x", buff, 0);

                /* push the decoded frame into the filtergraph */
                if (av_buffersrc_add_frame_flags(buffersrc_ctx, frame, AV_BUFFERSRC_FLAG_KEEP_REF) < 0) // 解码后的帧输入到 filter graph
                {
                    av_log(NULL, AV_LOG_ERROR, "Error while feeding the filtergraph\n");
                    break;
                }

                /* pull filtered frames from the filtergraph */

                while (1)
                {
                    ret = av_buffersink_get_frame(buffersink_ctx, filt_frame); // 获得滤波后的一帧数据

                    if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF)
                        break;
                    if (ret < 0)
                        goto end;

                    printf("--- av_buffersink_get_frame => filt_frame->pts: %ld \n", filt_frame->pts); // pts no problem

                    avcodec_send_frame(dec_ctx, filt_frame); // 编码数据帧

                    printf("--- avcodec_send_frame => filt_frame->pts: %ld \n", filt_frame->pts); // pts no problem

                    // avcodec_receive_packet(enc_ctx, packet); // 打包编码后的数据帧

                    printf("--- avcodec_receive_packet => packet->pts: %ld \n", packet->pts); // 错误： 0

                    // display_frame(filt_frame, buffersink_ctx->inputs[0]->time_base); // 显示滤波后的数据

                    send_packet_rtmp(fmt_ctx, octx, *packet, startTime);

                    av_frame_unref(filt_frame);
                }
                av_frame_unref(frame);
            }
        }
        av_packet_unref(packet);
    }
end:
    avfilter_graph_free(&filter_graph);
    avcodec_free_context(&dec_ctx);
    avformat_close_input(&fmt_ctx);
    av_frame_free(&frame);
    av_frame_free(&filt_frame);
    av_packet_free(&packet);

    if (ret < 0 && ret != AVERROR_EOF)
    {
        fprintf(stderr, "Error occurred: %s\n", av_err2str(ret));
        exit(1);
    }

    exit(0);
}

int pushStream(const char *inUrl, const char *outUrl)
{

    //初始化所有封装和解封装 flv mp4 mov mp3
    avdevice_register_all();

    //初始化网络库
    avformat_network_init();

    //
    //输入流 1 打开文件，解封装
    //输入封装上下文
    AVFormatContext *ictx = NULL;

    //打开文件，解封文件头
    int re = avformat_open_input(&ictx, inUrl, 0, 0);
    if (re != 0)
    {
        return XError(re);
    }
    // cout << "open file " << inUrl << " Success." << endl;

    //获取音频视频流信息 ,h264 flv
    re = avformat_find_stream_info(ictx, 0);
    if (re != 0)
    {
        return XError(re);
    }
    av_dump_format(ictx, 0, inUrl, 0);

    //
    //输出流

    //创建输出流上下文
    AVFormatContext *octx = NULL;
    re = avformat_alloc_output_context2(&octx, 0, "flv", outUrl);
    if (!octx)
    {
        return XError(re);
    }
    // cout << "octx create success!" << endl;

    //配置输出流
    //遍历输入的AVStream
    for (int i = 0; i < ictx->nb_streams; i++)
    {
        printf("--- stream %d \n", i);
        //创建输出流
        AVStream *out = avformat_new_stream(octx, ictx->streams[i]->codecpar);
        if (!out)
        {
            return XError(0);
        }
        //复制配置信息,同于MP4
        // re = avcodec_copy_context(out->codec, ictx->streams[i]->codec);
        re = avcodec_parameters_copy(out->codecpar, ictx->streams[i]->codecpar);
        // out->codec->codec_tag = 0;
        out->codecpar->codec_tag = 0;
    }
    av_dump_format(octx, 0, outUrl, 1);

    // rtmp推流

    //打开io
    re = avio_open(&octx->pb, outUrl, AVIO_FLAG_WRITE);
    if (!octx->pb)
    {
        return XError(re);
    }

    //写入头信息
    re = avformat_write_header(octx, 0);
    printf("in code id = %d 。 out code id = %d\n", ictx->streams[0]->codecpar->codec_id, octx->streams[0]->codecpar->codec_id);
    printf("in code id = %d 。 out code id = %d\n", ictx->streams[1]->codecpar->codec_id, octx->streams[1]->codecpar->codec_id);

    av_usleep(5000000);

    if (re < 0)
    {
        return XError(re);
    }
    // cout << "avformat_write_header " << re << endl;
    AVPacket pkt;
    long long startTime = av_gettime();
    for (;;)
    {
        re = av_read_frame(ictx, &pkt);
        if (re != 0)
        {
            break;
        }

        //计算转换pts dts
        AVRational itime = ictx->streams[pkt.stream_index]->time_base;
        AVRational otime = octx->streams[pkt.stream_index]->time_base;

        pkt.pts = av_rescale_q(pkt.pts, itime, otime);
        pkt.dts = av_rescale_q(pkt.dts, itime, otime);
        pkt.duration = av_rescale_q(pkt.duration, itime, otime);
        pkt.pos = -1;

        printf("--- ptk.pts %ld \n", pkt.pts);
        printf("--- ptk.dts %ld \n", pkt.dts);
        printf("--- ptk.duration %ld \n", pkt.duration);

        printf("itime: %d, %d \n", itime.num, itime.den);
        printf("otime: %d, %d \n", otime.num, otime.den);

        printf("--- codec_type %d \n", ictx->streams[pkt.stream_index]->codecpar->codec_type);

        //视频帧推送速度
        if (ictx->streams[pkt.stream_index]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO)
        {
            //已经过去的时间
            long long now = av_gettime() - startTime;
            printf("--- now: %lld", now);

            long long pts = 0;
            pts = pkt.pts * (1000 * 1000 * r2d(otime));
            printf("--- ptk.pts: %ld", pkt.pts);

            if (pts > now)
            {
                printf("--- push av_sleep %lld \n", pts - now);

                av_usleep(pts - now);
                // cout << pts - now<<endl;
            }

            // cout << pkt.dts << "-----" << pkt.pts << endl;
        }
        re = av_interleaved_write_frame(octx, &pkt);
        if (re < 0)
        {
            return XError(re);
        }
    }

    // cout << "file to rtmp test" << endl;
    // getchar();
    return 0;
}

static void display_frame(const AVFrame *frame, AVRational time_base)
{
    int x, y;
    uint8_t *p0, *p;
    int64_t delay;

    if (frame->pts != AV_NOPTS_VALUE)
    {
        if (last_pts != AV_NOPTS_VALUE)
        {
            /* sleep roughly the right amount of time;
             * usleep is in microseconds, just like AV_TIME_BASE. */
            delay = av_rescale_q(frame->pts - last_pts,
                                 time_base, AV_TIME_BASE_Q);
            if (delay > 0 && delay < 1000000)
                usleep(delay);
        }
        last_pts = frame->pts;
    }

    /* Trivial ASCII grayscale display. */
    p0 = frame->data[0];
    puts("\033c");
    for (y = 0; y < frame->height; y++)
    {
        p = p0;
        for (x = 0; x < frame->width; x++)
            putchar(" .-+#"[*(p++) / 52]);
        putchar('\n');
        p0 += frame->linesize[0];
    }
    fflush(stdout);
}

int main(int argc, char **argv)
{
    int ret;
    AVPacket *packet;
    AVFrame *frame;
    AVFrame *filt_frame;

    if (argc != 2)
    {
        fprintf(stderr, "Usage: %s file\n", argv[0]);
        exit(1);
    }

    frame = av_frame_alloc();
    filt_frame = av_frame_alloc();
    packet = av_packet_alloc();
    if (!frame || !filt_frame || !packet)
    {
        fprintf(stderr, "Could not allocate frame or packet\n");
        exit(1);
    }

    if ((ret = open_input_file(argv[1])) < 0)
        goto end;
    if ((ret = init_filters(filter_descr)) < 0)
        goto end;

    /* read all packets */
    while (1)
    {
        if ((ret = av_read_frame(fmt_ctx, packet)) < 0)
            break;

        if (packet->stream_index == video_stream_index)
        {
            ret = avcodec_send_packet(dec_ctx, packet);
            if (ret < 0)
            {
                av_log(NULL, AV_LOG_ERROR, "Error while sending a packet to the decoder\n");
                break;
            }

            while (ret >= 0)
            {
                ret = avcodec_receive_frame(dec_ctx, frame);
                if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF)
                {
                    break;
                }
                else if (ret < 0)
                {
                    av_log(NULL, AV_LOG_ERROR, "Error while receiving a frame from the decoder\n");
                    goto end;
                }

                frame->pts = frame->best_effort_timestamp;

                /* push the decoded frame into the filtergraph */
                if (av_buffersrc_add_frame_flags(buffersrc_ctx, frame, AV_BUFFERSRC_FLAG_KEEP_REF) < 0)
                {
                    av_log(NULL, AV_LOG_ERROR, "Error while feeding the filtergraph\n");
                    break;
                }

                /* pull filtered frames from the filtergraph */
                while (1)
                {
                    ret = av_buffersink_get_frame(buffersink_ctx, filt_frame);
                    if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF)
                        break;
                    if (ret < 0)
                        goto end;
                    display_frame(filt_frame, buffersink_ctx->inputs[0]->time_base);
                    av_frame_unref(filt_frame);
                }
                av_frame_unref(frame);
            }
        }
        av_packet_unref(packet);
    }
end:
    avfilter_graph_free(&filter_graph);
    avcodec_free_context(&dec_ctx);
    avformat_close_input(&fmt_ctx);
    av_frame_free(&frame);
    av_frame_free(&filt_frame);
    av_packet_free(&packet);

    if (ret < 0 && ret != AVERROR_EOF)
    {
        fprintf(stderr, "Error occurred: %s\n", av_err2str(ret));
        exit(1);
    }

    exit(0);
}