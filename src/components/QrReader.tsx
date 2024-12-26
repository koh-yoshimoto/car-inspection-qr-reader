import React, { useEffect, useRef, useState } from "react";
import { readBarcodesFromImageData, ReadResult } from "zxing-wasm/reader";
import detectQrCodeIndex from "./../lib/analyzer";

const QrReader: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [results, setResults] = useState<string[]>(["", "", "", "", ""]);
  const [carType, setCarType] = useState<string>("");
  const [carNumber, setCarNumber] = useState<string>("");
  const [serialNumber, setSerialNumber] = useState<string>("");
  const [primeMoverType, setPrimeMoverType] = useState<string>("");

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
        video: { width: 1000, height: 1000, facingMode: "environment" },
        audio: false,
      });

      console.log("Active stream:", stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // カメラが準備完了するのを待つ
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            resolve();
          };
        });

        // 準備ができたら再生
        await videoRef.current.play();
      }

      const offscreenCanvas = new OffscreenCanvas(width, height);
      const context = offscreenCanvas.getContext("2d");
      if (!context) return;

      const guideCanvas = document.getElementById(
        "canvas",
      ) as HTMLCanvasElement;

      // assign canvasRef
      guideCanvasRef.current = guideCanvas;

      guideCanvasRef.current.width = videoRef.current?.videoWidth ?? 0;
      guideCanvasRef.current.height = videoRef.current?.videoHeight ?? 0;

      const drawGuide = (result: ReadResult) => {
        if (!guideCanvasRef.current) return;

        const context = guideCanvasRef.current.getContext("2d");
        if (!context) return;

        setTimeout(() => {
          context.clearRect(
            0,
            0,
            guideCanvasRef.current?.width ?? 0,
            guideCanvasRef.current?.height ?? 0,
          );
        }, 50);

        const pos = result.position; // QRコードの頂点情報を取得

        context.beginPath();
        context.moveTo(pos.bottomLeft.x, pos.bottomLeft.y);
        context.lineTo(pos.topLeft.x, pos.topLeft.y);
        context.lineTo(pos.topRight.x, pos.topRight.y);
        context.lineTo(pos.bottomRight.x, pos.bottomRight.y);
        context.lineTo(pos.bottomLeft.x, pos.bottomLeft.y);

        context.closePath();
        context.lineWidth = 10;
        context.strokeStyle = "red";
        context.stroke();
      };

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
          const readResults = (await readBarcodesFromImageData(imageData, {
            formats: ["QRCode"],
          })) as ReadResult[];
          if (!readResults) {
            console.log("No result");
          }

          readResults.forEach((e: ReadResult) => {
            drawGuide(e);
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
      if (videoRef.current) {
        // clear canvas
        if (!guideCanvasRef.current) return;
        const context = guideCanvasRef.current.getContext("2d");
        if (context) {
          context.clearRect(
            0,
            0,
            guideCanvasRef.current?.width ?? 0,
            guideCanvasRef.current?.height ?? 0,
          );
        }

        //close camera
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

      const qr2 = results[3] + results[4];
      const qr3 = results[0] + results[1] + results[2];
      setCarType(qr3.split("/")[5]);
      setCarNumber(qr2.split("/")[1].replace(/\s+/g, ""));
      setSerialNumber(qr2.split("/")[3].replace(/\s+/g, ""));
      setPrimeMoverType(qr2.split("/")[4].replace(/\s+/g, ""));
      console.log("qr2", qr2);
      console.log("qr3", qr3);

      // clear canvas
      if (!guideCanvasRef.current) return;
      const context = guideCanvasRef.current.getContext("2d");
      if (context) {
        context.clearRect(
          0,
          0,
          guideCanvasRef.current?.width ?? 0,
          guideCanvasRef.current?.height ?? 0,
        );
      }
    }
  }, [results]);

  return (
    <>
      <div className="camera-container">
        <video
          ref={videoRef}
          style={{ width: "100%", height: "100%" }}
          muted
          autoPlay
          playsInline
        />
        <canvas id="canvas" className="overlay-canvas"></canvas>
      </div>

      <div style={!isCompleted ? {} : { color: "green" }}>
        {!isCompleted
          ? "📹 QRコードをスキャンしてください"
          : "✅ QRコードのスキャンが完了しました"}
      </div>

      <div className="square-container">
        <div className="square-partial-container">
          {results.slice(0, 3).map((result, index) => (
            <div
              key={index}
              className="square"
              style={result === "" ? {} : { backgroundColor: "#4caf50" }}
            ></div>
          ))}
        </div>
        <div className="square-partial-container">
          {results.slice(3, 5).map((result, index) => (
            <div
              key={index}
              className="square"
              style={result === "" ? {} : { backgroundColor: "#4caf50" }}
            ></div>
          ))}
        </div>
      </div>
      <div className="info-grid">
        <label>型式</label>
        <div>{carType}</div>

        <label>ナンバー</label>
        <div>{carNumber}</div>

        <label>車体番号</label>
        <div>{serialNumber}</div>

        <label>原動機の型式</label>
        <div>{primeMoverType}</div>
      </div>
    </>
  );
};

export default QrReader;
