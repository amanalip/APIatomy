export const SWAGGER_LEGACY_SPEC = `swagger: "2.0"
info:
  title: Legacy Swagger 2.0 File Service
  description: Swagger 2.0 style spec with host, basePath, schemes, collectionFormat, file upload and OAuth2 implicit flow.
  version: 1.0.0
host: api.legacy-files.example.com
basePath: /v1
schemes:
  - https
  - http
consumes:
  - application/json
  - multipart/form-data
produces:
  - application/json
tags:
  - name: files
    description: File upload and download operations
  - name: users
    description: User management with legacy auth
paths:
  /users/{userId}/files:
    get:
      tags:
        - files
      summary: List files for a user
      operationId: listUserFiles
      parameters:
        - name: userId
          in: path
          required: true
          type: integer
          format: int64
        - name: tags
          in: query
          required: false
          type: array
          items:
            type: string
          collectionFormat: csv
        - name: status
          in: query
          required: false
          type: array
          items:
            type: string
            enum: [active, archived, pending]
          collectionFormat: multi
      responses:
        200:
          description: Array of files
          schema:
            type: array
            items:
              $ref: '#/definitions/FileMeta'
        400:
          description: Invalid query
      security:
        - oauth_legacy:
          - files:read
  /files/upload:
    post:
      tags:
        - files
      summary: Upload a file with metadata
      operationId: uploadFile
      consumes:
        - multipart/form-data
      parameters:
        - name: file
          in: formData
          required: true
          type: file
          description: File to upload
        - name: description
          in: formData
          required: false
          type: string
        - name: tags
          in: formData
          required: false
          type: array
          items:
            type: string
          collectionFormat: csv
      responses:
        201:
          description: File created
          schema:
            $ref: '#/definitions/FileMeta'
        400:
          description: Missing file
      security:
        - oauth_legacy:
          - files:write
  /files/{fileId}:
    get:
      tags:
        - files
      summary: Download a file by ID
      operationId: downloadFile
      parameters:
        - name: fileId
          in: path
          required: true
          type: string
        - name: api_key
          in: header
          required: false
          type: string
      responses:
        200:
          description: File content
          schema:
            type: file
        404:
          description: Not found
definitions:
  FileMeta:
    type: object
    required:
      - id
      - name
      - size
    properties:
      id:
        type: string
        example: file_9a8b7c6d
      name:
        type: string
        example: report.pdf
      size:
        type: integer
        format: int64
        example: 2048576
      mimeType:
        type: string
        example: application/pdf
      tags:
        type: array
        items:
          type: string
        example: [invoice, 2024]
      createdAt:
        type: string
        format: date-time
securityDefinitions:
  oauth_legacy:
    type: oauth2
    flow: implicit
    authorizationUrl: https://legacy.example.com/oauth/authorize
    scopes:
      files:read: Read files
      files:write: Write files
  api_key:
    type: apiKey
    name: api_key
    in: header
`;
