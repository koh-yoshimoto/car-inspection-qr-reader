import { useState, useCallback, useEffect } from "react";
import { ReadResult } from "zxing-wasm/reader";

type VehicleDetails = {
  carType: string;
  carNumber: string;
  serialNumber: string;
  primeMoverType: string;
};

const useAnalyzer = () => {
  const [readResults, setReadResults] = useState<(ReadResult | null)[]>(
    new Array(5).fill(null),
  );
  const [isLightVehicle, setIsLightVehicle] = useState<boolean>(false);
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails | null>(
    null,
  );
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

	const addReadResult = useCallback(
  (readResult: ReadResult): void => {
    if (!readResult.isValid) {
      console.log("not valid QR code");
      return;
    }

    setIsLightVehicle((prevIsLightVehicle) => {
      const newIsLightVehicle = isLightVehicleResult(readResult);
      const isTypeChanged = prevIsLightVehicle !== newIsLightVehicle;

      setReadResults((prevResults) => {

        // 軽自動車と普通車の切り替え時には前の結果をリセットするため
        if (isTypeChanged) {
          prevResults = newIsLightVehicle
            ? new Array(2).fill(null)
            : new Array(5).fill(null);
        }

        let index = -1;
        if (newIsLightVehicle) {
          index = detectIndexForLightVehicle(readResult);
        } else {
          index = detectIndexForNormalVehicle(readResult);
        }

        if (index === -1) {
          console.log("Cannot add more ReadResults");
          return prevResults;
        }

        prevResults[index] = readResult;
        return [...prevResults];
      });

      console.log("setIsLightVehicle: ", newIsLightVehicle);
      return newIsLightVehicle;
    });
  },
  []
);


  const isLightVehicleResult = (readResult: ReadResult): boolean => {
    const splited = readResult.text.split("/");

    // 軽自動車の場合は先頭の要素が"K"となる
    return splited[0] === "K";
  };

  //ref: https://www.keikenkyo.or.jp/Portals/0/files/information/computerization/0000058055.pdf
  const detectIndexForLightVehicle = (readResult: ReadResult): number => {
    const splited = readResult.text.split("/");

    // 2番目の要素には半角2桁の数字が入る
    if (splited.length < 2 || splited[1].length !== 2) {
      return -1;
    }

    // 1桁目は何番目のコードかを表す
    const index = splited[1][0];
    if (index === "2") {
      return 0;
    } else if (index === "3") {
      return 1;
    } else {
      return -1;
    }
  };

  const detectIndexForNormalVehicle = (readResult: ReadResult): number => {
    const { sequenceSize, sequenceIndex } = readResult;

    if (sequenceSize === 3 && sequenceIndex === 0) {
      return 0;
    } else if (sequenceSize === 3 && sequenceIndex === 1) {
      return 1;
    } else if (sequenceSize === 3 && sequenceIndex === 2) {
      return 2;
    } else if (sequenceSize === 2 && sequenceIndex === 0) {
      return 3;
    } else if (sequenceSize === 2 && sequenceIndex === 1) {
      return 4;
    } else {
      console.log("not QR code for car inspection");
      return -1;
    }
  };

  useEffect(() => {
    if (
      !isLightVehicle &&
      readResults.filter((res) => res !== null).length === 5
    ) {
      const qr2 = ((readResults[3]?.text as string) +
        readResults[4]?.text) as string;
      const qr3 = ((((readResults[0]?.text as string) +
        readResults[1]?.text) as string) + readResults[2]?.text) as string;

      setVehicleDetails({
        carType: qr3?.split("/")[5] || "",
        carNumber: qr2?.split("/")[1]?.replace(/\s+/g, "") || "",
        serialNumber: qr2?.split("/")[3]?.replace(/\s+/g, "") || "",
        primeMoverType: qr2?.split("/")[4]?.replace(/\s+/g, "") || "",
      });

      setIsCompleted(true);
    } else if (
      isLightVehicle &&
      readResults.filter((res) => res !== null).length === 2
    ) {
      const qr2 = readResults[0]?.text as string;
      const qr3 = readResults[1]?.text as string;

      setVehicleDetails({
        carType: qr3?.split("/")[6] || "",
        carNumber: qr2?.split("/")[2]?.replace(/\s+/g, "") || "",
        serialNumber: qr2?.split("/")[4]?.replace(/\s+/g, "") || "",
        primeMoverType: qr2?.split("/")[5]?.replace(/\s+/g, "") || "",
      });

      setIsCompleted(true);
    }
  }, [readResults, isLightVehicle]);

  const clear = useCallback(() => {
    setReadResults(new Array(5).fill(null));
    setIsLightVehicle(false);
    setVehicleDetails(null);
    setIsCompleted(false);
  }, []);

  return {
    readResults,
    isLightVehicle,
    vehicleDetails,
    isCompleted,
    addReadResult,
    clear,
  };
};

export default useAnalyzer;
