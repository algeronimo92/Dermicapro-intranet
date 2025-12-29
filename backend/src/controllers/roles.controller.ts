import { Request, Response } from 'express';
import { roleService } from '../services/role.service';
import { permissionService } from '../services/permission.service';
import { roleValidator } from '../validators/role.validator';
import { roleMapper } from '../mappers/role.mapper';
import { AppError } from '../middlewares/errorHandler';

export class RolesController {
  /**
   * GET /api/roles
   * Obtener todos los roles
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { includeInactive } = req.query;

      const roles = await roleService.findAll({
        includeInactive: includeInactive === 'true',
      });

      const rolesDTO = roleMapper.toDTOList(roles);

      res.json(rolesDTO);
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ message: 'Error al obtener roles' });
    }
  }

  /**
   * GET /api/roles/:id
   * Obtener un rol por ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const role = await roleService.findById(id);

      if (!role) {
        throw new AppError('Rol no encontrado', 404);
      }

      const roleDTO = roleMapper.toDetailDTO(role);

      res.json(roleDTO);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        console.error('Error fetching role:', error);
        res.status(500).json({ message: 'Error al obtener rol' });
      }
    }
  }

  /**
   * POST /api/roles
   * Crear un nuevo rol
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, displayName, description, permissionIds } = req.body;

      // Validar datos
      roleValidator.validateCreateData({ name, displayName, description, permissionIds });

      // Verificar que el nombre no exista
      const existingRole = await roleService.findByName(name);
      if (existingRole) {
        throw new AppError('Ya existe un rol con ese nombre', 409);
      }

      // Crear rol
      const role = await roleService.create({
        name,
        displayName,
        description,
        permissionIds,
      });

      const roleDTO = roleMapper.toDTO(role);

      res.status(201).json(roleDTO);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        console.error('Error creating role:', error);
        res.status(500).json({ message: 'Error al crear rol' });
      }
    }
  }

  /**
   * PUT /api/roles/:id
   * Actualizar un rol
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, displayName, description, isActive, permissionIds } = req.body;

      // Validar datos
      roleValidator.validateUpdateData({ name, displayName, description, isActive, permissionIds });

      // Verificar que el rol existe
      const existingRole = await roleService.findById(id);
      if (!existingRole) {
        throw new AppError('Rol no encontrado', 404);
      }

      // Permitir editar roles del sistema en desarrollo
      // En producción, esto debería estar más restringido

      // Si se cambia el nombre, verificar que no exista
      if (name && name !== existingRole.name) {
        const roleWithName = await roleService.findByName(name);
        if (roleWithName) {
          throw new AppError('Ya existe un rol con ese nombre', 409);
        }
      }

      // Actualizar rol
      const role = await roleService.update(id, {
        name,
        displayName,
        description,
        isActive,
        permissionIds,
      });

      const roleDTO = roleMapper.toDTO(role);

      res.json(roleDTO);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        console.error('Error updating role:', error);
        res.status(500).json({ message: 'Error al actualizar rol' });
      }
    }
  }

  /**
   * DELETE /api/roles/:id
   * Eliminar un rol
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Verificar que el rol existe
      const role = await roleService.findById(id);
      if (!role) {
        throw new AppError('Rol no encontrado', 404);
      }

      // No permitir eliminar roles del sistema
      await roleValidator.validateRoleNotSystem(role);

      // No permitir eliminar si tiene usuarios asignados
      const userCount = await roleService.getUserCount(id);
      await roleValidator.validateRoleHasNoUsers(userCount, role.displayName);

      // Eliminar rol
      await roleService.delete(id);

      res.json({ message: 'Rol eliminado exitosamente' });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        console.error('Error deleting role:', error);
        res.status(500).json({ message: 'Error al eliminar rol' });
      }
    }
  }

  /**
   * PATCH /api/roles/:id/toggle-status
   * Activar/Desactivar un rol
   */
  async toggleStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const role = await roleService.findById(id);
      if (!role) {
        throw new AppError('Rol no encontrado', 404);
      }

      // No permitir desactivar roles del sistema
      await roleValidator.validateRoleNotSystem(role);

      const updatedRole = await roleService.toggleStatus(id, !role.isActive);

      const roleDTO = roleMapper.toDTO(updatedRole);

      res.json(roleDTO);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        console.error('Error toggling role status:', error);
        res.status(500).json({ message: 'Error al cambiar estado del rol' });
      }
    }
  }

  /**
   * GET /api/roles/permissions
   * Obtener todos los permisos disponibles
   */
  async getAllPermissions(_req: Request, res: Response): Promise<void> {
    try {
      const [all, byModule] = await Promise.all([
        permissionService.findAll(),
        permissionService.groupByModule(),
      ]);

      res.json({ all, byModule });
    } catch (error) {
      console.error('Error fetching permissions:', error);
      res.status(500).json({ message: 'Error al obtener permisos' });
    }
  }

  /**
   * POST /api/permissions
   * Crear un nuevo permiso
   */
  async createPermission(req: Request, res: Response): Promise<void> {
    try {
      const { name, displayName, description, module, action } = req.body;

      // Validar datos requeridos
      if (!name?.trim() || !displayName?.trim() || !module?.trim() || !action?.trim()) {
        throw new AppError('Nombre, nombre para mostrar, módulo y acción son requeridos', 400);
      }

      // Validar formato del nombre (module.action)
      const namePattern = /^[a-z0-9_.]+$/;
      if (!namePattern.test(name)) {
        throw new AppError('El nombre del permiso solo puede contener letras minúsculas, números, puntos y guiones bajos', 400);
      }

      // Validar formato del módulo y acción
      const modulePattern = /^[a-z0-9_]+$/;
      if (!modulePattern.test(module)) {
        throw new AppError('El módulo solo puede contener letras minúsculas, números y guiones bajos', 400);
      }
      if (!modulePattern.test(action)) {
        throw new AppError('La acción solo puede contener letras minúsculas, números y guiones bajos', 400);
      }

      // Verificar que el nombre no exista
      const existingPermission = await permissionService.findByName(name);
      if (existingPermission) {
        throw new AppError('Ya existe un permiso con ese nombre', 409);
      }

      // Crear permiso
      const permission = await permissionService.create({
        name: name.trim(),
        displayName: displayName.trim(),
        description: description?.trim(),
        module: module.trim(),
        action: action.trim(),
      });

      res.status(201).json(permission);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        console.error('Error creating permission:', error);
        res.status(500).json({ message: 'Error al crear permiso' });
      }
    }
  }
}

// Crear instancia del controlador
const controller = new RolesController();

// Exportar métodos bound al contexto del controlador
export const getAllRoles = controller.getAll.bind(controller);
export const getRoleById = controller.getById.bind(controller);
export const createRole = controller.create.bind(controller);
export const updateRole = controller.update.bind(controller);
export const deleteRole = controller.delete.bind(controller);
export const toggleRoleStatus = controller.toggleStatus.bind(controller);
export const getAllPermissions = controller.getAllPermissions.bind(controller);
export const createPermission = controller.createPermission.bind(controller);
