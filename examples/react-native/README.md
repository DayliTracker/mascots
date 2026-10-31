# React Native reference animator

`PixelPet.tsx` is a reference implementation of the mascot animator contract
from [`skills/mascot/references/app-integration.md`](../../skills/mascot/references/app-integration.md):
mood state machine, frame swaps, and transform-driven bob/tilt/squash using
only core `Animated` (`useNativeDriver: true`) — no extra dependencies.

It is **not** part of the installed skill — the skill ships art only (frames +
`manifest.json`), and animation is the target app's job. Copy this file into
your app if it fits, or use it as the spec for writing an animator in any
other framework (the contract and per-framework notes are in
`app-integration.md`).
