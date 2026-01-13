/**
 * Example User Routes
 *
 * Demonstrates how to create routes using Magik decorators
 * with authentication, validation, and file uploads.
 */

import { z } from 'zod';
import { Router, Get, Post, Put, Delete } from '../src/decorators';
import { createRoute } from '../src/factories';

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['user', 'admin', 'moderator']).default('user'),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).max(100).optional(),
  role: z.enum(['user', 'admin', 'moderator']).optional(),
});

// In-memory store for demo
const users = new Map<string, { id: string; email: string; name: string; role: string }>();
let nextId = 1;

@Router('/users')
export default class UserRouter {
  /**
   * List all users
   * GET /users
   */
  @Get('/')
  public listUsers() {
    return createRoute({
      handler: (_req, res) => {
        const userList = Array.from(users.values());
        res.json({
          count: userList.length,
          users: userList,
        });
      },
    });
  }

  /**
   * Get a single user by ID
   * GET /users/:id
   */
  @Get('/:id')
  public getUser() {
    return createRoute({
      handler: (req, res) => {
        const user = users.get(req.params.id);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
      },
    });
  }

  /**
   * Create a new user
   * POST /users
   *
   * Requires authentication and validates request body
   */
  @Post('/')
  public createUser() {
    return createRoute({
      auth: 'ensureAuthenticated',
      schema: createUserSchema,
      handler: (req, res) => {
        // req.body is typed as { email: string; name: string; role: string }
        const id = String(nextId++);
        const user = { id, ...req.body };
        users.set(id, user);

        res.status(201).json({
          message: 'User created successfully',
          user,
        });
      },
    });
  }

  /**
   * Update a user
   * PUT /users/:id
   *
   * Requires admin role
   */
  @Put('/:id')
  public updateUser() {
    return createRoute({
      auth: 'ensureAdmin',
      schema: updateUserSchema,
      handler: (req, res) => {
        const user = users.get(req.params.id);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Update only provided fields
        const updated = { ...user, ...req.body };
        users.set(req.params.id, updated);

        res.json({
          message: 'User updated successfully',
          user: updated,
        });
      },
    });
  }

  /**
   * Delete a user
   * DELETE /users/:id
   *
   * Requires admin role
   */
  @Delete('/:id')
  public deleteUser() {
    return createRoute({
      auth: 'ensureAdmin',
      handler: (req, res) => {
        const user = users.get(req.params.id);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        users.delete(req.params.id);
        res.status(204).send();
      },
    });
  }

  /**
   * Get current user profile
   * GET /users/me
   *
   * Uses the authenticated user from request
   */
  @Get('/me')
  public getProfile() {
    return createRoute({
      auth: 'ensureAuthenticated',
      handler: (req, res) => {
        // req.user is available and typed
        res.json({
          message: 'Profile retrieved',
          user: req.user,
        });
      },
    });
  }
}
