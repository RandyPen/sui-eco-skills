# Move Modules Reference

Based on the official Cetus DLMM README and actual source code in `packages/dlmm/sources/`.

## Core Modules

The Cetus DLMM protocol consists of 15 Move modules:

1. **`pool.move`** - Main pool functionality handling swaps, liquidity management, and position operations
2. **`position.move`** - Position management for liquidity providers with fee collection and reward distribution
3. **`bin.move`** - Bin management system for organizing liquidity across price ranges
4. **`registry.move`** - Global pool registry for creating and tracking all pools
5. **`config.move`** - Global configuration management with access control and restrictions
6. **`reward.move`** - Reward distribution and management system
7. **`partner.move`** - Partner fee management and tracking
8. **`restriction.move`** - User and position blocking with operation-level restrictions
9. **`acl.move`** - Access Control List implementation for permission management
10. **`admin_cap.move`** - Administrative capabilities and permissions
11. **`parameters.move`** - Variable parameter management for pools
12. **`dlmm_math.move`** - Mathematical utilities for price calculations and liquidity management
13. **`price_math.move`** - Price calculation utilities
14. **`versioned.move`** - Version management and upgrade mechanisms
15. **`constants.move`** - Protocol constants and configuration values (implemented as macros)

## Key Notes

- **Move 2024 Edition**: The codebase uses Move 2024 edition features
- **Constants as Macros**: Protocol constants are defined as macros (e.g., `fee_precision()`, `max_fee_rate()`)
- **Error Handling**: Error constants follow `EPascalCase` naming convention
- **Module Structure**: Uses modern module label syntax

## Source Code Location

All Move modules are located in `packages/dlmm/sources/`.

For the most accurate and up-to-date information, always refer to the actual source files.