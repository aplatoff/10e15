# 10e15 Architecture Notes

## Introduction

This document outlines the implementation of a simple stream-oriented binary protocol for the 10e15 project.

## Pages and Chunks

10e15 maintains global logical time, which increase with every new toggle, so time is always increasing and determine global state of the system.

The system is divided into pages, each page is a array of chunks, where each chunk is an array of checkboxes. Size of chunk is 64k checkboxes (8KB), and size of page is configured.

Periodically the system fix the state of the page and persist it in the long-term storage. Everypage can be peristed separately from others, so last persistent state of a page may vary.

## Protocol

The protocol consists of specific message types designated for commands and responses.

### Command Messages

- 3 bytes: `RequestId` (range: 0x000000 - 0xFFFFFF)
- 1 byte: `CommandId` (range: 0x00 - 0xEF)
- Variable: Command-specific data (fixed length, determined by `CommandId`)

**Notes:**

- Commands must be acknowledged by the server. Each command message requires a corresponding response message from the server.
- The `RequestId` is utilized to match command messages to their respective responses. The server must copy the `RequestId` from the command packet to the response packet.
- Command packets can be broadcast to clients. In such cases, the `RequestId` can be any non-zero value and should be ignored.
- The server can send command packets to clients. In such cases, the `RequestId` must be set to 0x000000, and clients should not acknowledge these packets.

### Response Messages

**Error Message:**

- 3 bytes: `RequestId` (range: 0x000000 - 0xFFFFFF)
- 1 byte: `ErrorTag` (fixed: 0xFF)
- 4 bytes: `ErrorCode` / `Params` (range: 0x00000000 - 0xFFFFFFFF)

**Result Message:**

- 3 bytes: `RequestId` (range: 0x000000 - 0xFFFFFF)
- 1 byte: `CommandId` (range: 0xF0 - 0xFF)
- Variable: Result-specific data (fixed length, determined by the corresponding `CommandId`)

## Commands

### Command 0x00: Toggle Checkbox

**Request:**

- 4 bytes: Packet Header
- 4 bytes: Page Id (range: 0x00000000 - 0xFFFFFFFF)
- 4 bytes: Checkbox Offset (range: 0x00000000 - 0xFFFFFFFF)

**Response:** No response payload expected.

**Direction:** Client to Server, Server to Client

### Command 0x01: Request Page Data

**Request:**

- 4 bytes: Packet Header
- 4 bytes: Page Id (range: 0x00000000 - 0xFFFFFFFF)
- 4 bytes: Options (range: 0x00000000 - 0xFFFFFFFF)

Currently supported options:
- 0x00000000: Do not subscribe to checkbox updates
- 0x00000001: Subscribe to checkbox updates

This command initiate

**Response:** No response payload expected.

**Direction:** Client to Server

### Command 0x02: Page Chunk Content

**Request:**

- 4 bytes: Packet Header
- 4 bytes: Page Id (range: 0x00000000 - 0xFFFFFFFF)
- 4 bytes: Options (range: 0x00000000 - 0xFFFFFFFF)

Currently supported options:
- 0x00000000: Do not subscribe to page updates
- 0x00000001: Subscribe to page updates

**Response:** No response payload expected.

**Direction:** Server to Client
