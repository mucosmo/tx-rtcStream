let asrUtil;

import('../AsrSdk/AsrUtil.js').then(async mod => {
    const AsrSDK = mod.default;
    asrUtil = new AsrSDK();
})

module.exports.open = async () => {
    await asrUtil.open("TX_5G_ASR_TEST_");

}

module.exports.start = async (data) => {
    if (data.length === 640) {
        asrUtil.write(data)
    }
}

module.exports.close = async () => {
    asrUtil.close()
}

