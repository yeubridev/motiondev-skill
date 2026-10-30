# Phase 2: a macOS notch app

What is possible for a native Mac companion that shows the same pictograms under the camera housing ("the island"), and the plan to get there. Nothing here is built yet; v0.1 ships the event stream the app will read.

## What macOS allows

There is no public Dynamic Island API on macOS. Every "notch app" (boring.notch, NotchNook, NotchDrop, Dynamic Notch) is an ordinary window dressed to look like part of the housing:

- an `NSPanel`, borderless, non-activating, transparent background, level `.statusBar` or `.floating`, `collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]` so it stays over full-screen apps;
- positioned at the top center of `NSScreen.main`, its width read from `NSScreen.auxiliaryTopLeftArea` / `auxiliaryTopRightArea` (macOS 12+) so the panel hugs the notch; on a Mac without a notch it becomes a small pill at the top center;
- SwiftUI inside, expanding on hover or on an event with `withAnimation`, collapsing after a delay;
- a `MenuBarExtra` for settings and quit, `LSUIElement = true` so there is no Dock icon.

Requirements: macOS 13+ (SF Symbols 4 effects need 14+), Swift 5.9, Xcode or SwiftPM. No private API, so it can be notarized and distributed as a zip or a Homebrew cask.

## What it reads

The same file the terminal watcher follows: `~/.motiondev/events.jsonl`, one JSON object per line (see `docs/superpowers/specs/2026-10-30-motiondev-design.md`, "Event protocol"). The app:

1. opens the file and reads it from the start of the last `session start` line;
2. watches it with `DispatchSource.makeFileSystemObjectSource(fileDescriptor:eventMask: [.write, .extend])` and reads the appended bytes;
3. folds events with a Swift port of `lib/events.mjs`'s `reduce` (about 60 lines: current scene, shelf, ticker, running);
4. nothing else: no sockets, no permissions, no network.

Because the hooks write the file whatever the surface, the app works with Claude Code in a terminal, in the desktop app, in VS Code, and with any other agent that writes the same lines.

## What it shows

| scene | SF Symbol | effect |
|---|---|---|
| database | `cylinder.split.1x2` | `.symbolEffect(.bounce)` when a table lands |
| api | `server.rack` | arrows drawn with `arrow.right` fading in |
| frontend | `macwindow` | `.bounce` |
| tests | `testtube.2` | `.variableColor.iterative` while running, green `checkmark.seal` / red `xmark.seal` after |
| git | `arrow.triangle.branch` | `.pulse` on commit |
| deps | `shippingbox` | `.bounce` |
| infra | `shippingbox.circle` | `.pulse` |
| config | `gearshape` | rotate once |
| docs | `doc.text` | |
| auth | `lock` | `lock.open` to `lock` |
| build | `hammer` | `.pulse` while running |
| agents | `person.2` | `.pulse` |
| explore | `magnifyingglass` | small, in the ticker only |
| think | `lightbulb` | `.pulse` |
| code | `curlybraces` | |
| idle | `moon.zzz` | |

Collapsed: the scene symbol and the object name (`▤ users`) beside the notch, tinted with the scene color (the hex palette in `lib/pictograms.mjs`, `sceneHex`). Expanded (hover, or for 2 s after a major event): the pictogram, the caption, the shelf of built objects as small symbols, and the last five ticker lines.

## Plan

- **2a, one day.** SwiftPM executable: panel under the notch, file watcher, reducer port, scene symbol and name. Ships as a zip.
- **2b, one day.** Expand and collapse, symbol effects, shelf, ticker, scene colors.
- **2c, half a day.** Menu bar extra (show or hide, choose the file, launch at login), notarized build in CI.

## Cheaper routes, if the notch is not worth it

- A `MenuBarExtra` only: the status line (`motiondev status`) in the menu bar, the expanded view in its popover. Same code minus the panel geometry.
- A SwiftBar or xbar script running `node <plugin>/bin/motiondev.mjs status` every second: zero Swift.
- Nothing native: the terminal watcher in a narrow always-on-top terminal window.

## Risks

- Notch geometry on external displays and on Macs without a notch: fall back to a pill at the top center.
- Full-screen apps and Stage Manager hide floating panels unless the collection behavior above is set.
- Notarization needs an Apple Developer account; without it users right-click and Open once.

## Decision needed

Notch panel (2a to 2c), menu bar only, or both. The event stream is the same either way.
