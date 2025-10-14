require("regenerator-runtime/runtime");
const Runtime = require('../../engine/runtime');

const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');
const Video = require('../../io/video');
const tf = require('@tensorflow/tfjs');
const modelUrl = './static/models/tf-bballDetect/model.json';
require("@tensorflow/tfjs-backend-webgl");
tf.setBackend('webgl');
const StageLayering = require('../../engine/stage-layering');

/**
 * Sensor attribute video sensor block should report.
 * @readonly
 * @enum {string}
 */
const SensingAttribute = {
    /** The amount of motion. */
    MOTION: 'motion',

    /** The direction of the motion. */
    DIRECTION: 'direction'
};

/**
 * Subject video sensor block should report for.
 * @readonly
 * @enum {string}
 */
const SensingSubject = {
    /** The sensor traits of the whole stage. */
    STAGE: 'Stage',

    /** The senosr traits of the area overlapped by this sprite. */
    SPRITE: 'this sprite'
};

/**
 * States the video sensing activity can be set to.
 * @readonly
 * @enum {string}
 */
const VideoState = {
    /** Video turned off. */
    OFF: 'off',

    /** Video turned on with default y axis mirroring. */
    ON: 'on',

    /** Video turned on without default y axis mirroring. */
    ON_FLIPPED: 'on-flipped'
};

const Detection = {
    /** Model is not detecting */
    OFF: 'off',

    /**  Model is detecting */
    ON: 'on'
};
const Visibility = {
    SHOW: 'show',
    HIDE: 'hide'
};
const Objects = {
    // ALL: 'objects',
    BASKETBALL: 'basketballs',
    RIM: 'rims'
};
const Object = {
    // ANY: 'object',
    BASKETBALL: 'basketball',
    RIM: 'rim'
};
const Axis = {
    X: 'x',
    Y: 'y'
};
const Event = {
    PASS: 'pass'
};

const EXTENSION_ID = 'bballDetect';

let model;

/**
 * Class for the motion-related blocks in Scratch 3.0
 * @param {Runtime} runtime - the runtime instantiating this block package.
 * @constructor
 */
class Scratch3BballDetectBlocks {

    async loadModel () {
        model = await tf.loadGraphModel(modelUrl);
    }

    async generatePrediction () {
        const scaledSquareDimension = 128;
        
        //Ensure model is loaded before proceeding (necessary if other extensions have loaded before Sport Finder)
        if (!model) {
            await this.loadModel();
        }

        if (this.globalDetection === Detection.ON) {
            const resultTensors = await tf.tidy(() => {
                //Preprocess the image
                let imageData2 = tf.browser.fromPixels(this.currImage);
                imageData2 = tf.image.resizeBilinear(imageData2, [scaledSquareDimension, scaledSquareDimension]);
                imageData2 = imageData2.div(tf.scalar(255)); // Normalize to [0, 1]
                const input = imageData2.expandDims(0); // Add batch dimension
                //Process the image
                return model.predict(input); //[1, 128, 128, 3] - 3 for basketball, rim, background
            });
            //Extract results
            let scores_max = resultTensors.max(axis = 3); //axis = 3 for values of basketball, rim, background
            let scores_maxClass = resultTensors.argMax(axis = 3); //axis = 3 for basketball, rim, background
            let scoresMaxArray = scores_max.dataSync();
            let scoresMaxClassArray = scores_maxClass.dataSync();

            //0 is background
            //1 is basketball
            //2 is rim
            this.detections = [];
            for (let i = 0; i < scoresMaxArray.length; i++) {
                if (scoresMaxArray[i] >= 0.25) {
                    if (scoresMaxClassArray[i] === 1) { //only add non-background detections to detections array (no if statement for 0)
                        let detection = {
                            class: "Basketball",
                            score: scoresMaxArray[i].toFixed(2),
                            position: i
                        };
                        this.detections.push(detection);
                    } else if (scoresMaxClassArray[i] === 2) {
                        let detection = {
                            class: "Rim",
                            score: scoresMaxArray[i].toFixed(2),
                            position: i
                        };
                        this.detections.push(detection);
                    }
                }
            }    
            scores_max.dispose();
            scores_maxClass.dispose();
            resultTensors.dispose();
            // console.log(this.detections);
        }
    }    


    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        this.runtime.registerPeripheralExtension(EXTENSION_ID, this);
        this.runtime.connectPeripheral(EXTENSION_ID, 0);
        this.runtime.emit(this.runtime.constructor.PERIPHERAL_CONNECTED);
        this.loadModel();
        this.skinID = -1; //for drawing pass lines

        /**
         * A flag to determine if this extension has been installed in a project.
         * It is set to false the first time getInfo is run.
         * @type {boolean}
         */
        this.firstInstall = true;
        if (this.runtime.ioDevices) {
            this.runtime.on(Runtime.PROJECT_LOADED, this.projectStarted.bind(this));
            this.runtime.on(Runtime.PROJECT_RUN_START, this.reset.bind(this));
            this._loop();
        }
        myTimer01 = setInterval(this.myPicturenow, this.globalDetectionRate);
        this.detections = [];
    }

    /**
     * Dimensions the video stream is analyzed at after its rendered to the
     * sample canvas.
     * @type {Array.<number>}
     */
    static get DIMENSIONS () {
        return [480, 360];
    }

    /**
     * The key to load & store a target's motion-related state.
     * @type {string}
     */
    static get STATE_KEY () {
        return 'Scratch.bballDetect';
    }

    /**
     * The default motion-related state, to be used when a target has no existing motion state.
     * @type {MotionState}
     */
    static get DEFAULT_MOTION_STATE () {
        return {
            motionFrameNumber: 0,
            motionAmount: 0,
            motionDirection: 0
        };
    }

    /**
     * The transparency setting of the video preview stored in a value
     * accessible by any object connected to the virtual machine.
     * @type {number}
     */
    get globalVideoTransparency () {
        const stage = this.runtime.getTargetForStage();
        if (stage) {
            return stage.videoTransparency;
        }
        return 50;
    }

    set globalVideoTransparency (transparency) {
        const stage = this.runtime.getTargetForStage();
        if (stage) {
            stage.videoTransparency = transparency;
        }
        return transparency;
    }

    /**
     * The video state of the video preview stored in a value accessible by any
     * object connected to the virtual machine.
     * @type {number}
     */
    get globalVideoState () {
        const stage = this.runtime.getTargetForStage();
        if (stage) {
            return stage.videoState;
        }
        // Though the default value for the stage is normally 'on', we need to default
        // to 'off' here to prevent the video device from briefly activating
        // while waiting for stage targets to be installed that say it should be off
        return VideoState.OFF;
    }

    set globalVideoState (state) {
        const stage = this.runtime.getTargetForStage();
        if (stage) {
            stage.videoState = state;
        }
        return state;
    }

    /**
     * Get the latest values for video transparency and state,
     * and set the video device to use them.
     */
    projectStarted () {
        this.setVideoTransparency({
            TRANSPARENCY: this.globalVideoTransparency
        });
        this.videoToggle({
            VIDEO_STATE: this.globalVideoState
        });
        //comment this.videoToggle({...}); to disable automatic video start upon extension load
    }

    reset () {
    }

    scan() {
    }

    isConnected() {
        return (this.detections.length != 0);
    }

    connect() {
    }

    async _loop () {
        while (true) {

            const frame = this.runtime.ioDevices.video.getFrame({
                format: Video.FORMAT_IMAGE_DATA,
                dimensions: Scratch3BballDetectBlocks.DIMENSIONS
            });
            
            if (frame) {
                this.currImage = frame;
                await this.generatePrediction();
                if (this.globalDetection == Detection.ON) {
                    if (this.detections.length != 0) {
                        this.runtime.emit(this.runtime.constructor.PERIPHERAL_CONNECTED);
                    } else {
                        this.runtime.emit(this.runtime.constructor.PERIPHERAL_DISCONNECTED);
                    }
                } else {
                    this.runtime.emit(this.runtime.constructor.PERIPHERAL_DISCONNECTED);
                }
            } else {
                this.detections = [];
                this.runtime.emit(this.runtime.constructor.PERIPHERAL_DISCONNECTED);
            }
            await new Promise(r => setTimeout(r, this.globalDetectionRate));
        }
    }
   
    /**
     * Create data for a menu in scratch-blocks format, consisting of an array
     * of objects with text and value properties. The text is a translated
     * string, and the value is one-indexed.
     * @param {object[]} info - An array of info objects each having a name
     *   property.
     * @return {array} - An array of objects with text and value properties.
     * @private
     */
    _buildMenu (info) {
        return info.map((entry, index) => {
            const obj = {};
            obj.text = entry.name;
            obj.value = entry.value || String(index + 1);
            return obj;
        });
    }

    static get SensingAttribute () {
        return SensingAttribute;
    }

    /**
     * An array of choices of whether a reporter should return the frame's
     * motion amount or direction.
     * @type {object[]}
     * @param {string} name - the translatable name to display in sensor
     *   attribute menu
     * @param {string} value - the serializable value of the attribute
     */
    get ATTRIBUTE_INFO () {
        return [
            {
                name: formatMessage({
                    id: 'videoSensing.motion',
                    default: 'motion',
                    description: 'Attribute for the "video [ATTRIBUTE] on [SUBJECT]" block'
                }),
                value: SensingAttribute.MOTION
            },
            {
                name: formatMessage({
                    id: 'videoSensing.direction',
                    default: 'direction',
                    description: 'Attribute for the "video [ATTRIBUTE] on [SUBJECT]" block'
                }),
                value: SensingAttribute.DIRECTION
            }
        ];
    }

    static get SensingSubject () {
        return SensingSubject;
    }

    /**
     * An array of info about the subject choices.
     * @type {object[]}
     * @param {string} name - the translatable name to display in the subject menu
     * @param {string} value - the serializable value of the subject
     */
    get SUBJECT_INFO () {
        return [
            {
                name: formatMessage({
                    id: 'videoSensing.sprite',
                    default: 'sprite',
                    description: 'Subject for the "video [ATTRIBUTE] on [SUBJECT]" block'
                }),
                value: SensingSubject.SPRITE
            },
            {
                name: formatMessage({
                    id: 'videoSensing.stage',
                    default: 'stage',
                    description: 'Subject for the "video [ATTRIBUTE] on [SUBJECT]" block'
                }),
                value: SensingSubject.STAGE
            }
        ];
    }

    /**
     * States the video sensing activity can be set to.
     * @readonly
     * @enum {string}
     */
    static get VideoState () {
        return VideoState;
    }

    /**
     * An array of info on video state options for the "turn video [STATE]" block.
     * @type {object[]}
     * @param {string} name - the translatable name to display in the video state menu
     * @param {string} value - the serializable value stored in the block
     */
    get VIDEO_STATE_INFO () {
        return [
            {
                name: formatMessage({
                    id: 'videoSensing.off',
                    default: 'off',
                    description: 'Option for the "turn video [STATE]" block'
                }),
                value: VideoState.OFF
            },
            {
                name: formatMessage({
                    id: 'videoSensing.on',
                    default: 'on',
                    description: 'Option for the "turn video [STATE]" block'
                }),
                value: VideoState.ON
            },
            {
                name: formatMessage({
                    id: 'videoSensing.onFlipped',
                    default: 'on flipped',
                    description: 'Option for the "turn video [STATE]" block that causes the video to be flipped' +
                        ' horizontally (reversed as in a mirror)'
                }),
                value: VideoState.ON_FLIPPED
            }
        ];
    }

    get VISIBILITY_INFO () {
        return [
            {
                name: formatMessage({
                    id: 'visibility.show',
                    default: 'show',
                    description: 'Option for the "[STATE] pass lines" block'
                }),
                value: Visibility.SHOW
            },
            {
                name: formatMessage({
                    id: 'visibility.hide',
                    default: 'hide',
                    description: 'Option for the "[STATE] pass lines" block'
                }),
                value: Visibility.HIDE
            }
        ];
    }

    get DETECTION_INFO () {
        return [
            {
                name: formatMessage({
                    id: 'detection.on',
                    default: 'on',
                    description: 'Option for the "Turn continuous detection [STATE]" block'
                }),
                value: Detection.ON
            },
            {
                name: formatMessage({
                    id: 'detection.off',
                    default: 'off',
                    description: 'Option for the "Turn continuous detection [STATE]" block'
                }),
                value: Detection.OFF
            }
        ];
    }

    get OBJECTS_INFO () {
        return [
            // {
            //     name: formatMessage({
            //         id: 'objects.all',
            //         default: 'objects',
            //         description: 'Bounding boxes for ALL objects'
            //     }),
            //     value: Objects.ALL
            // },
            {
                name: formatMessage({
                    id: 'objects.basketball',
                    default: 'basketballs',
                    description: 'Bounding boxes for basketballs ONLY'
                }),
                value: Objects.BASKETBALL
            },
            {
                name: formatMessage({
                    id: 'objects.rim',
                    default: 'rims',
                    description: 'Bounding boxes for rims ONLY'
                }),
                value: Objects.RIM
            }
        ]
    }
    
    get OBJECT_INFO () {
        return [
            // {
            //     name: formatMessage({
            //         id: 'object.any',
            //         default: 'object',
            //         description: 'Singular object'
            //     }),
            //     value: Object.ANY
            // },
            {
                name: formatMessage({
                    id: 'object.basketball',
                    default: 'basketball',
                    description: 'Singular basketball'
                }),
                value: Object.BASKETBALL
            },
            {
                name: formatMessage({
                    id: 'object.rim',
                    default: 'rim',
                    description: 'Singular rim'
                }),
                value: Object.RIM
            }
        ]
    }

    get EVENT_INFO () {
        return [
            {
                name: formatMessage({
                    id: 'object.basketball',
                    default: 'basketball',
                    description: 'Singular basketball'
                }),
                value: Object.BASKETBALL
            },
            {
                name: formatMessage({
                    id: 'object.rim',
                    default: 'rim',
                    description: 'Singular rim'
                }),
                value: Object.RIM
            },
            {
                name: formatMessage({
                    id: 'event.pass',
                    default: 'pass',
                    description: 'A pass - when basketball object passes the middle of the screen'
                }),
                value: Event.PASS
            }
        ]
    }


    get AXIS_INFO () {
        return [
            {
                name: formatMessage({
                    id: 'axis.x',
                    default: 'x',
                    description: 'x-axis'
                }),
                value: Axis.X
            },
            {
                name: formatMessage({
                    id: 'axis.y',
                    default: 'y',
                    description: 'y-axis'
                }),
                value: Axis.Y
            }
        ]
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        // Set the video display properties to defaults the first time
        // getInfo is run. This turns on the video device when it is
        // first added to a project, and is overwritten by a PROJECT_LOADED
        // event listener that later calls updateVideoDisplay
        if (this.firstInstall) {
            this.globalVideoState = VideoState.ON;
            this.globalVideoTransparency = 50;
            this.globalDetectionRate = 1;
            this.globalDetection = Detection.ON;
            this.projectStarted();
            this.firstInstall = false;
        }

        // Return extension definition
        return {
            id: EXTENSION_ID,
            name: formatMessage({
                id: 'bballDetect.categoryName',
                default: 'Sport Finder',
                description: 'tiilt Sport Finder'
            }),
            showStatusButton: true,
            blockIconURI: blockIconURI,
            menuIconURI: menuIconURI,
            blocks: [
                {
                    opcode: 'setContinuousDetection',
                    text: formatMessage({
                        id: 'videoSensing.continuousDetection',
                        default: 'turn continuous detection [DETECTION]',
                        description: 'Controls whether model keeps detecting objects'
                    }),
                    arguments: {
                        DETECTION: {
                            type: ArgumentType.NUMBER,
                            menu: 'DETECTION',
                            defaultValue: Detection.ON,
                        }
                    }
                },
                {
                    opcode: 'setPassLineVisibility',
                    text: formatMessage({
                        id: 'videoSensing.passlines',
                        default: '[VISIBILITY] pass lines',
                        description: 'Controls whether canvas shows pass lines'
                    }),
                    arguments: {
                        VISIBILITY: {
                            type: ArgumentType.NUMBER,
                            menu: 'VISIBILITY',
                            defaultValue: Visibility.SHOW,
                        }
                    }
                },
                '---',
                {
                    opcode: 'goToNearestObject',
                    text: 'go to nearest [OBJECT]',
                    blockType: BlockType.COMMAND,
                    isTerminal: false,
                    arguments: {
                        OBJECT : {
                            type: ArgumentType.NUMBER,
                            menu: 'OBJECT',
                            defaultValue: Object.BASKETBALL,
                        }
                    },
                },
                // {
                //     opcode: 'drawBoxes',
                //     text: 'draw bounding boxes on all [OBJECTS]',
                //     blockType: BlockType.COMMAND,
                //     isTerminal: false,
                //     arguments: {
                //         OBJECTS : {
                //             type: ArgumentType.NUMBER,
                //             menu: 'OBJECTS',
                //             defaultValue: Objects.ALL,
                //         }
                //     }
                // },
                {
                    opcode: 'setDetectionRate',
                    text: formatMessage({
                        id: 'videoSensing.setDetectionRate',
                        default: 'set detection rate to [RATE] ms',
                        description: 'Controls detection rate passed to model'
                    }),
                    arguments: {
                        RATE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    }
                },
                {
                    opcode: 'clearAllDetections',
                    text: 'clear all detections',
                    blockType: BlockType.COMMAND,
                    isTerminal: false
                },
                '---',
                {
                    opcode: 'ifEvent',
                    text: '[EVENT] detected',
                    blockType: BlockType.BOOLEAN,
                    isTerminal: true,
                    arguments: {
                        EVENT: {
                            type: ArgumentType.NUMBER,
                            menu: 'EVENT',
                            defaultValue: Object.BASKETBALL,
                        },
                    }
                },
                '---',
                {
                    opcode: 'currObjs',
                    text: 'current [OBJECTS] detected',
                    blockType: BlockType.REPORTER,
                    isTerminal: true,
                    arguments: {
                        OBJECTS: {
                            type: ArgumentType.NUMBER,
                            menu: 'OBJECTS',
                            defaultValue: Objects.BASKETBALL,
                        },
                    }
                },
                {
                    opcode: 'numDetected',
                    text: 'number of [OBJECTS] detected',
                    blockType: BlockType.REPORTER,
                    isTerminal: true,
                    arguments: {
                        OBJECTS : {
                            type: ArgumentType.NUMBER,
                            menu: 'OBJECTS',
                            defaultValue: Objects.BASKETBALL,
                        }
                    }
                },
                // {
                //     opcode: 'objectsCoords',
                //     text: '(x, y) coordinates of [OBJECTS]',
                //     blockType: BlockType.REPORTER,
                //     isTerminal: true,
                //     arguments: {
                //         OBJECTS: {
                //             type: ArgumentType.NUMBER,
                //             menu: 'OBJECTS',
                //             defaultValue: Objects.ALL,
                //         },
                //     }
                // },
                {
                    opcode: 'objectsPos',
                    text: '[AXIS] positions of [OBJECTS]',
                    blockType: BlockType.REPORTER,
                    isTerminal: true,
                    arguments: {
                        AXIS: {
                            type: ArgumentType.NUMBER,
                            menu: 'AXIS',
                            defaultValue: Axis.X,
                        },
                        OBJECTS: {
                            type: ArgumentType.NUMBER,
                            menu: 'OBJECTS',
                            defaultValue: Objects.BASKETBALL,
                        },
                    }
                },
                // {
                //     opcode: 'objectsXCoords',
                //     text: 'x positions of [OBJECTS]',
                //     blockType: BlockType.REPORTER,
                //     isTerminal: true,
                //     arguments: {
                //         OBJECTS: {
                //             type: ArgumentType.NUMBER,
                //             menu: 'OBJECTS',
                //             defaultValue: Objects.BASKETBALL,
                //         },
                //     }
                // },
                // {
                //     opcode: 'objectsYCoords',
                //     text: 'y positions of [OBJECTS]',
                //     blockType: BlockType.REPORTER,
                //     isTerminal: true,
                //     arguments: {
                //         OBJECTS: {
                //             type: ArgumentType.NUMBER,
                //             menu: 'OBJECTS',
                //             defaultValue: Objects.BASKETBALL,
                //         },
                //     }
                // },
                {
                    opcode: 'nearestCoords',
                    text: '(x, y) coordinates of nearest [OBJECT]',
                    blockType: BlockType.REPORTER,
                    isTerminal: true,
                    arguments: {
                        OBJECT: {
                            type: ArgumentType.NUMBER,
                            menu: 'OBJECT',
                            defaultValue: Object.BASKETBALL,
                        },
                    }
                },
                {
                    opcode: 'nearestPos',
                    text: '[AXIS] position of nearest [OBJECT]',
                    blockType: BlockType.REPORTER,
                    isTerminal: true,
                    arguments: {
                        AXIS: {
                            type: ArgumentType.NUMBER,
                            menu: 'AXIS',
                            defaultValue: Axis.X,
                        },
                        OBJECT: {
                            type: ArgumentType.NUMBER,
                            menu: 'OBJECT',
                            defaultValue: Object.BASKETBALL,
                        },
                    }
                },
                {
                    opcode: 'objDist',
                    text: 'distance between nearest [OBJECT1] and [OBJECT2]',
                    blockType: BlockType.REPORTER,
                    isTerminal: true,
                    arguments: {
                        OBJECT1: {
                            type: ArgumentType.NUMBER,
                            menu: 'OBJECT',
                            defaultValue: Object.BASKETBALL,
                        },
                        OBJECT2: {
                            type: ArgumentType.NUMBER,
                            menu: 'OBJECT',
                            defaultValue: Object.RIM,
                        },
                    }
                },
                {
                    opcode: 'objAngle',
                    text: 'acute angle between nearest [OBJECT1] and [OBJECT2]',
                    blockType: BlockType.REPORTER,
                    isTerminal: true,
                    arguments: {
                        OBJECT1: {
                            type: ArgumentType.NUMBER,
                            menu: 'OBJECT',
                            defaultValue: Object.BASKETBALL,
                        },
                        OBJECT2: {
                            type: ArgumentType.NUMBER,
                            menu: 'OBJECT',
                            defaultValue: Object.RIM,
                        },
                    }
                },
                '---',
                {
                    opcode: 'videoToggle',
                    text: formatMessage({
                        id: 'videoSensing.videoToggle',
                        default: 'turn video [VIDEO_STATE]',
                        description: 'Controls display of the video preview layer'
                    }),
                    arguments: {
                        VIDEO_STATE: {
                            type: ArgumentType.NUMBER,
                            menu: 'VIDEO_STATE',
                            defaultValue: VideoState.OFF
                        }
                    }
                },
                {
                    opcode: 'setVideoTransparency',
                    text: formatMessage({
                        id: 'videoSensing.setVideoTransparency',
                        default: 'set video transparency to [TRANSPARENCY]%',
                        description: 'Controls transparency of the video preview layer'
                    }),
                    arguments: {
                        TRANSPARENCY: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 50
                        }
                    }
                },
            ],
            menus: {
                ATTRIBUTE: {
                    acceptReporters: true,
                    items: this._buildMenu(this.ATTRIBUTE_INFO)
                },
                SUBJECT: {
                    acceptReporters: true,
                    items: this._buildMenu(this.SUBJECT_INFO)
                },
                VIDEO_STATE: {
                    acceptReporters: true,
                    items: this._buildMenu(this.VIDEO_STATE_INFO)
                },
                VISIBILITY: {
                    acceptReporters: true,
                    items: this._buildMenu(this.VISIBILITY_INFO)
                },
                DETECTION: {
                    acceptReporters: true,
                    items: this._buildMenu(this.DETECTION_INFO)
                },
                OBJECTS: {
                    acceptReporters: true,
                    items: this._buildMenu(this.OBJECTS_INFO)
                },
                OBJECT: {
                    acceptReporters: true,
                    items: this._buildMenu(this.OBJECT_INFO)
                },
                EVENT: {
                    acceptReporters: true,
                    items: this._buildMenu(this.EVENT_INFO)
                },
                AXIS: {
                    acceptReporters: true,
                    items: this._buildMenu(this.AXIS_INFO)
                }
            }
        };
    }

    goToNearestObject(args, util) {
        let nearestObject = this.nearestHelper(args['OBJECT'], util);
        // If a nearest object was found, move the sprite to its position
        if (nearestObject) {
            util.target.setXY(nearestObject.x, nearestObject.y, false);
        }
    }

    clearFrame() {
        // Iterate over current drawables and destroy them
        for (const drawable of this.currentDrawables) {
            drawable.destroy(); // Assuming drawable has a destroy method
        }
        this.currentDrawables = []; // Reset the current drawables list
    }


    clearAllDetections() {
        this.detections = [];
    }

    /**
     * @param {object} args - the block arguments
     * @param {BlockUtility} util - the block utility
     * @returns {number} class name if video frame matched, empty number if model not loaded yet
     */
    ifEvent(args, util) {
        if (args['EVENT'] === Event.PASS) {
            return this.isPassDetected();
        } else {
            return (this.filterDetections(args['EVENT']).length != 0)
        }
    }

    isPassDetected() {
        const renderer = this.runtime.renderer;
        const basketballs = this.filterDetections(Objects.BASKETBALL);
    
        if (basketballs.length === 0) return false;
    
        for (const bball of basketballs) {
            const x = this.tfPositiontoScratch(bball.position).x;
               
            if (x <= (renderer._xLeft + 50) || x >= (renderer._xRight - 50)) { //the pass lines are +-20, but this is +- 50 to allow for some leeway
                if (!this.potentialPass) {
                    this.potentialPass = {
                        startX: x,
                        startTime: Date.now(),
                        direction: x <= (renderer._xLeft + 50) ? 'left-to-right' : 'right-to-left'
                    };
                } else {
                    const timeDiff = Date.now() - this.potentialPass.startTime;
                    if (timeDiff <= 2000) { //2000 ms to make a pass
                        if ((this.potentialPass.direction === 'left-to-right' && x >= (renderer._xRight - 50)) ||
                            (this.potentialPass.direction === 'right-to-left' && x <= (renderer._xLeft + 50))) {
                            this.potentialPass = null;
                            console.log("Pass detected!");
                            return true;
                        }
                    } else {
                        this.potentialPass = null; //reset potential pass now that time's up
                    }
                }
            }
        }
        return false;
    }
    
    currObjs(args, util) {
        let objects = [];
        objects = this.filterDetections(args['OBJECTS'])
        if (objects.length != 0) {
            let outputString = "";
            for (const object of objects) {     
                const x = this.tfPositiontoScratch(object.position).x;
                const y = this.tfPositiontoScratch(object.position).y;
        
                outputString += `${object.class}, ${object.score}, (${x}, ${y})\n`;
            }
            return outputString;
        } else {
            return `No ${args['OBJECTS']} found!`;
        }                   
    }

    numDetected(args, util) {
        return this.filterDetections(args['OBJECTS']).length;
    }

    // objectsCoords(args, util) {
    //     let objects = [];
    //     let coordsString = "";
    //     if (args['OBJECTS'] === Objects.BASKETBALL) {
    //         objects = this.detections.filter(detection => detection.class === "Basketball");
    //     } else if (args['OBJECTS'] === Objects.RIM) {
    //         objects = this.detections.filter(detection => detection.class === "Rim");
    //     } else {
    //         objects = this.detections;
    //     }
    //     if (objects.length != 0) {
    //         for (const object of objects) {
    //             const coord = `(${this.tfPositiontoScratch(object.position).x}, ${this.tfPositiontoScratch(object.position).y})`;
                
    //             coordsString += coord;
    //             coordsString += "\n";
    //         }
    //         return coordsString;
    //     }
    // }

    // objectsXCoords(args, util) {
    //     let objects = [];
    //     let xPosString = "";
    //     if (args['OBJECTS'] === Objects.BASKETBALL) {
    //         objects = this.detections.filter(detection => detection.class === "Basketball");
    //     } else if (args['OBJECTS'] === Objects.RIM) {
    //         objects = this.detections.filter(detection => detection.class === "Rim");
    //     } else {
    //         objects = this.detections;
    //     }
    //     if (objects.length != 0) {
    //         for (const object of objects) {
    //             const x = this.tfPositiontoScratch(object.position).x;
                
    //             xPosString += x;
    //             xPosString += "\n";
    //         }
    //         return xPosString;
    //     }
    // }

    // objectsYCoords(args, util) {
    //     let objects = [];
    //     let yPosString = "";
    //     if (args['OBJECTS'] === Objects.BASKETBALL) {
    //         objects = this.detections.filter(detection => detection.class === "Basketball");
    //     } else if (args['OBJECTS'] === Objects.RIM) {
    //         objects = this.detections.filter(detection => detection.class === "Rim");
    //     } else {
    //         objects = this.detections;
    //     }
    //     if (objects.length != 0) {
    //         for (const object of objects) {
    //             const y = this.tfPositiontoScratch(object.position).y;
                
    //             yPosString += y;
    //             yPosString += "\n";
    //         }
    //         return yPosString;
    //     }
    // }

    objectsPos(args, util) {
        let objects = this.filterDetections(args['OBJECTS']);
        let posString = "";
        if (objects.length != 0) {
            const xORy = args['AXIS'] === Axis.X ? 'x' : 'y'; //set to x if user argument is x, else set to y
            for (const object of objects) {
                const pos = this.tfPositiontoScratch(object.position)[xORy]; //access all x or y positions
                
                posString += pos;
                posString += "\n";
            }
            return posString;
        } else {
            return `No ${args['OBJECTS']} found!`;
        }
    }

    nearestCoords(args, util) {
        let nearestObject = this.nearestHelper(args['OBJECT'], util);
        if (nearestObject) {
            return `(${nearestObject.x}, ${nearestObject.y})`;
        } else {
            return `No ${args['OBJECT']}s found!`;
        }
    }

    nearestPos(args, util) {
        let nearestObject = this.nearestHelper(args['OBJECT'], util);
        if (nearestObject) {
            if (args['AXIS'] === Axis.X) {
                return nearestObject.x;
            } else {
                return nearestObject.y;
            }
        } else {
            return `No ${args['OBJECT']}s found!`;
        }
    }

    objDist(args, util) {
        let nearestObject1 = this.nearestHelper(args['OBJECT1'], util);
        let nearestObject2 = this.nearestHelper(args['OBJECT2'], util);
        if (nearestObject1 && nearestObject2) { //If nearest detections were found, return the distance between them
            const distance = Math.sqrt(Math.pow(nearestObject1.x - nearestObject2.x, 2) + Math.pow(nearestObject1.y - nearestObject2.y, 2));
            return distance.toFixed(2);
        } else {
            return 0;
        }
    }

    objAngle(args, util) {
        let nearestObject1 = this.nearestHelper(args['OBJECT1'], util);
        let nearestObject2 = this.nearestHelper(args['OBJECT2'], util);
        if (nearestObject1 && nearestObject2) { // If nearest detections were found, return the angle between them
            const angle = Math.abs((Math.atan2((nearestObject2.y - nearestObject1.y), (nearestObject2.x - nearestObject1.x))) * (180 / Math.PI));
            if (angle > 180) {
                angle -= 180;
            }
            return `${angle.toFixed(2)}\u00B0`;
        } else {
            return 0;
        }
    }

    tfPositiontoScratch(position) {
        const column = position % 16;
        const row = Math.floor(position / 16); //16 since the 128 x 128 imageData is split into 256 squares, so there are 16 x 16 squares that comprise imageData

        const x = (column * 30) - 240 + 15; 
        //30 px is the square width in terms of Scratch's dimensions (480/16).
        //15 is the half-width of the square, centering the coordinate within the square.
        //240 is half of the Scratch coordinate system's total width (480), offsetting the coordinates by -240 since position 0 (leftmost) is -240.
        const y = 180 - (row * 22.5) - 11.25;
        // 22.5 px is the square height in terms of Scratch's dimensions (360/16).
        //11.25 is the half-height of the square, centering the coordinate within the square.
        //180 is half the Scratch coordinate system's total height (360), offsetting the coordinates by 180 since position 0 (topmost) is 180.
        return {x, y};
    }

    filterDetections(args) {
        let filtered = [];
        if (args === Object.BASKETBALL || args === Objects.BASKETBALL) {
            filtered = this.detections.filter(detection => detection.class === "Basketball");
        } else if (args === Object.RIM || args === Objects.RIM) {
            filtered = this.detections.filter(detection => detection.class === "Rim");
        } else {
            filtered = this.detections;
        }
        return filtered;
    }

    nearestHelper(args, util) {
        let nearestDetection = null;
        let nearestDistance = Infinity;
        let objects = this.filterDetections(args);
        if (objects.length != 0) {
            for (const object of objects) {
                const x = this.tfPositiontoScratch(object.position).x;
                const y = this.tfPositiontoScratch(object.position).y;

                // Calculate the distance from the current sprite position to the detection
                const spriteX = util.target.x; // Current sprite x position
                const spriteY = util.target.y; // Current sprite y position
                const distance = Math.sqrt(Math.pow(x - spriteX, 2) + Math.pow(y - spriteY, 2));

                // Update nearestDetection if this one is closer
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestDetection = { x, y }; // Store the coordinates of the nearest detection
                }
            }
            return nearestDetection;
        } else {
            return false;
        }
    }

    /**
     * A scratch command block handle that configures the video state from
     * passed arguments.
     * @param {object} args - the block arguments
     * @param {VideoState} args.VIDEO_STATE - the video state to set the device to
     */
    videoToggle (args) {
        const state = args.VIDEO_STATE;
        this.globalVideoState = state;
        if (state === VideoState.OFF) {
            this.runtime.ioDevices.video.disableVideo();
        } else {
            this.runtime.ioDevices.video.enableVideo();
            // Mirror if state is ON. Do not mirror if state is ON_FLIPPED.
            this.runtime.ioDevices.video.mirror = state === VideoState.ON;
        }
    }
    setPassLineVisibility (args) {
        const state = args.VISIBILITY;
        const renderer = this.runtime.renderer;
        const passLinesDrawableID = renderer.createDrawable(StageLayering.PEN_LAYER);
        if (this.skinID < 0) { //only create skinID once
            this.skinID = renderer.createPenSkin();
        }
        if (state === Visibility.SHOW) {
            const lines = [
                { startX: 0, startY: renderer._yTop, endX: 0, endY: renderer._yBottom }, //middle line
                { startX: renderer._xLeft + 20, startY: 203, endX: renderer._xLeft + 20, endY: -203 }, //left line, + 20 for visibility
                { startX: renderer._xRight - 20, startY: 203, endX: renderer._xRight - 20, endY: -203 } //right line, - 20 for visibility
            ];
            const lineProps =   { 
                color4f: [78 / 255, 42 / 255, 132 / 255, 1], //rgba(78, 42, 132, 1), in line with header
                diameter: 3
            }

            lines.forEach(line => {
                renderer.penLine(this.skinID, lineProps, line.startX, line.startY, line.endX, line.endY);
            });

            renderer.updateDrawableSkinId(passLinesDrawableID, this.skinID);
        } else {
            renderer.penClear(this.skinID);
        }
        this.runtime.requestRedraw();
    }

    /**
     * A scratch command block handle that configures the video preview's
     * transparency from passed arguments.
     * @param {object} args - the block arguments
     * @param {number} args.TRANSPARENCY - the transparency to set the video
     *   preview to
     */
    setVideoTransparency (args) {
        const transparency = Cast.toNumber(args.TRANSPARENCY);
        this.globalVideoTransparency = transparency;
        this.runtime.ioDevices.video.setPreviewGhost(transparency);
    }
    setDetectionRate(args) {
        const rate = Cast.toNumber(args.RATE);
        this.globalDetectionRate = rate;
    }
    setContinuousDetection(args) {
        const state = args.DETECTION;
        this.globalDetection = state;
        console.log("Model Detection switched " + this.globalDetection);
    }
}
module.exports = Scratch3BballDetectBlocks;