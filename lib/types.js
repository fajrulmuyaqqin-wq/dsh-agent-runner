// OpenDesign Runtime Type Contracts for External Agent CLIs

export const RUN_STATUS = {
  IDLE: 'idle',
  STARTING: 'starting',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELED: 'canceled'
};

export const EVENT_TYPE = {
  STATUS: 'status',
  TEXT_DELTA: 'text_delta',
  THINKING_DELTA: 'thinking_delta',
  TOOL_USE: 'tool_use',
  TOOL_RESULT: 'tool_result',
  USAGE: 'usage',
  ERROR: 'error',
  DONE: 'done'
};
