import React, { useEffect, useRef, useState } from "react";
import { readBarcodesFromImageData } from "zxing-wasm/reader";
import detectQrCodeIndex from "./../lib/analyzer";

const QrReader: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [results, setResults] = useState<string[]>(["", "", "", "", ""]);
  const [carType, setCarType] = useState<string>("");

  //NOTE: Config
  const width = 1000;
  const height = 1000;
  const frameSkipInterval = 3;

  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;
    let frameSkipCounter = 0;

    const startScanner = async () => {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      console.log("Active stream:", stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        //play video if video does not starts
        videoRef.current?.play();
      }

      const offscreenCanvas = new OffscreenCanvas(width, height);
      const context = offscreenCanvas.getContext("2d");
      if (!context) return;

      const scanFrame = async () => {
        if (!videoRef.current) {
          console.log("videoRef is not ready");
          return;
        }

        frameSkipCounter++;
        if (frameSkipCounter % frameSkipInterval !== 0) {
          animationFrameId = requestAnimationFrame(scanFrame);
          return;
        }

        context.drawImage(videoRef.current, 0, 0, width, height);

        const imageData = context.getImageData(0, 0, width, height);

        try {
          const readResults = await readBarcodesFromImageData(imageData, {
            formats: ["QRCode"],
          });
          if (!readResults) {
            console.log("No result");
          }

          readResults.forEach((e) => {
            if (e.text) {
              const index = detectQrCodeIndex(e);
              if (index != -1) {
                setResults((prev) => {
                  const newResults = [...prev];
                  newResults[index] = e.text;
                  return newResults;
                });
              }
            }
          });
        } catch (e) {
          console.error("Error occurred while reading qrcode", e);
        }

        animationFrameId = requestAnimationFrame(scanFrame);
      };

      scanFrame();
    };

    startScanner();

    return () => {
      // クリーンアップ

      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    if (results[0] && results[1] && results[2] && results[3] && results[4]) {
      videoRef.current?.pause();
      setIsCompleted(true);

      // const qr2 = results[3] + results[4];
      const qr3 = results[0] + results[1] + results[2];
      setCarType(qr3.split("/")[5]);
    }
  }, [results]);

  return (
    <>
      <video ref={videoRef} style={{ width: "100%", height: "50%" }} />

      <div style={!isCompleted ? {} : { color: "green" }}>
        {!isCompleted
          ? "📹 QRコードをスキャンしてください"
          : "✅ QRコードのスキャンが完了しました"}
      </div>

      <div className="square-container">
        {results.map((result, index) => (
          <div
            key={index}
            className="square"
            style={result === "" ? {} : { backgroundColor: "#4caf50" }}
          ></div>
        ))}
      </div>
      <div className="info-container">
        <h3>車両情報</h3>
        <div> 型式:{carType} </div>
      </div>
    </>
  );
};

export default QrReader;
