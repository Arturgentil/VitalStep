import { Buffer } from "buffer";
import { useEffect, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import {
    BleError,
    BleManager,
    Characteristic,
    Device,
    State,
} from "react-native-ble-plx";

// 👉 NECESSÁRIO no React Native
global.Buffer = global.Buffer || Buffer;

export const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
export const CHAR_BATIMENTOS = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
export const CHAR_PASSOS = "beb5483e-36e1-4688-b7f5-ea07361b26a9";
export const CHAR_SPO2 = "beb5483e-36e1-4688-b7f5-ea07361b26aa";
export const CHAR_BATERIA = "beb5483e-36e1-4688-b7f5-ea07361b26ab";
export const CHAR_PRESSAO = "beb5483e-36e1-4688-b7f5-ea07361b26ac";
export const CHAR_ENERGIA = "beb5483e-36e1-4688-b7f5-ea07361b26ad";

const manager = new BleManager();

export function useBluetooth() {
  const [dispositivos, setDispositivos] = useState<Device[]>([]);
  const [dispositivo, setDispositivo] = useState<Device | null>(null);
  const [conectado, setConectado] = useState(false);
  const [escaneando, setEscaneando] = useState(false);

  const [batimentos, setBatimentos] = useState<number | null>(null);
  const [passos, setPassos] = useState<number | null>(null);
  const [spo2, setSpo2] = useState<number | null>(null);
  const [bateria, setBateria] = useState<number | null>(null);
  const [pressao, setPressao] = useState<string | null>(null);
  const [energia, setEnergia] = useState<number | null>(null);

  // 🔥 Permissões melhoradas (Android 12+)
  async function pedirPermissoes() {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      const ok = Object.values(granted).every(
        (p) => p === PermissionsAndroid.RESULTS.GRANTED,
      );

      if (!ok) {
        throw new Error("Permissões Bluetooth negadas");
      }
    }
  }

  // 🔥 Espera BLE estar ligado
  async function esperarBluetoothLigado() {
    const state = await manager.state();
    if (state === State.PoweredOn) return;

    return new Promise<void>((resolve) => {
      const sub = manager.onStateChange((s) => {
        if (s === State.PoweredOn) {
          sub.remove();
          resolve();
        }
      }, true);
    });
  }

  async function escanear() {
    try {
      await pedirPermissoes();
      await esperarBluetoothLigado();

      setDispositivos([]);
      setEscaneando(true);

      manager.startDeviceScan(
        null,
        { allowDuplicates: false },
        (erro: BleError | null, device: Device | null) => {
          if (erro) {
            console.error("Erro scan:", erro);
            setEscaneando(false);
            return;
          }

          if (device?.name || device?.localName) {
            setDispositivos((prev) =>
              prev.find((d) => d.id === device.id) ? prev : [...prev, device],
            );
          }
        },
      );

      setTimeout(() => {
        manager.stopDeviceScan();
        setEscaneando(false);
      }, 10000);
    } catch (e) {
      console.error(e);
    }
  }

  async function conectar(device: Device) {
    try {
      manager.stopDeviceScan();

      const disp = await device.connect();
      await disp.discoverAllServicesAndCharacteristics();

      setDispositivo(disp);
      setConectado(true);

      assinarDados(disp);
    } catch (e) {
      console.error("Erro conectar:", e);
    }
  }

  function decodeValor(char: Characteristic) {
    if (!char.value) return null;
    const buffer = Buffer.from(char.value, "base64");
    return buffer.readUInt8(0);
  }

  function assinarDados(device: Device) {
    function assinar(charUUID: string, callback: (v: number) => void) {
      device.monitorCharacteristicForService(
        SERVICE_UUID,
        charUUID,
        (erro, char) => {
          if (erro) {
            console.error("Erro monitor:", erro);
            return;
          }
          const valor = decodeValor(char!);
          if (valor !== null) callback(valor);
        },
      );
    }

    assinar(CHAR_BATIMENTOS, setBatimentos);
    assinar(CHAR_PASSOS, setPassos);
    assinar(CHAR_SPO2, setSpo2);
    assinar(CHAR_BATERIA, setBateria);
    assinar(CHAR_ENERGIA, setEnergia);

    // pressão (string)
    device.monitorCharacteristicForService(
      SERVICE_UUID,
      CHAR_PRESSAO,
      (erro, char) => {
        if (erro || !char?.value) return;
        const valor = Buffer.from(char.value, "base64").toString("utf-8");
        setPressao(valor);
      },
    );
  }

  async function desconectar() {
    if (dispositivo) {
      await dispositivo.cancelConnection();
      setDispositivo(null);
      setConectado(false);
    }
  }

  useEffect(() => {
    return () => {
      manager.destroy();
    };
  }, []);

  return {
    escanear,
    conectar,
    desconectar,
    escaneando,
    conectado,
    dispositivos,
    dados: { batimentos, passos, spo2, bateria, pressao, energia },
  };
}
