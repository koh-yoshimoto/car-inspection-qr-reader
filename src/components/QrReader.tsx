import React, { useEffect, useRef, useState } from "react";
import { readBarcodesFromImageData, ReadResult } from "zxing-wasm/reader";
import useAnalyzer from "./../lib/hooks/useAnalyzer";

const QrReader: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [setting, setSetting] = useState<string>("");
  const [capabilities, setCapabilities] = useState<string>("");
  const [showSetting, setShowSetting] = useState<boolean>(false);
  const [showCapabilities, setShowCapabilities] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);

  const {
    addReadResult,
    readResults,
    vehicleDetails,
    isLightVehicle,
    isCompleted,
  } = useAnalyzer();

  //NOTE: Config
  const width = 1500;
  const height = 1500;
  const frameSkipInterval = 3;

  useEffect(() => {
    if (isCompleted) return;
    let animationFrameId: number;
    let stream: MediaStream | null = null;
    let frameSkipCounter = 0;

    const startScanner = async () => {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1500, height: 1500, facingMode: "environment" },
        audio: false,
      });

      console.log("Active stream:", stream);

      console.log(
        "supported constraints",
        navigator.mediaDevices.getSupportedConstraints(),
      );

      const videoTracks = stream.getVideoTracks();
      console.log("videoTracks", videoTracks);
      console.log("capabilities", videoTracks[0].getCapabilities());
      console.log("settings", videoTracks[0].getSettings());
      setSetting(JSON.stringify(videoTracks[0].getSettings()));
      setCapabilities(JSON.stringify(videoTracks[0].getCapabilities()));

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
              addReadResult(e);
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
  }, [isCompleted]);

  const formatJson = (json: string): string => {
    return JSON.stringify(JSON.parse(json), null, 2);
  };

  useEffect(() => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream?.getVideoTracks()[0];
      if (track && track.applyConstraints) {
        try {
          track.applyConstraints({
            advanced: [
              {
                zoom: zoom,
              },
            ],
          } as unknown as MediaTrackConstraints);
        } catch (e) {
          alert("ズーム機能に対応していません。");
          console.log(e);
        }
      }
    }
  }, [zoom]);

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
      <button onClick={() => setZoom((prev) => prev + 0.5)}> + </button>
      <button onClick={() => setZoom((prev) => prev - 0.5)}> - </button>

      <div style={!isCompleted ? {} : { color: "green" }}>
        {!isCompleted
          ? "📹 QRコードをスキャンしてください"
          : "✅ QRコードのスキャンが完了しました"}
      </div>

      {isLightVehicle ? (
        <div className="square-container">
          <div className="square-partial-container">
            {readResults.map((result, index) => (
              <div
                key={index}
                className="square"
                style={result === null ? {} : { backgroundColor: "#4caf50" }}
              ></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="square-container">
          <div className="square-partial-container">
            {readResults.slice(0, 3).map((result, index) => (
              <div
                key={index}
                className="square"
                style={result === null ? {} : { backgroundColor: "#4caf50" }}
              ></div>
            ))}
          </div>
          <div className="square-partial-container">
            {readResults.slice(3, 5).map((result, index) => (
              <div
                key={index}
                className="square"
                style={result === null ? {} : { backgroundColor: "#4caf50" }}
              ></div>
            ))}
          </div>
        </div>
      )}
      <div className="info-grid">
        <label>型式</label>
        <div>{vehicleDetails?.carType}</div>

        <label>ナンバー</label>
        <div>{vehicleDetails?.carNumber}</div>

        <label>車体番号</label>
        <div>{vehicleDetails?.serialNumber}</div>

        <label>原動機の型式</label>
        <div>{vehicleDetails?.primeMoverType}</div>
      </div>

      <div style={{ marginTop: "100px" }}>
        <div>ズーム倍率: {zoom}</div>
        <div onClick={() => setShowSetting(!showSetting)}>
          Confirm Camera Settings
        </div>
        {showSetting && (
          <textarea
            style={{ width: "80%", height: "300px" }}
            value={formatJson(setting)}
            readOnly
          />
        )}

        <div onClick={() => setShowCapabilities(!showCapabilities)}>
          Confirm Camera Capabilities
        </div>
        {showCapabilities && (
          <textarea
            style={{ width: "80%", height: "300px" }}
            value={formatJson(capabilities)}
            readOnly
          />
        )}
      </div>
    </>
  );
};

export default QrReader;
