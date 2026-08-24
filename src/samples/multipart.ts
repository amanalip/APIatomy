export const MULTIPART_SPEC = `openapi: 3.0.3
info:
  title: File and Multipart Upload API
  description: Demonstrates multipart form data, urlencoded, binary, byte and file array handling with content encoding.
  version: 1.4.0
servers:
  - url: https://api.upload.example.com/v1
tags:
  - name: uploads
    description: Upload operations
paths:
  /upload/single:
    post:
      tags:
        - uploads
      summary: Upload single file with binary
      operationId: uploadSingle
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - file
              properties:
                file:
                  type: string
                  format: binary
                  description: Binary file content
                description:
                  type: string
                  example: Profile photo
                tags:
                  type: array
                  items:
                    type: string
      responses:
        '201':
          description: Uploaded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UploadResult'
  /upload/multiple:
    post:
      tags:
        - uploads
      summary: Upload multiple files
      operationId: uploadMultiple
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - files
              properties:
                files:
                  type: array
                  items:
                    type: string
                    format: binary
                category:
                  type: string
                  enum: [avatar, document, media]
                  default: document
      responses:
        '201':
          description: Multiple uploaded
          content:
            application/json:
              schema:
                type: object
                required:
                  - results
                properties:
                  results:
                    type: array
                    items:
                      $ref: '#/components/schemas/UploadResult'
  /upload/urlencoded:
    post:
      tags:
        - uploads
      summary: Submit urlencoded form
      operationId: submitForm
      requestBody:
        required: true
        content:
          application/x-www-form-urlencoded:
            schema:
              type: object
              required:
                - username
                - email
              properties:
                username:
                  type: string
                  example: alice
                email:
                  type: string
                  format: email
                  example: alice@example.com
                age:
                  type: integer
                  minimum: 0
                  example: 28
                newsletter:
                  type: boolean
                  default: true
      responses:
        '200':
          description: Form accepted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FormAck'
  /files/{fileId}/content:
    get:
      tags:
        - uploads
      summary: Download file content
      operationId: downloadContent
      parameters:
        - name: fileId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Binary content
          content:
            image/png:
              schema:
                type: string
                format: binary
            application/pdf:
              schema:
                type: string
                format: binary
        '404':
          description: Not found
    put:
      tags:
        - uploads
      summary: Replace file content via octet stream
      operationId: replaceContent
      parameters:
        - name: fileId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/octet-stream:
            schema:
              type: string
              format: binary
      responses:
        '200':
          description: Replaced
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UploadResult'
components:
  schemas:
    UploadResult:
      type: object
      required:
        - id
        - filename
        - size
        - contentType
      properties:
        id:
          type: string
          example: upl_9f8e7d
        filename:
          type: string
          example: photo.png
        size:
          type: integer
          format: int64
          example: 102400
        contentType:
          type: string
          example: image/png
        checksum:
          type: string
          format: byte
          description: Base64 encoded checksum
          example: YWJjMTIz
        url:
          type: string
          format: uri
          example: https://cdn.example.com/files/photo.png
    FormAck:
      type: object
      required:
        - success
        - message
      properties:
        success:
          type: boolean
          example: true
        message:
          type: string
          example: Form submitted
        receivedAt:
          type: string
          format: date-time
`;
