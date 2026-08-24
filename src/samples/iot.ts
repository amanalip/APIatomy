export const IOT_SPEC = `openapi: 3.0.3
info:
  title: IoT Device Fleet API
  description: Device provisioning, telemetry ingestion and command control with map schemas and header and cookie params.
  version: 2.0.0
servers:
  - url: https://api.iot.example.com/{environment}
    variables:
      environment:
        default: prod
        enum: [prod, staging, dev]
        description: Deployment environment
tags:
  - name: devices
    description: Device registry
  - name: telemetry
    description: Time series ingestion
  - name: commands
    description: Remote device commands
paths:
  /devices:
    get:
      tags:
        - devices
      summary: List devices with map filter
      operationId: listDevices
      parameters:
        - name: tags
          in: query
          required: false
          schema:
            type: object
            additionalProperties:
              type: string
          style: deepObject
          explode: true
          description: Tag map filter like tags[location]=warehouse-1
        - name: status
          in: query
          schema:
            type: string
            enum: [online, offline, provisioning, error]
        - name: X-Request-Id
          in: header
          schema:
            type: string
            format: uuid
        - name: session
          in: cookie
          schema:
            type: string
      responses:
        '200':
          description: Device list
          content:
            application/json:
              schema:
                type: object
                required:
                  - devices
                properties:
                  devices:
                    type: array
                    items:
                      $ref: '#/components/schemas/Device'
    post:
      tags:
        - devices
      summary: Register a new device
      operationId: registerDevice
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DeviceCreate'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Device'
  /devices/{deviceId}/telemetry:
    post:
      tags:
        - telemetry
      summary: Ingest telemetry batch
      operationId: ingestTelemetry
      parameters:
        - name: deviceId
          in: path
          required: true
          schema:
            type: string
        - name: allowReserved
          in: query
          required: false
          schema:
            type: string
          allowReserved: true
          description: Reserved chars allowed in filter
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - readings
              properties:
                readings:
                  type: array
                  items:
                    $ref: '#/components/schemas/TelemetryReading'
      responses:
        '202':
          description: Accepted
        '400':
          description: Invalid reading
    get:
      tags:
        - telemetry
      summary: Query telemetry
      operationId: queryTelemetry
      parameters:
        - name: deviceId
          in: path
          required: true
          schema:
            type: string
        - name: from
          in: query
          schema:
            type: string
            format: date-time
        - name: to
          in: query
          schema:
            type: string
            format: date-time
        - name: fields
          in: query
          schema:
            type: array
            items:
              type: string
          style: form
          explode: false
      responses:
        '200':
          description: Readings
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/TelemetryReading'
  /devices/{deviceId}/commands/{commandId}:
    post:
      tags:
        - commands
      summary: Send command to device
      operationId: sendCommand
      parameters:
        - name: deviceId
          in: path
          required: true
          schema:
            type: string
        - name: commandId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Command'
      responses:
        '200':
          description: Command queued
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CommandStatus'
components:
  schemas:
    Device:
      type: object
      required:
        - id
        - name
        - model
        - status
      properties:
        id:
          type: string
          example: dev_a1b2c3
        name:
          type: string
          example: Warehouse Sensor 12
        model:
          type: string
          example: TX-1000
        status:
          type: string
          enum: [online, offline, provisioning, error]
        firmwareVersion:
          type: string
          example: 1.4.2
        metadata:
          type: object
          additionalProperties:
            type: string
          example:
            location: warehouse-1
            floor: "2"
        lastSeen:
          type: string
          format: date-time
    DeviceCreate:
      type: object
      required:
        - name
        - model
      properties:
        name:
          type: string
        model:
          type: string
        metadata:
          type: object
          additionalProperties:
            type: string
    TelemetryReading:
      type: object
      required:
        - timestamp
        - metric
        - value
      properties:
        timestamp:
          type: string
          format: date-time
        metric:
          type: string
          enum: [temperature, humidity, pressure, voltage]
          example: temperature
        value:
          type: number
          format: double
          example: 23.5
        unit:
          type: string
          example: celsius
        tags:
          type: object
          additionalProperties:
            type: string
    Command:
      type: object
      required:
        - type
      properties:
        type:
          type: string
          enum: [reboot, updateFirmware, calibrate]
        payload:
          type: object
          additionalProperties: true
    CommandStatus:
      type: object
      required:
        - commandId
        - status
      properties:
        commandId:
          type: string
          example: cmd_abc123
        status:
          type: string
          enum: [queued, sent, acknowledged, failed]
        executedAt:
          type: string
          format: date-time
          nullable: true
`;
