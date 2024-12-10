import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, VideoInputDevice } from "@zxing/library";

const QrReader: React.FC = () => {
	const [qrCodeValue, setQrCodeValue] = useState<string | null>(null);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const readerRef = useRef<BrowserMultiFormatReader | null>(null);
	const [videoInputDevices, setVideoInputDevices] = useState<
		VideoInputDevice[]
	>([]);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

	useEffect(() => {
		const fetchDevices = async () => {
			try {
				const codeReader = new BrowserMultiFormatReader();
				readerRef.current = codeReader;

				const devices = await codeReader.getVideoInputDevices();
				setVideoInputDevices(devices);

				// デフォルトで背面カメラを選択 (ない場合は最初のカメラ)
				const backCamera = devices.find((device) =>
					device.label.toLowerCase().includes("back"),
				);
				setSelectedDeviceId(
					backCamera?.deviceId || devices[0]?.deviceId || null,
				);
			} catch (error) {
				console.error("Error fetching video input devices:", error);
			}
		};

		fetchDevices();
	}, []);

	useEffect(() => {
		const startScanner = async () => {
			if (!selectedDeviceId || !videoRef.current) return;

			try {
				const codeReader = readerRef.current;

				if (codeReader) {
					// 既存のスキャンをリセット
					codeReader.reset();

					// QRコードを連続して読み取る
					codeReader.decodeFromVideoDevice(
						selectedDeviceId,
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
	}, [selectedDeviceId]);

	return (
		<div>
			<h1>QR Code Reader</h1>
			<select
				id="cameraSelect"
				value={selectedDeviceId || ""}
				onChange={(e) => setSelectedDeviceId(e.target.value)}
			>
				{videoInputDevices.map((device) => (
					<option key={device.deviceId} value={device.deviceId}>
						{device.label || `Camera ${device.deviceId}`}
					</option>
				))}
			</select>
			<video
				ref={videoRef}
				style={{ width: "100%", border: "1px solid black" }}
			/>
			<p>Scanned QR Code: {qrCodeValue ?? "No code scanned yet"}</p>
		</div>
	);
};

export default QrReader;
