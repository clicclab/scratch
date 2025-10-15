require("regenerator-runtime/runtime");
const Runtime = require('../../engine/runtime');

const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');

const EXTENSION_ID = 'gameballExt';

const gameballUuid = {
    /**
     * Services
     */
    genericAccess:                              ["00001800-0000-1000-8000-00805f9b34fb", "Generic Access"],
    genericAttribute:                           ["00001801-0000-1000-8000-00805f9b34fb", "Generic Attribute"],
    deviceInformation:                          ["0000180a-0000-1000-8000-00805f9b34fb", "Device Information"],
    accelerometerService:                       ["c75ea010-ede4-4ab4-8f96-17699ebaf1b8", "Accelerometer 1 Service"],
    accelerometer2Service:                        ["d75ea010-ede4-4ab4-8f96-17699ebaf1b8", "Accelerometer 2 Service"],
    gameballService:                            ["00766963-6172-6173-6f6c-7574696f6e73", "Gameball Service"],
    sensorStreamService:                        ["a54d785d-d674-4cda-b794-ca049d4e044b", "Sensor Stream Service"],
    capacitorService:                           ["f4ad0000-d674-4cda-b794-ca049d4e044b", "Capacitor Service"],

    /**
     * Characteristics
     */
     a1Config:  ["1006bd26-daad-11e5-b5d2-0a1d41d68578", "accelerometer_1_config"],
     a1Thresh:  ["1006bd28-daad-11e5-b5d2-0a1d41d68578", "accelerometer_1_threshold"],
     a1Data:    ["1006bfd8-daad-11e5-b5d2-0a1d41d68578", "accelerometer_1_data"],
     a1id:      ["bb64a6c3-3484-4479-abd2-46dff5bfc574", "accelerometer_1_id"],
     a2Config:  ["8f20fa52-dab9-11e5-b5d2-0a1d41d68578", "accelerometer_2_config"],
     a2Thresh:  ["8f20fa54-dab9-11e5-b5d2-0a1d41d68578", "accelerometer_2_threshold"],
     a2Data:    ["8f20fcaa-dab9-11e5-b5d2-0a1d41d68578", "accelerometer_2_data"],
     a2id:      ["a93d70c9-ed5d-4af1-b0ad-518176309dfb", "accelerometer_2_id"],
     magCom:    ["31696178-3630-4892-adf1-19a7437d052a", "magnetometer_command"],
     magData:   ["042eb337-d510-4ee7-943a-baeaa50b0d9e", "magnetometer_data"],
     magRate:   ["08588aac-e32e-4395-ab71-6508d9d00329", "magnetometer_rate"],
     magid:     ["ea1c2a4b-543c-4275-9cbe-890024d777eb", "magnetometer_id"],
     devTest:   ["8e894cbc-f3f8-4e6b-9a0b-7247598552ac", "device_test"],
     devReset:  ["01766963-6172-6173-6f6c-7574696f6e73", "device_reset"],
     devRef:    ["0d42d5d8-6727-4547-9a82-2fa4d4f331bd", "device_refresh_gatt"],
     devName:   ["7c019ff3-e008-4268-b6f7-8043adbb8c22", "device_name"],
     devCol:    ["822ec8e4-4d57-4e93-9fa7-d47ae7e941c0", "device_color"],
     sstream:   ["a54d785d-d675-4cda-b794-ca049d4e044b", "sensor_stream_config"],
     ssdata:    ["a54d785d-d676-4cda-b794-ca049d4e044b", "sensor_stream_data"],
     capV:      ["f4ad0001-d675-4cda-b794-ca049d4e044b", "capacitor_voltage"],
     capCharge: ["a59c6ade-5427-4afb-bfe4-74b21b7893a0", "capacitor_charging"],

    /**
     * Method that searches an UUID among the UUIDs of all the services and
     * characteristics and returns:
     * - in HTML blue color the name of the service/characteristic found.
     * - in HTML red color a message if the UUID has not been found.
     * @param uuid The service or characteristic UUID.
     * @param serviceOrCharacteristic True (or 1) if it is a service, and false
     * (or 0) if it is a characteristic.
     */
    searchUuid(uuid, serviceOrCharacteristic) {
        for (const key in gameballUuid) {
            if (uuid === gameballUuid[key][0]) {
                return "<font color='blue'>" + gameballUuid[key][1] + "</font>";
            }
        }
        if (serviceOrCharacteristic) {
            return "<font color='red'>Unknown Service</font>";
        } else {
            return "<font color='red'>Unknown Characteristic</font>";
        }
    },
}


// Core, Team, and Official extension classes should be registered statically with the Extension Manager.
// See: scratch-vm/src/extension-support/extension-manager.js
var accel = {"1": {"x": -1, "y": -1, "z": -1}, "2": {"x": -1, "y": -1, "z": -1}}
class GameballExt {    
    constructor (runtime) {
        /**
         * Store this for later communication with the Scratch VM runtime.
         * If this extension is running in a sandbox then `runtime` is an async proxy object.
         * @type {Runtime}
         */
        this.scratch_vm = runtime;
        this.scratch_vm.registerPeripheralExtension(EXTENSION_ID, this);
        this.scratch_vm.connectPeripheral(EXTENSION_ID, 0);
        
        this.robot = this;
        this.thresholdVals = {"low": 155, "medium": 138, "high": 133}
        this.accelerometer = {"1": {"x": -1, "y": -1, "z": -1}, "2": {"x": -1, "y": -1, "z": -1}}
        this.gameballs = {};
        this.connectedGameballs = ["---"];
        
        this._mStatus = 1;
        this._mDevice = null;
        this._mServices = null;

        this.lastConnectCheck = 0;
        this.chargeCharacteristic = null;
        
        this.scratch_vm.on('PROJECT_STOP_ALL', this.resetRobot.bind(this));
        this.scratch_vm.on('CONNECT_MICROBIT_ROBOT', this.connectToBLE.bind(this));

    }


    getConnectedGameballs () {
        // if (Object.keys(this.gameballs).length == 0) {
        return this.connectedGameballs
        // }
    }

    async _loop() {

    }

    resetRobot() {

      }


    /**
     * @return {object} This extension's metadata.
     */
    getInfo () {
        return {
            id: EXTENSION_ID,
            name: formatMessage({
                id: 'gameballExt',
                default: 'Play Impossible Gameball',
                description: 'Extension using BLE to communicate with the Play Impossible Gameball.'
            }),
            showStatusButton: true,
            blockIconURI: blockIconURI,
            menuIconURI: blockIconURI,

            blocks: [
                {
                    func: 'CONNECT_MICROBIT_ROBOT',
                    blockType: BlockType.BUTTON,
                    text: 'Connect Gameball'
                },
                {
                    opcode: 'readAccel',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'gameball.readAccel',
                        default: 'read accel [NUMBER] [AXIS]',
                        description: 'Get accelerometer reads from gameball'
                    }),
                    arguments: {
                        NUMBER: {
                            type: ArgumentType.String,
                            menu: "ACC_NUM",
                            defaultValue: "1",
                        },
                        AXIS: {
                            type: ArgumentType.String,
                            menu: "ACC_AXES",
                            defaultValue: 'x',
                        },
                    },
                },
                {
                    opcode: 'readMultiAccel',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'gameball.readMultiAccel',
                        default: 'acceleration [GAMEBALL] [NUMBER] [AXIS]',
                        description: 'Get accelerometer reads from gameball'
                    }),
                    arguments: {
                        GAMEBALL: {
                            type: ArgumentType.String,
                            menu: "GBS_CONNECTED",
                            defaultValue: this.getConnectedGameballs()[0],
                        },
                        NUMBER: {
                            type: ArgumentType.String,
                            menu: "ACC_NUM",
                            defaultValue: "1",
                        },
                        AXIS: {
                            type: ArgumentType.String,
                            menu: "ACC_AXES",
                            defaultValue: 'x',
                        },
                    },
                },
                {
                    opcode: "setThreshold",
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "gameball.setThreshold",
                        default: "set sensitivity [GAMEBALL] [OPTION]",
                        description: "Change gameball trigger threshold",
                    }),
                    arguments: {
                        GAMEBALL: {
                            type: ArgumentType.String,
                            menu: "GBS_CONNECTED",
                            defaultValue: this.getConnectedGameballs()[0],
                        },
                        OPTION: {
                            type: ArgumentType.STRING,
                            menu:"THRESH_OPTIONS",
                            defaultValue: "medium",
                        },
                    },
                },
            ],
            menus: {
                GBS_CONNECTED: "getConnectedGameballs",
                ACC_NUM: {
                    acceptReporters: true,
                    items: ['1', '2'],
                },
                ACC_AXES: {
                    acceptReporters: true,
                    items: ['x', 'y', 'z', 'strength'],
                },
                THRESH_OPTIONS: {
                    acceptReporters: true,
                    items: [ 'low', 'medium', 'high'],
                }
                // SONGS: {
                //     acceptReporters: false,
                //     items: _songs
                // },
                // COLORS: {
                //     acceptReporters: false,
                //     items: _colors
                // },
                // DIRS: {
                //     acceptReporters: false,
                //     items: _drive
                // },
                // TURNS: {
                //     acceptReporters: false,
                //     items: _turn
                // },
                // BUTTON_STATES: {
                //     acceptReporters: false,
                //     items: _button
                // },
                // LINE_STATES: {
                //     acceptReporters: false,
                //     items: _line_states
                // }
            }
        };
    }
    
    /* The following 4 functions have to exist for the peripherial indicator */
    connect() {
    }
    disconnect() {
    }
    scan() {
        
    }
    isConnected() {
        return (this._mStatus == 2);
    }
    
    onDeviceDisconnected() {
        console.log("Lost connection to robot");   
        this.scratch_vm.emit(this.scratch_vm.constructor.PERIPHERAL_DISCONNECTED);
        this._mDevice = null;
        this._mServices = null;
        this._mStatus = 1;
    }
    /*
    async connectLoop(capChar) {
        while (true) {
            var timeNow = new Date().getTime();
            if ((timeNow - 10000) > this.lastConnectCheck) {
                console.log("connect loop happening");
                cc = await capChar.readValue();
                ccVal = new Uint16Array(cc.buffer)[0] *(3/(2^12))
                console.log(ccVal);
            }
        } 

    }
    */
    async chargeRead(capCharacteristic) {

        // while (true) {
            // console.log("in this loop");
            // var timeNow = new Date().getTime();
            // if ((timeNow - 10000) > this.lastConnectCheck && cc != undefined) {
            //     console.log("connect loop happening");
            //     cc = await capCharacteristic.readValue();
            //     ccVal = new Uint16Array(cc.buffer)[0] *(3/(2^12))
            //     console.log(ccVal);
            //     this.lastConnectCheck = timeNow;
            // }
        // } 

        // console.log(capCharacteristic);
        cc = await capCharacteristic.readValue();
        ccVal = new Uint16Array(cc.buffer)[0] *(3/(2^12))
        console.log(ccVal);

        if (cc != undefined) {
            // console.log("calling againt");
            // this.connectLoop(capCharacteristic);
            // setTimeout(this.chargeRead, 10000, capCharacteristic);
        }
    }

    writeLedString(args) {
        let text = args.TEXT;
        console.log("Write led string: " + text);
        if (this._mServices) this._mServices.ledService.writeText(text);
    }

    async setThreshold(args) {
        args.GAMEBALL
        args.OPTION
        
        this.startAccel("accel1", Uint8Array.of(0x197), Uint16Array.of(this.thresholdVals[args.OPTION]), this.gameballs[args.GAMEBALL]["server"]);
    }

    getStrength(acc) {
        acc = Object.values(acc)
        strength = (acc[0]**2 + acc[1]**2 + acc[2]**2) ** 0.5
        // console.log(strength);
        return strength;
    }

    createChangeListener(event) {
        console.log(event);
        console.log(this);
        devName = this.devName
        return function (event, devName) {
            console.log(event)
            console.log(devName);
        }
    }

    handleDataChange(event) {
      tb = event.target.value.buffer;
      tba = new Uint16Array(tb);
      // console.log(tba);
      
      devName = event.target.service.device.name;
      // if (!(devName in this.context.gameballs)) {
        // if (this.context.connectedGameballs.indexOf("---") != -1) {
        //     this.context.connectedGameballs = [];
        // }
        // this.context.gameballs[devName] = {"1": {}, "2": {}};
        // this.context.gameballs[this.devName] = {"1": {"x": -1, "y": -1, "z": -1}, "2": {"x": -1, "y": -1, "z": -1}};
        // if (this.context.connectedGameballs.indexOf(devName) == -1){
        //     this.context.connectedGameballs.push(devName);
        // }
      // }

      accel["1"] =  {"x": tba[1] *0.008, "y": tba[2]*0.008, "z": tba[3]*0.008}
      accel["2"] = {"x": tba[4]*0.008, "y": tba[5]*0.008, "z": tba[6] *0.008};
      accel["1"]["strength"] = this.context.getStrength(accel["1"]);
      accel["2"]["strength"] = this.context.getStrength(accel["2"]);


      this.context.gameballs[devName]["1"] = {"x": tba[1] *0.008, "y": tba[2]*0.008, "z": tba[3]*0.008, "strength": this.context.getStrength(tba.slice(1,4)) * 0.008};
      this.context.gameballs[devName]["2"] = {"x": tba[4] *0.008, "y": tba[5]*0.008, "z": tba[6]*0.008, "strength": this.context.getStrength(tba.slice(1,4)) * 0.008};
      // console.log(this.context.gameballs);
      // console.log(this.accelerometer);
      pushObj = {};
      tba.map((c, index) => pushObj["a" + String(index)] = c);
      pushObj["time"] = new Date().getTime();
      pushObj["tag"] = -1;
      // printData.push(pushObj);
    }

    async readAccel(args) {
        // console.log(args)
        // console.log(this.accelerometer[args.DEVICE]);
        // console.log();
        // console.log(args.DIR);
        // if (args.DEVICE in this.accelerometer) {
            // console.log(this.accelerometer["1"]);
        return accel[args.NUMBER][args.AXIS];
        // }
        // else {
        //     return null;
        // }
    }

    async readMultiAccel(args) {
        if (args.GAMEBALL != "---") {
            return this.gameballs[args.GAMEBALL][args.NUMBER][args.AXIS];
        }
        else {
            return -1
        }
        
    }

    async startReadingData(ch, devName) {
        await ch.startNotifications();
        // await ch.addEventListener('characteristicvaluechanged', this.createChangeListener({"context": this, "devName": devName}));

        await ch.addEventListener('characteristicvaluechanged', this.handleDataChange.bind({"context": this, "devName": devName}));
        // console.log(ch);
        // console.log(ch[1], ch[2], ch[3]);
        
    }

    getCharId(charName) {
        return gameballUuid[charName][0];
    }

    async startAccel(accelName, settingsVal, thresholdVal, server) {
        var accelServices = {
            "accel1": {
                "service": "accelerometerService", 
                "settingsChar": "a1Config",
                "threshChar": "a1Thresh"
            }, 
            "accel2": {
                "service": "accelerometer2Service",
                "settingsChar": "a2Config",
                "threshChar": "a2Thresh"
            }
        };

        asa = accelServices[accelName];
        accelService = await server.getPrimaryService(this.getCharId(asa["service"]));
        acSetting = await accelService.getCharacteristic(this.getCharId(asa["settingsChar"]));
        acThresh = await accelService.getCharacteristic(this.getCharId(asa["threshChar"]));
        await acSetting.writeValue(settingsVal);
        await acThresh.writeValue(thresholdVal);
        return [acSetting, acThresh];
    }


    async startListening(device) {
        // console.log("starting to listen!!!");
        const server = await device.gatt.connect();
        this._mServices = await server.getPrimaryServices();
        const services = await server.getPrimaryServices();
        // console.log(server)
        gameService = await server.getPrimaryService(gameballUuid["gameballService"][0]);
        refreshCharacteristic = await gameService.getCharacteristic(gameballUuid["devRef"][0]);
        a1Chars = await this.startAccel("accel1", Uint8Array.of(0x197), Uint16Array.of(135), server);
        await this.startAccel("accel2", Uint8Array.of(0x647), Uint16Array.of(135), server);

        sService = await server.getPrimaryService("a54d785d-d674-4cda-b794-ca049d4e044b");
        streamChar = await sService.getCharacteristic("a54d785d-d675-4cda-b794-ca049d4e044b");
        capService = await server.getPrimaryService(gameballUuid["capacitorService"][0]);
        capCharacteristic = await capService.getCharacteristic(gameballUuid["capV"][0]);
        for (var x=1; x < 180; x++) {
            setTimeout(this.chargeRead, x*10000, capCharacteristic);    
        }

        await streamChar.writeValue(Uint8Array.of(3));
        streamRead = await sService.getCharacteristic("a54d785d-d676-4cda-b794-ca049d4e044b");
        let devName = String(Object.keys(this.gameballs).length);
        if (server.device.name) {
            devName = server.device.name;
        }
        if (this.connectedGameballs.indexOf("---") != -1) {
            this.connectedGameballs = [];
        }
        if (this.connectedGameballs.indexOf(devName) == -1){
            this.connectedGameballs.push(devName);
            this.gameballs[devName] = {"server": server, "1": {}, "2": {}};
        }
        this.startReadingData(streamRead, devName);
        console.log(services);
        return services;
    }
    
    async connectToBLE() {
        console.log("Getting BLE device");
        
        if (window.navigator.bluetooth) {
            try {
                // this._mDevice = await microbit.requestMicrobit(window.navigator.bluetooth);
                // this._mServices = await microbit.getServices(this._mDevice);

                const device = await navigator.bluetooth.requestDevice({
                    // To accept all devices, use acceptAllDevices: true and remove filters.
                    filters: [{namePrefix: "Gameball"}],
                    // acceptAllDevices: true,
                    optionalServices: [
                        gameballUuid.genericAccess[0], 
                        gameballUuid.genericAttribute[0], 
                        gameballUuid.deviceInformation[0], 
                        gameballUuid.accelerometerService[0], 
                        gameballUuid.accelerometer2Service[0], 
                        gameballUuid.gameballService[0], 
                        gameballUuid.sensorStreamService[0], 
                        gameballUuid.capacitorService[0]
                    ],
                })
                // console.log(device);
                this._mDevice = device;
                // console.log(this._mDevice);
                // var server = await this._mDevice.gatt.connect();
                
                // log('Connecting to GATT Server...');
                var cc;

                services = await this.startListening(device);
                console.log(this._mServices);
      
                if (this._mServices.deviceInformationService) {
                    this._mStatus = 2;            
                    this.scratch_vm.emit(this.scratch_vm.constructor.PERIPHERAL_CONNECTED);
    
                    if (this._mServices.uartService) {
                        this._mServices.uartService.addEventListener("receiveText", this.updateSensors.bind(this));
                        this._mDevice.addEventListener("gattserverdisconnected", this.onDeviceDisconnected.bind(this));
                    }
                }
            } catch(err) {
                console.log(err);
                if (err.message == "Bluetooth adapter not available.") alert("Your device does not support BLE connections. Please go to the robot setup instructions to install the Gizmo Robot Extension.");
            }
        } else {
            alert("Error trying to connect to BLE devices. Please try again.");
        }
    }
 
}
module.exports = GameballExt;
