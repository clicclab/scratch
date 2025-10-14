import { legacy } from "$common";
export const info = {
  "id": "bballDetect",
  "name": "Sport Finder",
  "showStatusButton": true,
  "blocks": [
    {
      "opcode": "setContinuousDetection",
      "text": "turn continuous detection [DETECTION]",
      "blockType": "command",
      "arguments": {
        "DETECTION": {
          "type": "string",
          "menu": "DETECTION",
          "defaultValue": "on"
        }
      }
    },
    {
      "opcode": "setPassLineVisibility",
      "text": "[VISIBILITY] pass lines",
      "blockType": "command",
      "arguments": {
        "VISIBILITY": {
          "type": "string",
          "menu": "VISIBILITY",
          "defaultValue": "show"
        }
      }
    },
    {
      "opcode": "goToNearestObject",
      "text": "go to nearest [OBJECT]",
      "blockType": "command",
      "arguments": {
        "OBJECT": {
          "type": "string",
          "menu": "OBJECT",
          "defaultValue": "basketball"
        }
      }
    },
    {
      "opcode": "setDetectionRate",
      "text": "set detection rate to [RATE] ms",
      "blockType": "command",
      "arguments": {
        "RATE": {
          "type": "number",
          "defaultValue": 1
        }
      }
    },
    {
      "opcode": "clearAllDetections",
      "text": "clear all detections",
      "blockType": "command"
    },
    {
      "opcode": "ifEvent",
      "text": "[EVENT] detected",
      "blockType": "Boolean",
      "arguments": {
        "EVENT": {
          "type": "string",
          "menu": "EVENT",
          "defaultValue": "basketball"
        }
      }
    },
    {
      "opcode": "currObjs",
      "text": "current [OBJECTS] detected",
      "blockType": "reporter",
      "arguments": {
        "OBJECTS": {
          "type": "string",
          "menu": "OBJECTS",
          "defaultValue": "basketballs"
        }
      }
    },
    {
      "opcode": "numDetected",
      "text": "number of [OBJECTS] detected",
      "blockType": "reporter",
      "arguments": {
        "OBJECTS": {
          "type": "string",
          "menu": "OBJECTS",
          "defaultValue": "basketballs"
        }
      }
    },
    {
      "opcode": "objectsPos",
      "text": "[AXIS] positions of [OBJECTS]",
      "blockType": "reporter",
      "arguments": {
        "AXIS": {
          "type": "string",
          "menu": "AXIS",
          "defaultValue": "x"
        },
        "OBJECTS": {
          "type": "string",
          "menu": "OBJECTS",
          "defaultValue": "basketballs"
        }
      }
    },
    {
      "opcode": "nearestCoords",
      "text": "(x, y) coordinates of nearest [OBJECT]",
      "blockType": "reporter",
      "arguments": {
        "OBJECT": {
          "type": "string",
          "menu": "OBJECT",
          "defaultValue": "basketball"
        }
      }
    },
    {
      "opcode": "nearestPos",
      "text": "[AXIS] position of nearest [OBJECT]",
      "blockType": "reporter",
      "arguments": {
        "AXIS": {
          "type": "string",
          "menu": "AXIS",
          "defaultValue": "x"
        },
        "OBJECT": {
          "type": "string",
          "menu": "OBJECT",
          "defaultValue": "basketball"
        }
      }
    },
    {
      "opcode": "objDist",
      "text": "distance between nearest [OBJECT1] and [OBJECT2]",
      "blockType": "reporter",
      "arguments": {
        "OBJECT1": {
          "type": "string",
          "menu": "OBJECT",
          "defaultValue": "basketball"
        },
        "OBJECT2": {
          "type": "string",
          "menu": "OBJECT",
          "defaultValue": "rim"
        }
      }
    },
    {
      "opcode": "objAngle",
      "text": "acute angle between nearest [OBJECT1] and [OBJECT2]",
      "blockType": "reporter",
      "arguments": {
        "OBJECT1": {
          "type": "string",
          "menu": "OBJECT",
          "defaultValue": "basketball"
        },
        "OBJECT2": {
          "type": "string",
          "menu": "OBJECT",
          "defaultValue": "rim"
        }
      }
    },
    {
      "opcode": "videoToggle",
      "text": "turn video [VIDEO_STATE]",
      "blockType": "command",
      "arguments": {
        "VIDEO_STATE": {
          "type": "string",
          "menu": "VIDEO_STATE",
          "defaultValue": "off"
        }
      }
    },
    {
      "opcode": "setVideoTransparency",
      "text": "set video transparency to [TRANSPARENCY]%",
      "blockType": "command",
      "arguments": {
        "TRANSPARENCY": {
          "type": "number",
          "defaultValue": 50
        }
      }
    }
  ],
  "menus": {
    "VIDEO_STATE": {
      "acceptReporters": true,
      "items": [{ "text": "off", "value": "off" }, { "text": "on", "value": "on" }, { "text": "on flipped", "value": "on-flipped" }]
    },
    "VISIBILITY": {
      "acceptReporters": true,
      "items": [{ "text": "show", "value": "show" }, { "text": "hide", "value": "hide" }]
    },
    "DETECTION": {
      "acceptReporters": true,
      "items": [{ "text": "on", "value": "on" }, { "text": "off", "value": "off" }]
    },
    "OBJECTS": {
      "acceptReporters": true,
      "items": [{ "text": "basketballs", "value": "basketballs" }, { "text": "rims", "value": "rims" }]
    },
    "OBJECT": {
      "acceptReporters": true,
      "items": [{ "text": "basketball", "value": "basketball" }, { "text": "rim", "value": "rim" }]
    },
    "EVENT": {
      "acceptReporters": true,
      "items": [{ "text": "basketball", "value": "basketball" }, { "text": "rim", "value": "rim" }, { "text": "pass", "value": "pass" }]
    },
    "AXIS": {
      "acceptReporters": true,
      "items": [{ "text": "x", "value": "x" }, { "text": "y", "value": "y" }]
    }
  }
} as const;

export const legacyFullSupport = legacy(info);
export const legacyIncrementalSupport = legacy(info, { "incrementalDevelopment": true });