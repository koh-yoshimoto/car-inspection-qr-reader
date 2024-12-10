import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";

const QrReader: React.FC = () => {
	const [qrCodeValue, setQrCodeValue] = useState<string | null>(null);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const readerRef = useRef<BrowserMultiFormatReader | null>(null);

	useEffect(() => {
		const startScanner = async () => {
			try {
				const codeReader = new BrowserMultiFormatReader();
				readerRef.current = codeReader;

				// カメラデバイスを取得
				const videoInputDevices = await codeReader.listVideoInputDevices();

				if (videoInputDevices.length === 0) {
					console.error("No video input devices found.");
					return;
				}

				// 初めのカメラデバイスを選択
				const firstDeviceId = videoInputDevices[0].deviceId;

				if (videoRef.current) {
					// QRコードを連続して読み取る
					codeReader.decodeFromVideoDevice(
						firstDeviceId,
						videoRef.current,
						(result, err) => {
							if (result) {
								setQrCodeValue(result.getText());
								console.log("QR Code scanned:", result.getText());
							}
							if (err && !(err.name === "NotFoundException")) {
								console.error(err);
							}
						},
					);
				}
			} catch (error) {
				console.error("Error starting QR scanner:", error);
			}
		};

		startScanner();

		return () => {
			// クリーンアップ処理
			if (readerRef.current) {
				readerRef.current.reset();
			}
		};
	}, []);

	return (
		<div>
			<h1>QR Code Reader</h1>
			<video
				ref={videoRef}
				style={{ width: "100%", border: "1px solid black" }}
			/>
			<p>Scanned QR Code: {qrCodeValue ?? "No code scanned yet"}</p>
		</div>
	);
};

export default QrReader;
