export const FINANCIAL_SPEC = `openapi: 3.0.3
info:
  title: Open Banking Accounts API
  description: Banking accounts and transactions with multiple auth schemes, idempotency and paginated statements.
  version: 3.0.0
servers:
  - url: https://api.bank.example.com/open-banking/v3
    description: Production
  - url: https://sandbox.bank.example.com/open-banking/v3
    description: Sandbox
tags:
  - name: accounts
    description: Account information
  - name: transactions
    description: Transaction listing and details
  - name: payments
    description: Payment initiation
security:
  - oauth2: [accounts]
  - bearerAuth: []
  - apiKeyAuth: []
paths:
  /accounts:
    get:
      tags:
        - accounts
      summary: List accounts
      operationId: listAccounts
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: pageSize
          in: query
          schema:
            type: integer
            default: 25
      responses:
        '200':
          description: Accounts
          content:
            application/json:
              schema:
                type: object
                required:
                  - data
                  - links
                  - meta
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Account'
                  links:
                    $ref: '#/components/schemas/Links'
                  meta:
                    $ref: '#/components/schemas/Meta'
  /accounts/{accountId}/transactions:
    get:
      tags:
        - transactions
      summary: List transactions for account
      operationId: listTransactions
      parameters:
        - name: accountId
          in: path
          required: true
          schema:
            type: string
        - name: fromDate
          in: query
          schema:
            type: string
            format: date
        - name: toDate
          in: query
          schema:
            type: string
            format: date
        - name: sort
          in: query
          schema:
            type: string
            enum: [bookingDateTime, amount]
            default: bookingDateTime
      responses:
        '200':
          description: Transactions
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
                      $ref: '#/components/schemas/Transaction'
  /payments:
    post:
      tags:
        - payments
      summary: Initiate a payment
      operationId: initiatePayment
      parameters:
        - name: Idempotency-Key
          in: header
          required: true
          schema:
            type: string
            format: uuid
          description: Idempotency key to safely retry
        - name: X-JWS-Signature
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PaymentRequest'
      responses:
        '201':
          description: Payment created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Payment'
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '429':
          description: Rate limited
      security:
        - oauth2: [payments]
components:
  schemas:
    Account:
      type: object
      required:
        - accountId
        - currency
        - nickname
        - accountType
      properties:
        accountId:
          type: string
          example: acc_5001
        currency:
          type: string
          example: GBP
        nickname:
          type: string
          example: Main Current
        accountType:
          type: string
          enum: [Personal, Business]
        balance:
          type: object
          required:
            - amount
            - currency
          properties:
            amount:
              type: string
              example: "1250.00"
            currency:
              type: string
              example: GBP
    Transaction:
      type: object
      required:
        - transactionId
        - bookingDateTime
        - amount
        - creditDebitIndicator
      properties:
        transactionId:
          type: string
          example: txn_9a8b7c
        bookingDateTime:
          type: string
          format: date-time
        amount:
          type: object
          required:
            - amount
            - currency
          properties:
            amount:
              type: string
              example: "42.50"
            currency:
              type: string
              example: GBP
        creditDebitIndicator:
          type: string
          enum: [Credit, Debit]
        merchantName:
          type: string
          example: Tesco
        proprietaryBankTransactionCode:
          type: string
          nullable: true
    PaymentRequest:
      type: object
      required:
        - instructedAmount
        - debtorAccount
        - creditorAccount
      properties:
        instructedAmount:
          type: object
          required:
            - amount
            - currency
          properties:
            amount:
              type: string
              example: "100.00"
            currency:
              type: string
              example: GBP
        debtorAccount:
          $ref: '#/components/schemas/AccountRef'
        creditorAccount:
          $ref: '#/components/schemas/AccountRef'
        remittanceInformation:
          type: string
          example: Invoice 1234
    Payment:
      type: object
      required:
        - paymentId
        - status
        - creationDateTime
      properties:
        paymentId:
          type: string
          example: pay_abc123
        status:
          type: string
          enum: [AcceptedSettlementInProcess, AcceptedSettlementCompleted, Rejected]
        creationDateTime:
          type: string
          format: date-time
    AccountRef:
      type: object
      required:
        - schemeName
        - identification
      properties:
        schemeName:
          type: string
          enum: [UK.OBIE.SortCodeAccountNumber, UK.OBIE.IBAN]
        identification:
          type: string
          example: "40839012345678"
        name:
          type: string
          example: John Doe
    Links:
      type: object
      properties:
        self:
          type: string
          format: uri
        next:
          type: string
          format: uri
          nullable: true
    Meta:
      type: object
      required:
        - totalPages
      properties:
        totalPages:
          type: integer
          example: 3
    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
          example: UK.OBIE.Field.Missing
        message:
          type: string
          example: Missing mandatory field
  securitySchemes:
    oauth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.bank.example.com/authorize
          tokenUrl: https://auth.bank.example.com/token
          scopes:
            accounts: Read accounts
            payments: Initiate payments
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    apiKeyAuth:
      type: apiKey
      name: x-api-key
      in: header
`;
