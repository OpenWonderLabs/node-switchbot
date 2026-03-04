# TODO Management

This folder tracks the implementation roadmap for achieving feature parity with pySwitchBot.

## Files

- **[todo.md](./todo.md)** - All pending implementation tasks organized by phase and priority
- **[completed.md](./completed.md)** - Completed tasks with dates and notes
- **[../PYSWITCHBOT_COMPARISON.md](../PYSWITCHBOT_COMPARISON.md)** - Full comparison analysis and detailed task specifications

## Workflow

### When Starting a Task
1. Pick a task from `todo.md` (preferably in priority order)
2. Create a branch for the task if needed
3. Implement the feature following the specifications in PYSWITCHBOT_COMPARISON.md

### When Completing a Task
1. Check the box in `todo.md`: `- [ ]` → `- [x]`
2. Cut the completed task from `todo.md`
3. Paste it into `completed.md` under the appropriate phase
4. Add completion date: `(Completed: YYYY-MM-DD)`
5. Add implementation notes if there were deviations or interesting details
6. Update "Last Updated" timestamp in both files
7. Commit both files together

### Example Completion Entry

```markdown
- [x] **Task 3.1**: Add speed parameter to curtain movement commands (Completed: 2026-03-15)
  - Implemented in `src/devices/wo-curtain.ts`
  - Added validation for speed range 1-255
  - Updated tests to cover speed parameter
  - PR: #123
```

## Task Organization

Tasks are organized by:

### Phase
- **Phase 1**: Critical Functionality (Q1 2026) - Core features needed immediately
- **Phase 2**: Command Enhancement (Q2 2026) - Additional commands and features
- **Phase 3**: New Devices (Q3 2026) - Support for new device types
- **Phase 4**: Advanced Features (Q4 2026) - Nice-to-have optimizations

### Priority
- **High Priority**: User-facing functionality, critical gaps
- **Medium Priority**: Enhancements, optimizations
- **Low Priority**: Nice-to-have features

## Current Status

Track overall progress:

- **Phase 0**: ✅ Complete (BLE infrastructure hardening)
- **Phase 1**: 🟡 In Progress
- **Phase 2**: ⏳ Not Started
- **Phase 3**: ⏳ Not Started
- **Phase 4**: ⏳ Not Started

## Quick Links

- [View Pending Tasks](./todo.md)
- [View Completed Tasks](./completed.md)
- [Full Comparison Document](../PYSWITCHBOT_COMPARISON.md)
- [pySwitchBot Repository](https://github.com/Danielhiversen/pySwitchbot)
- [SwitchBot BLE API](https://github.com/OpenWonderLabs/SwitchBotAPI-BLE)
