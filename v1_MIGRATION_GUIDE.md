# Migrating to Unleash Svelte SDK 1.0

This guide covers the changes to consider when upgrading to 1.0.

## Svelte requirements

Upgrade to Svelte 5.55.7 or newer. Existing component syntax and store-based hooks remain supported.

## Deferred startup

`startClient={false}` is now respected whether you pass `config` or `unleashClient`. Previously, clients created from `config` started regardless.

## Client shutdown

Providers now stop supplied clients when destroyed. For shared or externally managed clients, pass both `startClient={false}` and `stopClient={false}` and manage their lifecycle outside the provider.

## Error types

The `flagsError` store now has type `unknown`. Check the error's type before reading its properties.
