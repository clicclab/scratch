import { legacy } from "$common";

export const info = {
  "id": "gameball",
  "name": "Play Impossible Gameball",
  "showStatusButton": true,
  "blocks": [
    {
      "opcode": "readAccel",
      "blockType": "reporter",
      "text": "read accel [ACC_NUM] [ACC_AXES]",
      "arguments": {
        "ACC_NUM": {
          "type": "string",
          "menu": "ACC_NUM",
          "defaultValue": "1"
        },
        "ACC_AXES": {
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
    "ACC_NUM": {
        "acceptReporters": false,
        "items": [
            {"text": "1", "value": "1"},
            {"text": "2", "value": "2"}
        ]
    },
    "ACC_AXES": {
        "acceptReporters": false,
        "items": [
            {"text": "x", "value": "x"},
            {"text": "y", "value": "y"},
            {"text": "z", "value": "z"},
            {"text": "strength", "value": "strength"}
        ]
    },
    "GBS_CONNECTED": "getConnectedGameballs",
    "THRESH_OPTIONS": {
      "acceptReporters": true,
      "items": [
        {"text": "low", "value": "low"},
        {"text": "medium", "value": "medium"},
        {"text": "high", "value": "high"}
      ]
    },
  }
} as const;

export const legacyFullSupport = legacy(info);
export const legacyIncrementalSupport = legacy(info, { "incrementalDevelopment": true });