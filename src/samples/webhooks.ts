export const WEBHOOKS_SPEC = `openapi: 3.1.0
info:
  title: Webhooks and Callbacks API
  description: OpenAPI 3.1 spec showcasing webhooks, callbacks, binary payloads and json schema 2020-12 features.
  version: 1.2.0
servers:
  - url: https://api.events.example.com/v1
    description: Events production
  - url: https://staging.events.example.com/v1
    description: Staging
tags:
  - name: subscriptions
    description: Webhook subscriptions
  - name: events
    description: Event delivery
paths:
  /subscriptions:
    post:
      tags:
        - subscriptions
      summary: Create a webhook subscription
      operationId: createSubscription
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SubscriptionCreate'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Subscription'
      callbacks:
        eventDelivered:
          '{$request.body#/callbackUrl}':
            post:
              summary: Event delivered callback
              requestBody:
                required: true
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/Event'
              responses:
                '200':
                  description: Callback acknowledged
    get:
      tags:
        - subscriptions
      summary: List subscriptions
      operationId: listSubscriptions
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: cursor
          in: query
          schema:
            type: string
      responses:
        '200':
          description: List
          content:
            application/json:
              schema:
                type: object
                required:
                  - data
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Subscription'
                  nextCursor:
                    type: string
                    nullable: true
webhooks:
  orderShipped:
    post:
      summary: Order shipped event
      description: Sent when an order is shipped to the subscriber URL
      operationId: orderShippedWebhook
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Event'
      responses:
        '200':
          description: Webhook acknowledged
  paymentFailed:
    post:
      summary: Payment failed event
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PaymentFailedEvent'
      responses:
        '200':
          description: Acknowledged
components:
  schemas:
    SubscriptionCreate:
      type: object
      required:
        - callbackUrl
        - events
      properties:
        callbackUrl:
          type: string
          format: uri
          example: https://myapp.example.com/webhooks
        events:
          type: array
          items:
            type: string
            enum: [order.shipped, payment.failed, user.created]
          example: [order.shipped]
        secret:
          type: string
          format: byte
          description: Base64 encoded webhook secret
        active:
          type: boolean
          default: true
    Subscription:
      allOf:
        - $ref: '#/components/schemas/SubscriptionCreate'
        - type: object
          required:
            - id
            - createdAt
          properties:
            id:
              type: string
              example: sub_1a2b3c
            createdAt:
              type: string
              format: date-time
            status:
              type: string
              enum: [active, paused, disabled]
              default: active
    Event:
      type: object
      required:
        - id
        - type
        - created
        - data
      properties:
        id:
          type: string
          example: evt_9f8e7d
        type:
          type: string
          example: order.shipped
        created:
          type: integer
          format: int64
          example: 1710000000
        data:
          type: object
          additionalProperties: true
          properties:
            orderId:
              type: string
              example: ord_123
        payloadBinary:
          type: string
          contentMediaType: application/octet-stream
          contentEncoding: base64
    PaymentFailedEvent:
      type: object
      required:
        - id
        - amount
        - currency
        - reason
      properties:
        id:
          type: string
          example: evt_pay_fail_1
        amount:
          type: integer
          example: 5000
        currency:
          type: string
          example: usd
        reason:
          type: string
          enum: [insufficient_funds, card_declined, expired_card]
        retryable:
          type: boolean
          default: false
`;
