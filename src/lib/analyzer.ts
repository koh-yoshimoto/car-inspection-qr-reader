import { ReadResult } from "zxing-wasm/reader";

const is4thQr = (text: string) => {
  return text.split("/").length == 2 && text.split("/")[0] == "2";
};

const is5thQr = (text: string) => {
  //全角チェックの正規表現
  const zenkakuNum = /^[\uFF10-\uFF19]$/;
  return text.split("/").length == 5 && zenkakuNum.test(text.split("/")[0]);
};

const detectQrCodeIndex = (readResult: ReadResult) => {
  if (!readResult.isValid) {
    console.log("not valid QR code");
    return -1;
  }
  if (readResult.sequenceSize == 3 && readResult.sequenceIndex == 0) {
    return 0;
  } else if (readResult.sequenceSize == 3 && readResult.sequenceIndex == 1) {
    return 1;
  } else if (readResult.sequenceSize == 3 && readResult.sequenceIndex == 2) {
    return 2;
  } else if (
    readResult.sequenceSize == 2 &&
    readResult.sequenceIndex == 0 &&
    is4thQr(readResult.text)
  ) {
    return 3;
  } else if (
    readResult.sequenceSize == 2 &&
    readResult.sequenceIndex == 1 &&
    is5thQr(readResult.text)
  ) {
    return 4;
  } else {
    console.log("not QR code for car inspection");
    return -1;
  }
};

export default detectQrCodeIndex;
