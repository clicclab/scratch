import { legacy } from "$common";

export const info = {
  "id": "gameball",
  "name": "Play Impossible Gameball",
  "showStatusButton": true,
  "blocks": [
    {
      "opcode": "connectButton",
      "blockType": "button",
      "text": "Connect Gameball"
    },
    {
      "opcode": "readAccel",
      "blockType": "reporter",
      "text": "read accel [NUMBER] [AXIS]",
      "arguments": {
        "NUMBER": {
          "type": "string",
          "menu": "ACC_NUM",
          "defaultValue": "1"
        },
        "AXIS": {
          "type": "string",
          "menu": "ACC_AXES",
          "defaultValue": "x"
        }
      }
    },
    {
      "opcode": "readMultiAccel",
      "blockType": "reporter",
      "text": "acceleration [GAMEBALL] [NUMBER] [AXIS]",
      "arguments": {
        "GAMEBALL": {
          "type": "string",
          "menu": "GBS_CONNECTED",
          "defaultValue": "---"
        },
        "NUMBER": {
          "type": "string",
          "menu": "ACC_NUM",
          "defaultValue": "1"
        },
        "AXIS": {
          "type": "string",
          "menu": "ACC_AXES",
          "defaultValue": "x"
        }
      }
    },
    {
      "opcode": "setThreshold",
      "blockType": "command",
      "text": "set sensitivity [GAMEBALL] [OPTION]",
      "arguments": {
        "GAMEBALL": {
          "type": "string",
          "menu": "GBS_CONNECTED",
          "defaultValue": "---"
        },
        "OPTION": {
          "type": "string",
          "menu": "THRESH_OPTIONS",
          "defaultValue": "medium"
        }
      }
    }
  ],
  "menus": {
    "GBS_CONNECTED": "getConnectedGameballs",
    "ACC_NUM": {
      "acceptReporters": true,
      "items": ["1", "2"]
    },
    "ACC_AXES": {
      "acceptReporters": true,
      "items": ["x", "y", "z", "strength"]
    },
    "THRESH_OPTIONS": {
      "acceptReporters": true,
      "items": ["low", "medium", "high"]
    }
  }
} as const;

export const legacyFullSupport = legacy(info);