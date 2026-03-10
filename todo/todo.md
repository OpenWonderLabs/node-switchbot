# SwitchBot Module TODO List

- [ ] **Unified BLE-first/API-fallback Logic**: Centralize fallback logic, allow user configuration, and document clearly.
    - [ ] Centralize fallback logic in the base device class (e.g., a withFallback helper or unified command/status runner).
    - [ ] Ensure all device classes use this centralized logic for all BLE/API-capable operations.
    - [ ] Respect user configuration (enableFallback, preferredConnection) everywhere.
    - [ ] Add clear documentation/examples for configuring fallback and customizing connection order.
    - [ ] Add TypeDoc comments to the base logic and update the README to explain fallback behavior and configuration.
- [ ] **Error Handling & Reporting**: Standardize error types/messages, use custom error classes, and document error codes.
- [ ] **Test Coverage & Quality**: Add tests for all device types, fallback logic, and error scenarios using mocks.
- [ ] **Documentation & Examples**: Expand device support matrix, advanced usage, and TypeDoc comments; add more real-world examples.
- [ ] **API Consistency & Usability**: Unify method signatures, naming, and async usage; deprecate ambiguous APIs.
- [ ] **Configuration & Environment Detection**: Improve auto-detection and user overrides for BLE/API, adapters, and timeouts.
- [ ] **Type Safety & Linting**: Enforce strict TypeScript and linting in CI.
- [ ] **Advanced Features**: Add event-driven updates, batch/group operations, and a plugin system for custom logic.
