import { Environment, extension, buttonBlock } from "$common";
import { legacyFullSupport, } from "./legacy";

const { legacyBlock, legacyExtension } = legacyFullSupport.for<Gameball>();

const gameballUuid = {
  accelerometerService: "c75ea010-ede4-4ab4-8f96-17699ebaf1b8",
  accelerometer2Service: "d75ea010-ede4-4ab4-8f96-17699ebaf1b8",
  gameballService: "00766963-6172-6173-6f6c-7574696f6e73",
  sensorStreamService: "a54d785d-d674-4cda-b794-ca049d4e044b",
  capacitorService: "f4ad0000-d674-4cda-b794-ca049d4e044b",
  a1Config: "1006bd26-daad-11e5-b5d2-0a1d41d68578",
  a1Thresh: "1006bd28-daad-11e5-b5d2-0a1d41d68578",
  a2Config: "8f20fa52-dab9-11e5-b5d2-0a1d41d68578",
  a2Thresh: "8f20fa54-dab9-11e5-b5d2-0a1d41d68578",
  devRef: "0d42d5d8-6727-4547-9a82-2fa4d4f331bd",
  sstream: "a54d785d-d675-4cda-b794-ca049d4e044b",
  ssdata: "a54d785d-d676-4cda-b794-ca049d4e044b",
  capV: "f4ad0001-d675-4cda-b794-ca049d4e044b",
};

const dynamicGameballMenu = (self: Gameball) => ({
  argumentMethods: {
    0: {
      getItems: () => {
        try {
          const items = self.connectedGameballs;
          return Array.isArray(items) ? [...items] : ["---"];
        } catch (e) {
          console.error("Error building Gameball menu", e);
          return ["---"];
        }
      }
    }
  }
});

@legacyExtension()
export default class Gameball extends extension({
  name: "Play Impossible Gameball",
  tags: ["Made by PRG"]
}) {
  // --- Class Properties ---
  thresholdVals = { "low": 155, "medium": 138, "high": 133 };
  gameballs: { [key: string]: { server: BluetoothRemoteGATTServer, "1": any, "2": any } } = {};
  connectedGameballs = ["---"];
  isConnectedState = false;

  init(env: Environment) {
    // Environment is setup, runtime is available
  }

  // --- Block Implementations ---

  @buttonBlock("Connect Gameball")
  async connectButton() {
    await this.connectToBLE();
  }

  @legacyBlock.readAccel()
  readAccel(ACC_NUMBER: string, ACC_AXES: string): number {
    // This block is for a single, globally tracked ball if desired.
    // We'll have it mirror the first connected ball for simplicity.
    console.log(arguments);
    const firstBallName = this.connectedGameballs[0];
    if (firstBallName && this.gameballs[firstBallName]) {
      console.log(firstBallName, this.gameballs);
      const ballData = this.gameballs[firstBallName][ACC_NUMBER];
      console.log(ballData, ACC_NUMBER, ACC_AXES);
      return ballData ? (ballData[ACC_AXES] || -1) : -1;
    }
    return -1;
  }

  @legacyBlock.readMultiAccel(dynamicGameballMenu)
  readMultiAccel(GAMEBALL: string, NUMBER: string, AXIS: string): number {
    if (GAMEBALL !== "---" && this.gameballs[GAMEBALL]) {
      const ballData = this.gameballs[GAMEBALL][NUMBER];
      return ballData ? (ballData[AXIS] || -1) : -1;
    }
    return -1;
  }

  @legacyBlock.setThreshold(dynamicGameballMenu)
  async setThreshold(GAMEBALL: string, OPTION: string) {
    if (GAMEBALL !== "---" && this.gameballs[GAMEBALL]) {
      const server = this.gameballs[GAMEBALL].server;
      const thresholdValue = this.thresholdVals[OPTION];
      await this.startAccel("accel1", Uint8Array.of(0x197), Uint16Array.of(thresholdValue), server);
    }
  }

  // --- BLE & Helper Methods ---

  async connectToBLE() {
    if (!navigator.bluetooth) {
      alert("Web Bluetooth is not available in this browser. Please use a supported browser like Chrome.");
      return;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "Gameball" }],
        optionalServices: Object.values(gameballUuid),
      });

      device.addEventListener('gattserverdisconnected', () => this.onDeviceDisconnected(device.name));

      await this.startListening(device);
      this.isConnectedState = true;
    } catch (error) {
      console.error("Error connecting to Gameball:", error);
      this.isConnectedState = false;
    }
  }

  onDeviceDisconnected(deviceName: string) {
    console.log(`Lost connection to ${deviceName}`);
    delete this.gameballs[deviceName];
    this.connectedGameballs = this.connectedGameballs.filter(name => name !== deviceName);
    if (this.connectedGameballs.length === 0) {
      this.connectedGameballs = ["---"];
      this.isConnectedState = false;
    }
    this.runtime.requestToolboxExtensionsUpdate();
  }

  async startListening(device: BluetoothDevice) {
    const server = await device.gatt.connect();
    const devName = device.name;

    console.log(`Connected to ${devName}`);

    // Start accelerometer services
    await this.startAccel("accel1", Uint8Array.of(0x197), Uint16Array.of(this.thresholdVals["medium"]), server);
    await this.startAccel("accel2", Uint8Array.of(0x647), Uint16Array.of(this.thresholdVals["medium"]), server);

    console.log(`Started accelerometers on ${devName}`);

    // Configure and start data stream
    const sService = await server.getPrimaryService(gameballUuid.sensorStreamService);
    const streamChar = await sService.getCharacteristic(gameballUuid.sstream);
    await streamChar.writeValue(Uint8Array.of(3));
    const streamRead = await sService.getCharacteristic(gameballUuid.ssdata);

    // Add device to our tracked list
    if (this.connectedGameballs[0] === "---") this.connectedGameballs = [];
    if (!this.connectedGameballs.includes(devName)) {
      this.connectedGameballs.push(devName);
      this.gameballs[devName] = { server: server, "1": {}, "2": {} };
    }

    // Listen for data
    await streamRead.startNotifications();
    streamRead.addEventListener('characteristicvaluechanged', (event) => this.handleDataChange(event, devName));

    this.runtime.requestToolboxExtensionsUpdate(); // Update menus with new ball name
  }

  handleDataChange(event: Event, devName: string) {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    const tba = new Uint16Array(value.buffer);

    const accel1 = { x: tba[1] * 0.008, y: tba[2] * 0.008, z: tba[3] * 0.008 };
    const accel2 = { x: tba[4] * 0.008, y: tba[5] * 0.008, z: tba[6] * 0.008 };

    this.gameballs[devName]["1"] = { ...accel1, strength: this.getStrength(accel1) };
    this.gameballs[devName]["2"] = { ...accel2, strength: this.getStrength(accel2) };

    // For debugging:
    console.log(`Data from ${devName}:`, this.gameballs[devName]);
  }

  async startAccel(accelName: string, settingsVal: BufferSource, thresholdVal: BufferSource, server: BluetoothRemoteGATTServer) {
    const services = {
      "accel1": { service: gameballUuid.accelerometerService, settingsChar: gameballUuid.a1Config, threshChar: gameballUuid.a1Thresh },
      "accel2": { service: gameballUuid.accelerometer2Service, settingsChar: gameballUuid.a2Config, threshChar: gameballUuid.a2Thresh }
    };
    const config = services[accelName];
    const accelService = await server.getPrimaryService(config.service);
    const acSetting = await accelService.getCharacteristic(config.settingsChar);
    const acThresh = await accelService.getCharacteristic(config.threshChar);
    await acSetting.writeValue(settingsVal);
    await acThresh.writeValue(thresholdVal);
  }

  getStrength(acc: { x: number, y: number, z: number }): number {
    return Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
  }

  getConnectedGameballs(): string[] {
    return [...this.connectedGameballs];
  }
}