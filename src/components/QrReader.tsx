import React, { useEffect, useRef, useState } from "react";
import {
	BrowserQRCodeReader,
	VideoInputDevice,
	NotFoundException,
	ChecksumException,
	FormatException,
} from "@zxing/library";

const QrReader: React.FC = () => {
	const [qrCodeValue, setQrCodeValue] = useState<string>("");
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const [scanning, setScanning] = useState(false);
	const [videoInputDevices, setVideoInputDevices] = useState<
		VideoInputDevice[]
	>([]);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(
		undefined,
	);

	const codeReader = new BrowserQRCodeReader();

	useEffect(() => {
		codeReader
			.getVideoInputDevices()
			.then((devices) => {
				setupDevices(devices);
				devices.forEach((device) => {
					console.log(
						"videoInputDevices",
						device.label,
						device.deviceId,
						device.kind,
						device.groupId,
					);
				});
				startScan();
			})
			.catch((error) => {
				console.error("Error fetching video input devices:", error);
			});
	}, []);

	const setupDevices = (videoInputDevices: VideoInputDevice[]): void => {
		// selects first device
		setSelectedDeviceId(undefined);

		// setup devices dropdown
		if (videoInputDevices.length >= 1) {
			setVideoInputDevices(videoInputDevices);
		}
	};

	const startScan = () => {
		if (!videoRef.current) return;

		setScanning(true);
		console.log(selectedDeviceId);
		codeReader.decodeFromInputVideoDeviceContinuously(
			selectedDeviceId as any,
			"video",
			(result, err) => {
				if (result) {
					console.log("QR Code Found:", result.getText());
					setQrCodeValue(result.getText());
				}
				if (err) {
					// As long as this error belongs into one of the following categories
					// the code reader is going to continue as excepted. Any other error
					// will stop the decoding loop.
					//
					// Excepted Exceptions:
					//
					//  - NotFoundException
					//  - ChecksumException
					//  - FormatException
					if (err instanceof NotFoundException) {
						console.log("No QR code found.");
					}
					if (err instanceof ChecksumException) {
						console.log("A code was found, but it's read value was not valid.");
					}
					if (err instanceof FormatException) {
						console.log("A code was found, but it was in a invalid format.");
					}
				}
			},
		);
	};

	const stopScan = () => {
		codeReader.reset();
		setScanning(false);
		if (qrCodeValue) {
			setQrCodeValue("");
		}
	};

	return (
		<div>
			<h1>QR Code Reader</h1>

			<div id="sourceSelectPanel">
				<label htmlFor="sourceSelect">Change video source:</label>
				<select
					id="sourceSelect"
					onChange={(e) => setSelectedDeviceId(e.target.value)}
				>
					{videoInputDevices.map((element) => (
						<option value={element.deviceId}>
							{element.label}:{element.groupId}:{element.kind}:
							{element.deviceId}
						</option>
					))}
				</select>
			</div>

			<div style={{ margin: "20px 0" }}>
				<button onClick={startScan} disabled={scanning}>
					Start
				</button>
				<button onClick={stopScan} disabled={!scanning}>
					Stop
				</button>
			</div>
			<video ref={videoRef} id="video" width="300" height="200"></video>
			<p>Scanned QR Code: {qrCodeValue ?? "No code scanned yet"}</p>
		</div>
	);
};

export default QrReader;
