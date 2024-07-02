# One Quadrillion Checkboxes (1,000,000,000,000,000)

https://onequadrillioncheckboxes.com/

## Architecture Notes

This document outlines the implementation of a simple stream-oriented binary protocol for the 10e15 project.

## Pages and Chunks

10e15 maintains global logical time, which increase with every new toggle, so time is always increasing and determine global state of the system.

The system is divided into pages, each page is a array of chunks, where each chunk is an array of checkboxes. Size of chunk is 64k checkboxes (8KB), and size of page is configured.

Periodically the system fix the state of the page and persist it in the long-term storage. Everypage can be peristed separately from others, so last persistent state of a page may vary

Persistent state distributed over HTTPS protocol, immutable, and can be cached by CDN, and locally. So we should not update persistent state frequently.

## Protocol

The protocol consists of specific message types designated for commands and responses.

### Request Messages

- 1 byte: `CommandId` (range: 0x00 - 0x7F)
- 3 bytes: `RequestId`
- Variable: Command-specific data (fixed length, determined by `CommandId`)

**Notes:**

Request Messages always go from clients to server. The `CommandId` is used to determine the type of command and the corresponding data format. The `RequestId` is used to match command messages to their respective responses.

### Update Messages (Notifications)

- 1 byte: `UpdateId` (range: 0x80 - 0xEF)
- 3 bytes: `Align` -- can be used for any payload
- Variable: Command-specific data (fixed length, determined by `UpdateId`)

**Notes:**

Update Messages always go from server to clients. The `UpdateId` is used to determine the type of update and the corresponding data format.

### Response Messages

**Result Message:**

- 1 byte: `ResultTag` == 0xFE
- 3 bytes: `RequestId`
- Variable: Result-specific data (fixed length, determined by the corresponding `CommandId`)

**Error Message:**

- 1 byte: `ErrorTag` == 0xFF
- 3 bytes: `RequestId`
- 4 bytes: `ErrorCode` / `Params`


## Commands

### Command 0x00: Toggle Checkbox

**Request:**

- 4 bytes: Header
- 4 bytes: Page Id
- 4 bytes: Offset

**Response:**
- 8 bytes: Global Time describing state of the system after this toggle applied

### Command 0x01: Request Page Data

**Request:**

- 4 bytes: Packet Header
- 4 bytes: Page Id
- 8 bytes: Global Time -- last know data at given time, 0 if no data is known

This command initiate data transfer from server to client. Data will be transferred both over websocket and over HTTP for persistent state of the page.

**Response:**

- 8 bytes: last saved global time for given page. Client can initiate download of persistent state of the page from this time.


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
