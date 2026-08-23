export const GITHUB_SPEC = `openapi: 3.0.3
info:
  title: GitHub REST API (Subset)
  description: A curated subset of GitHub's REST API covering Repositories, Issues, and Users.
  version: 1.1.4
servers:
  - url: https://api.github.com
    description: GitHub Public API
paths:
  /repos/{owner}/{repo}:
    get:
      tags:
        - Repositories
      summary: Get a repository
      description: Returns repository details, metadata, owner info, and clone URLs.
      operationId: repos/get
      parameters:
        - name: owner
          in: path
          required: true
          schema:
            type: string
          description: The account owner of the repository.
        - name: repo
          in: path
          required: true
          schema:
            type: string
          description: The name of the repository.
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Repository'
        '404':
          description: Resource not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BasicError'

  /repos/{owner}/{repo}/issues:
    get:
      tags:
        - Issues
      summary: List repository issues
      description: List issues in a repository with state filtering and pagination.
      operationId: issues/list-for-repo
      parameters:
        - name: owner
          in: path
          required: true
          schema:
            type: string
        - name: repo
          in: path
          required: true
          schema:
            type: string
        - name: state
          in: query
          required: false
          schema:
            type: string
            enum: [open, closed, all]
            default: open
        - name: per_page
          in: query
          required: false
          schema:
            type: integer
            default: 30
        - name: page
          in: query
          required: false
          schema:
            type: integer
            default: 1
      responses:
        '200':
          description: List of issues
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Issue'
        '404':
          description: Not Found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BasicError'
    post:
      tags:
        - Issues
      summary: Create an issue
      description: Creates a new issue in a repository.
      operationId: issues/create
      parameters:
        - name: owner
          in: path
          required: true
          schema:
            type: string
        - name: repo
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/IssueRequest'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Issue'
        '422':
          description: Validation failed

  /users/{username}:
    get:
      tags:
        - Users
      summary: Get a user
      description: Provides publicly available information about someone with a GitHub account.
      operationId: users/get-by-username
      parameters:
        - name: username
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: User profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: Resource not found

components:
  schemas:
    User:
      type: object
      required:
        - login
        - id
      properties:
        id:
          type: integer
          example: 1
        login:
          type: string
          example: octocat
        avatar_url:
          type: string
          format: uri
        html_url:
          type: string
          format: uri
        type:
          type: string
          example: User
        site_admin:
          type: boolean

    Repository:
      type: object
      required:
        - id
        - name
        - full_name
        - owner
      properties:
        id:
          type: integer
          example: 1296269
        name:
          type: string
          example: Hello-World
        full_name:
          type: string
          example: octocat/Hello-World
        private:
          type: boolean
        owner:
          $ref: '#/components/schemas/User'
        html_url:
          type: string
          format: uri
        description:
          type: string
          example: This your first repo!
        stargazers_count:
          type: integer
          example: 80
        watchers_count:
          type: integer
          example: 80
        forks_count:
          type: integer
          example: 9

    Label:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
          example: bug
        color:
          type: string
          example: f29513
        description:
          type: string

    Issue:
      type: object
      required:
        - id
        - number
        - title
        - state
        - user
      properties:
        id:
          type: integer
        number:
          type: integer
          example: 1347
        title:
          type: string
          example: Found a bug
        user:
          $ref: '#/components/schemas/User'
        labels:
          type: array
          items:
            $ref: '#/components/schemas/Label'
        state:
          type: string
          enum: [open, closed]
          example: open
        comments:
          type: integer
          example: 0
        body:
          type: string
          example: I am having a problem with this.

    IssueRequest:
      type: object
      required:
        - title
      properties:
        title:
          type: string
          example: Bug in login flow
        body:
          type: string
          example: Details on the error reproduction
        assignees:
          type: array
          items:
            type: string
        labels:
          type: array
          items:
            type: string

    BasicError:
      type: object
      required:
        - message
      properties:
        message:
          type: string
          example: Not Found
        documentation_url:
          type: string
          format: uri
`;
