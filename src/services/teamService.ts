/**
 * Team/Organization Service
 * Multi-user team management with roles and permissions
 */

// Simple console logger
const logger = {
  info: (msg: string) => console.log(`[Team] ${msg}`),
  warn: (msg: string) => console.warn(`[Team] ${msg}`),
  error: (msg: string) => console.error(`[Team] ${msg}`),
};

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Team {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: 'team' | 'enterprise';
  settings: TeamSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamSettings {
  maxMembers: number;
  maxClones: number;
  allowGuestInvites: boolean;
  requireApproval: boolean;
  defaultRole: TeamRole;
  webhooksEnabled: boolean;
  s3Enabled: boolean;
  slackEnabled: boolean;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  email: string;
  name?: string;
  role: TeamRole;
  invitedBy: string;
  invitedAt: Date;
  joinedAt?: Date;
  status: 'pending' | 'active' | 'suspended';
}

export interface TeamInvite {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt?: Date;
}

export interface TeamAuditLog {
  id: string;
  teamId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// Role permissions
const PERMISSIONS: Record<TeamRole, string[]> = {
  owner: ['*'], // All permissions
  admin: [
    'team.read',
    'team.update',
    'members.invite',
    'members.remove',
    'members.update',
    'clones.create',
    'clones.read',
    'clones.delete',
    'webhooks.manage',
    'settings.read',
    'audit.read',
  ],
  member: [
    'team.read',
    'clones.create',
    'clones.read',
    'clones.delete.own',
    'webhooks.read',
  ],
  viewer: [
    'team.read',
    'clones.read',
  ],
};

export class TeamService {
  private teams: Map<string, Team> = new Map();
  private members: Map<string, TeamMember[]> = new Map();
  private invites: Map<string, TeamInvite[]> = new Map();
  private auditLogs: Map<string, TeamAuditLog[]> = new Map();

  /**
   * Create a new team
   */
  async createTeam(
    name: string,
    ownerId: string,
    plan: 'team' | 'enterprise' = 'team'
  ): Promise<Team> {
    const id = this.generateId('team');
    const slug = this.generateSlug(name);

    const team: Team = {
      id,
      name,
      slug,
      ownerId,
      plan,
      settings: this.getDefaultSettings(plan),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.teams.set(id, team);
    this.members.set(id, []);
    this.invites.set(id, []);
    this.auditLogs.set(id, []);

    // Add owner as first member
    await this.addMember(id, ownerId, 'owner', ownerId);

    await this.logAudit(id, ownerId, 'team.created', 'team', id);

    logger.info(`Team created: ${name} (${id}) by user ${ownerId}`);
    return team;
  }

  /**
   * Get team by ID
   */
  getTeam(teamId: string): Team | undefined {
    return this.teams.get(teamId);
  }

  /**
   * Get team by slug
   */
  getTeamBySlug(slug: string): Team | undefined {
    return Array.from(this.teams.values()).find(t => t.slug === slug);
  }

  /**
   * Update team settings
   */
  async updateTeam(
    teamId: string,
    updates: Partial<Pick<Team, 'name' | 'settings'>>,
    userId: string
  ): Promise<Team | null> {
    const team = this.teams.get(teamId);
    if (!team) return null;

    if (updates.name) {
      team.name = updates.name;
      team.slug = this.generateSlug(updates.name);
    }
    if (updates.settings) {
      team.settings = { ...team.settings, ...updates.settings };
    }
    team.updatedAt = new Date();

    await this.logAudit(teamId, userId, 'team.updated', 'team', teamId, updates);

    return team;
  }

  /**
   * Delete a team
   */
  async deleteTeam(teamId: string, userId: string): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team) return false;

    // Only owner can delete
    if (team.ownerId !== userId) {
      throw new Error('Only the team owner can delete the team');
    }

    this.teams.delete(teamId);
    this.members.delete(teamId);
    this.invites.delete(teamId);
    // Keep audit logs for compliance

    logger.info(`Team deleted: ${team.name} (${teamId}) by user ${userId}`);
    return true;
  }

  /**
   * Add a member to the team
   */
  async addMember(
    teamId: string,
    userId: string,
    role: TeamRole,
    invitedBy: string,
    email?: string
  ): Promise<TeamMember> {
    const teamMembers = this.members.get(teamId) || [];
    const team = this.teams.get(teamId);

    if (!team) {
      throw new Error('Team not found');
    }

    // Check max members
    if (teamMembers.length >= team.settings.maxMembers) {
      throw new Error('Team has reached maximum member limit');
    }

    // Check if already a member
    if (teamMembers.some(m => m.userId === userId)) {
      throw new Error('User is already a member');
    }

    const member: TeamMember = {
      id: this.generateId('member'),
      teamId,
      userId,
      email: email || '',
      role,
      invitedBy,
      invitedAt: new Date(),
      joinedAt: new Date(),
      status: 'active',
    };

    teamMembers.push(member);
    this.members.set(teamId, teamMembers);

    await this.logAudit(teamId, invitedBy, 'member.added', 'member', member.id, {
      userId,
      role,
    });

    return member;
  }

  /**
   * Remove a member from the team
   */
  async removeMember(teamId: string, memberId: string, removedBy: string): Promise<boolean> {
    const teamMembers = this.members.get(teamId);
    if (!teamMembers) return false;

    const memberIndex = teamMembers.findIndex(m => m.id === memberId);
    if (memberIndex === -1) return false;

    const member = teamMembers[memberIndex];

    // Cannot remove owner
    if (member.role === 'owner') {
      throw new Error('Cannot remove team owner');
    }

    teamMembers.splice(memberIndex, 1);

    await this.logAudit(teamId, removedBy, 'member.removed', 'member', memberId, {
      userId: member.userId,
    });

    return true;
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    teamId: string,
    memberId: string,
    newRole: TeamRole,
    updatedBy: string
  ): Promise<TeamMember | null> {
    const teamMembers = this.members.get(teamId);
    if (!teamMembers) return null;

    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return null;

    // Cannot change owner role
    if (member.role === 'owner') {
      throw new Error('Cannot change owner role');
    }

    const oldRole = member.role;
    member.role = newRole;

    await this.logAudit(teamId, updatedBy, 'member.role_changed', 'member', memberId, {
      oldRole,
      newRole,
    });

    return member;
  }

  /**
   * Get team members
   */
  getMembers(teamId: string): TeamMember[] {
    return this.members.get(teamId) || [];
  }

  /**
   * Get member by user ID
   */
  getMemberByUserId(teamId: string, userId: string): TeamMember | undefined {
    const teamMembers = this.members.get(teamId) || [];
    return teamMembers.find(m => m.userId === userId);
  }

  /**
   * Create team invite
   */
  async createInvite(
    teamId: string,
    email: string,
    role: TeamRole,
    invitedBy: string
  ): Promise<TeamInvite> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const teamInvites = this.invites.get(teamId) || [];

    // Check if already invited
    if (teamInvites.some(i => i.email === email && !i.acceptedAt)) {
      throw new Error('User already has a pending invite');
    }

    const invite: TeamInvite = {
      id: this.generateId('invite'),
      teamId,
      email,
      role,
      invitedBy,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    teamInvites.push(invite);
    this.invites.set(teamId, teamInvites);

    await this.logAudit(teamId, invitedBy, 'invite.created', 'invite', invite.id, {
      email,
      role,
    });

    return invite;
  }

  /**
   * Accept team invite
   */
  async acceptInvite(inviteId: string, userId: string): Promise<TeamMember> {
    // Find invite across all teams
    for (const [teamId, teamInvites] of this.invites) {
      const invite = teamInvites.find(i => i.id === inviteId);
      if (invite) {
        if (invite.acceptedAt) {
          throw new Error('Invite already accepted');
        }
        if (new Date() > invite.expiresAt) {
          throw new Error('Invite has expired');
        }

        invite.acceptedAt = new Date();

        // Add member
        return await this.addMember(
          teamId,
          userId,
          invite.role,
          invite.invitedBy,
          invite.email
        );
      }
    }

    throw new Error('Invite not found');
  }

  /**
   * Check if user has permission
   */
  hasPermission(teamId: string, userId: string, permission: string): boolean {
    const member = this.getMemberByUserId(teamId, userId);
    if (!member || member.status !== 'active') return false;

    const rolePermissions = PERMISSIONS[member.role];
    if (rolePermissions.includes('*')) return true;

    return rolePermissions.includes(permission);
  }

  /**
   * Get user's teams
   */
  getUserTeams(userId: string): Team[] {
    const userTeams: Team[] = [];

    for (const [teamId, teamMembers] of this.members) {
      if (teamMembers.some(m => m.userId === userId && m.status === 'active')) {
        const team = this.teams.get(teamId);
        if (team) userTeams.push(team);
      }
    }

    return userTeams;
  }

  /**
   * Log audit event
   */
  private async logAudit(
    teamId: string,
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const teamLogs = this.auditLogs.get(teamId) || [];

    teamLogs.push({
      id: this.generateId('audit'),
      teamId,
      userId,
      action,
      resource,
      resourceId,
      details,
      timestamp: new Date(),
    });

    this.auditLogs.set(teamId, teamLogs);
  }

  /**
   * Get audit logs
   */
  getAuditLogs(teamId: string, limit: number = 100): TeamAuditLog[] {
    const logs = this.auditLogs.get(teamId) || [];
    return logs.slice(-limit).reverse();
  }

  /**
   * Generate default settings based on plan
   */
  private getDefaultSettings(plan: 'team' | 'enterprise'): TeamSettings {
    if (plan === 'enterprise') {
      return {
        maxMembers: 100,
        maxClones: 10000,
        allowGuestInvites: true,
        requireApproval: false,
        defaultRole: 'member',
        webhooksEnabled: true,
        s3Enabled: true,
        slackEnabled: true,
      };
    }

    return {
      maxMembers: 10,
      maxClones: 1000,
      allowGuestInvites: false,
      requireApproval: true,
      defaultRole: 'member',
      webhooksEnabled: true,
      s3Enabled: false,
      slackEnabled: true,
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Generate URL-safe slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}

// Singleton instance
export const teamService = new TeamService();
