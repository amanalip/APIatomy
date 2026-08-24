export const CIRCULAR_SPEC = `openapi: 3.0.3
info:
  title: Circular References Demo
  description: Deep circular and self referencing schemas to test circular guard, graph reuse indicators and nested resolution.
  version: 1.0.0
servers:
  - url: https://api.circular.example.com/v1
tags:
  - name: org
    description: Organization graph
paths:
  /users/{userId}:
    get:
      tags:
        - org
      summary: Get user with teams and projects
      operationId: getUser
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: User
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
  /teams/{teamId}:
    get:
      tags:
        - org
      summary: Get team with members and projects
      operationId: getTeam
      parameters:
        - name: teamId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Team
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Team'
  /projects/{projectId}:
    get:
      tags:
        - org
      summary: Get project with owner and collaborators
      operationId: getProject
      parameters:
        - name: projectId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Project
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Project'
components:
  schemas:
    User:
      type: object
      required:
        - id
        - name
      properties:
        id:
          type: string
          example: usr_1
        name:
          type: string
          example: Alice
        email:
          type: string
          format: email
          example: alice@example.com
        teams:
          type: array
          items:
            $ref: '#/components/schemas/Team'
        ownedProjects:
          type: array
          items:
            $ref: '#/components/schemas/Project'
        manager:
          $ref: '#/components/schemas/User'
          description: Self reference to manager
        metadata:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/User'
          description: Map of related users
    Team:
      type: object
      required:
        - id
        - name
      properties:
        id:
          type: string
          example: team_eng
        name:
          type: string
          example: Engineering
        members:
          type: array
          items:
            $ref: '#/components/schemas/User'
        projects:
          type: array
          items:
            $ref: '#/components/schemas/Project'
        parentTeam:
          $ref: '#/components/schemas/Team'
          description: Self reference for hierarchy
        lead:
          $ref: '#/components/schemas/User'
    Project:
      type: object
      required:
        - id
        - title
      properties:
        id:
          type: string
          example: prj_123
        title:
          type: string
          example: API Redesign
        owner:
          $ref: '#/components/schemas/User'
        collaborators:
          type: array
          items:
            $ref: '#/components/schemas/User'
        team:
          $ref: '#/components/schemas/Team'
        subProjects:
          type: array
          items:
            $ref: '#/components/schemas/Project'
          description: Self recursive subtree
        related:
          $ref: '#/components/schemas/Project'
          nullable: true
`;
