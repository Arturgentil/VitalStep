import { Button, FlatList, Text, TouchableOpacity, View } from "react-native";
import { useBluetooth } from "../hooks/useBluetooth";

export default function Home() {
  const {
    escanear,
    conectar,
    desconectar,
    escaneando,
    conectado,
    dispositivos,
    dados,
  } = useBluetooth();

  return (
    <View>
      <Text>VitalStep</Text>

      {/* Botões de conexão */}
      {!conectado ? (
        <Button
          title={escaneando ? "Escaneando..." : "Buscar relógio"}
          onPress={escanear}
          disabled={escaneando}
        />
      ) : (
        <Button title="Desconectar" onPress={desconectar} />
      )}

      {/* Lista de dispositivos encontrados */}
      {!conectado && dispositivos.length > 0 && (
        <View>
          <Text>Dispositivos encontrados:</Text>
          <FlatList
            data={dispositivos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => conectar(item)}>
                <Text>
                  {item.name ?? "Sem nome"} — {item.id}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Dados do relógio */}
      {conectado && (
        <View>
          <Text>✅ Conectado</Text>
          <Text>❤️ Batimentos: {dados.batimentos ?? "---"} bpm</Text>
          <Text>👟 Passos: {dados.passos ?? "---"}</Text>
          <Text>🩸 SpO2: {dados.spo2 ?? "---"} %</Text>
          <Text>🔋 Bateria: {dados.bateria ?? "---"} %</Text>
          <Text>💢 Pressão: {dados.pressao ?? "---"}</Text>
          <Text>⚡ Energia: {dados.energia ?? "---"} kcal</Text>
        </View>
      )}
    </View>
  );
}
