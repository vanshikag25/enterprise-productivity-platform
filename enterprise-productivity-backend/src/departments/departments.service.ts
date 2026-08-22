import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/drizzle.provider';
import { departments, Department } from '../database/schema/departments.schema';
import { UsersService } from '../users/users.service';
import { hasMinRole, type UserRole } from '../rbac/roles';
import { StreamService } from '../stream/stream.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    private readonly usersService: UsersService,
    private readonly streamService: StreamService,
  ) {}

  private async ensureDepartmentSchema(): Promise<void> {
    const result = await this.db.execute(sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'departments'
          AND column_name = 'manager_id'
      ) AS has_manager_id
    `);

    const rows = (((result as unknown) as { rows?: Array<{ has_manager_id?: boolean | string }> }).rows ?? []) as Array<{ has_manager_id?: boolean | string }>;
    const hasManagerId = rows[0]?.has_manager_id;
    const isPresent = hasManagerId === true || hasManagerId === 't' || hasManagerId === 'true' || String(hasManagerId).toLowerCase() === 'true';

    if (!isPresent) {
      await this.db.execute(sql`
        ALTER TABLE "departments"
        ADD COLUMN IF NOT EXISTS "manager_id" varchar(255)
      `);
    }
  }

  private async requireRole(userId: string, minimum: UserRole) {
    const user = await this.usersService.findByUsername(userId);
    if (!user || !hasMinRole(user.role, minimum)) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }
  }

  private async syncChannelMembership(dept: Department) {
    if (!dept.channelId) return;
    const channel = this.streamService.getClient().channel('messaging', dept.channelId);
    await channel.watch();
    const currentMembers = Object.keys(channel.state.members ?? {});
    const desiredMembers = Array.from(new Set(dept.memberIds ?? []));
    const toAdd = desiredMembers.filter((member) => !currentMembers.includes(member));
    const toRemove = currentMembers.filter((member) => !desiredMembers.includes(member));
    if (toAdd.length) await channel.addMembers(toAdd);
    if (toRemove.length) await channel.removeMembers(toRemove);
  }

  async create(userId: string, dto: CreateDepartmentDto): Promise<Department> {
    await this.ensureDepartmentSchema();
    await this.requireRole(userId, 'admin');
    const memberIds = Array.from(new Set([userId, ...(dto.memberIds ?? [])]));

    const channel = await this.streamService.createGroupChannel(
      userId,
      dto.name,
      dto.description ?? undefined,
      memberIds,
    );

    const [dept] = await this.db
      .insert(departments)
      .values({
        name: dto.name,
        description: dto.description ?? null,
        managerId: null,
        memberIds,
        channelId: channel.id ?? null,
        createdBy: userId,
      })
      .returning();

    if (channel.id) {
      await this.syncChannelMembership({ ...dept, channelId: channel.id });
    }

    return dept;
  }

  async findMine(userId: string): Promise<Department[]> {
    await this.ensureDepartmentSchema();
    const user = await this.usersService.findByUsername(userId);
    const all = await this.db.select().from(departments);
    if (user && hasMinRole(user.role, 'admin')) return all;
    return all.filter((d) => d.memberIds.includes(userId));
  }

  async findOne(id: string): Promise<Department> {
    await this.ensureDepartmentSchema();
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
    await this.ensureDepartmentSchema();
    await this.requireRole(userId, 'manager');
    const dept = await this.findOne(id);
    const memberIds = dto.memberIds
      ? Array.from(new Set([...(dept.memberIds ?? []), ...dto.memberIds]))
      : dept.memberIds;

    const [updated] = await this.db
      .update(departments)
      .set({
        name: dto.name ?? dept.name,
        description: dto.description ?? dept.description,
        managerId: null,
        memberIds,
        updatedAt: new Date(),
      })
      .where(eq(departments.id, id))
      .returning();

    if (updated.channelId) {
      await this.syncChannelMembership(updated);
    }

    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.ensureDepartmentSchema();
    await this.requireRole(userId, 'admin');
    const dept = await this.findOne(id);
    if (dept.channelId) {
      try {
        const channel = this.streamService.getClient().channel('messaging', dept.channelId);
        await channel.delete();
      } catch {
        // stream channel may already be deleted; continue cleanup
      }
    }
    await this.db.delete(departments).where(eq(departments.id, id));
  }

  async addMember(
    id: string,
    userId: string,
    memberId: string,
  ): Promise<Department> {
    await this.ensureDepartmentSchema();
    await this.requireRole(userId, 'manager');
    const dept = await this.findOne(id);
    const memberIds = Array.from(new Set([...dept.memberIds, memberId]));
    const [updated] = await this.db
      .update(departments)
      .set({ memberIds, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();

    if (updated.channelId) {
      await this.syncChannelMembership(updated);
    }

    return updated;
  }

  async removeMember(
    id: string,
    userId: string,
    memberId: string,
  ): Promise<Department> {
    await this.ensureDepartmentSchema();
    await this.requireRole(userId, 'manager');
    const dept = await this.findOne(id);
    const memberIds = dept.memberIds.filter((m) => m !== memberId);
    const [updated] = await this.db
      .update(departments)
      .set({ memberIds, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();

    if (updated.channelId) {
      await this.syncChannelMembership(updated);
    }

    return updated;
  }

  async setChannelId(id: string, channelId: string): Promise<void> {
    await this.ensureDepartmentSchema();
    await this.db
      .update(departments)
      .set({ channelId })
      .where(eq(departments.id, id));
  }
}
