import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import { departments, Department } from '../database/schema/departments.schema';
import { UsersService } from '../users/users.service';
import { hasMinRole, type UserRole } from '../rbac/roles';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly usersService: UsersService,
  ) {}

  private async requireRole(userId: string, minimum: UserRole) {
    const user = await this.usersService.findByClerkId(userId);
    if (!user || !hasMinRole(user.role, minimum)) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }
  }

  async create(userId: string, dto: CreateDepartmentDto): Promise<Department> {
    await this.requireRole(userId, 'admin');
    const [dept] = await this.db
      .insert(departments)
      .values({
        name: dto.name,
        description: dto.description ?? null,
        memberIds: Array.from(new Set([userId, ...(dto.memberIds ?? [])])),
        createdBy: userId,
      })
      .returning();
    return dept;
  }

  async findMine(userId: string): Promise<Department[]> {
    const user = await this.usersService.findByClerkId(userId);
    const all = await this.db.select().from(departments);
    if (user && hasMinRole(user.role, 'admin')) return all;
    return all.filter((d) => d.memberIds.includes(userId));
  }

  async findOne(id: string): Promise<Department> {
    const [dept] = await this.db
      .select()
      .from(departments)
      .where(eq(departments.id, id));
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateDepartmentDto,
  ): Promise<Department> {
    await this.requireRole(userId, 'admin');
    const [updated] = await this.db
      .update(departments)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();
    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.requireRole(userId, 'admin');
    await this.db.delete(departments).where(eq(departments.id, id));
  }

  async addMember(
    id: string,
    userId: string,
    memberId: string,
  ): Promise<Department> {
    await this.requireRole(userId, 'admin');
    const dept = await this.findOne(id);
    const memberIds = Array.from(new Set([...dept.memberIds, memberId]));
    const [updated] = await this.db
      .update(departments)
      .set({ memberIds, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();
    return updated;
  }

  async removeMember(
    id: string,
    userId: string,
    memberId: string,
  ): Promise<Department> {
    await this.requireRole(userId, 'admin');
    const dept = await this.findOne(id);
    const memberIds = dept.memberIds.filter((m) => m !== memberId);
    const [updated] = await this.db
      .update(departments)
      .set({ memberIds, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();
    return updated;
  }

  async setChannelId(id: string, channelId: string): Promise<void> {
    await this.db
      .update(departments)
      .set({ channelId })
      .where(eq(departments.id, id));
  }
}
