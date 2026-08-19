"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKFLOW_TEMPLATES = exports.ACTION_META = exports.CONDITION_OPERATOR_META = exports.CONDITION_FIELD_META = exports.TRIGGER_META = exports.ROLE_OPTIONS = exports.MILESTONE_STATUS_OPTIONS = exports.TASK_PRIORITY_OPTIONS = exports.TASK_STATUS_OPTIONS = void 0;
exports.TASK_STATUS_OPTIONS = [
    { value: 'Todo', label: 'Todo' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'In Review', label: 'In Review' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Closed', label: 'Closed' },
];
exports.TASK_PRIORITY_OPTIONS = [
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
    { value: 'Critical', label: 'Critical' },
];
exports.MILESTONE_STATUS_OPTIONS = [
    { value: 'planned', label: 'Planned' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'delayed', label: 'Delayed' },
];
exports.ROLE_OPTIONS = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'organization_owner', label: 'Organization Owner' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'team_lead', label: 'Team Lead' },
    { value: 'employee', label: 'Employee' },
    { value: 'guest', label: 'Guest' },
];
const channelField = {
    key: 'channelId',
    label: 'Channel',
    type: 'channel',
    required: false,
    placeholder: 'Leave empty for any channel',
    hint: 'Optional: restrict the trigger to one conversation.',
};
const projectField = {
    key: 'projectId',
    label: 'Project ID',
    type: 'text',
    required: false,
    placeholder: 'Leave empty for any project',
};
exports.TRIGGER_META = [
    {
        type: 'task_created',
        label: 'Task created',
        description: 'Fires when a new task is created.',
        configFields: [
            {
                key: 'priority',
                label: 'Priority',
                type: 'select',
                options: exports.TASK_PRIORITY_OPTIONS,
            },
        ],
    },
    {
        type: 'task_assigned',
        label: 'Task assigned',
        description: 'Fires when a task is assigned (or re-assigned) to someone.',
        configFields: [
            {
                key: 'assignee',
                label: 'Assignee',
                type: 'text',
                placeholder: 'Username; empty for any',
            },
        ],
    },
    {
        type: 'task_completed',
        label: 'Task completed',
        description: 'Fires when a task transitions to Completed.',
        configFields: [],
    },
    {
        type: 'task_overdue',
        label: 'Task overdue',
        description: 'Fires when a task with a due date passes its due date (checked hourly).',
        configFields: [
            {
                key: 'priority',
                label: 'Priority',
                type: 'select',
                options: exports.TASK_PRIORITY_OPTIONS,
            },
        ],
    },
    {
        type: 'task_status_changed',
        label: 'Task status changed',
        description: 'Fires whenever a task status changes.',
        configFields: [
            {
                key: 'status',
                label: 'New status',
                type: 'select',
                options: exports.TASK_STATUS_OPTIONS,
            },
        ],
    },
    {
        type: 'project_created',
        label: 'Project created',
        description: 'Fires when a new project is created.',
        configFields: [],
    },
    {
        type: 'milestone_completed',
        label: 'Milestone completed',
        description: 'Fires when a milestone becomes completed.',
        configFields: [projectField],
    },
    {
        type: 'milestone_delayed',
        label: 'Milestone delayed',
        description: 'Fires when a milestone is marked delayed, or passes its due date (checked hourly).',
        configFields: [projectField],
    },
    {
        type: 'meeting_ended',
        label: 'Meeting ended',
        description: 'Fires when a meeting is marked completed.',
        configFields: [
            channelField,
            {
                key: 'organizer',
                label: 'Organizer',
                type: 'text',
                placeholder: 'Username; empty for any',
            },
        ],
    },
    {
        type: 'user_joined',
        label: 'New user joined',
        description: 'Fires when a new account is created.',
        configFields: [
            {
                key: 'role',
                label: 'Role',
                type: 'select',
                options: exports.ROLE_OPTIONS,
            },
        ],
    },
    {
        type: 'message_received',
        label: 'Message received',
        description: 'Fires when a new message arrives (polled every 30s).',
        configFields: [
            channelField,
            {
                key: 'mentionUser',
                label: 'Mentioned user',
                type: 'text',
                placeholder: 'Username; empty for any',
            },
        ],
    },
    {
        type: 'mention_received',
        label: 'User mentioned',
        description: 'Fires when a message mentions a specific user.',
        configFields: [
            channelField,
            {
                key: 'mentionUser',
                label: 'Mentioned user',
                type: 'text',
                required: true,
                placeholder: 'Username the workflow reacts to',
            },
        ],
    },
];
exports.CONDITION_FIELD_META = [
    { key: 'actor', label: 'Triggered by (username)', type: 'text' },
    {
        key: 'actorRole',
        label: 'Triggered by (role)',
        type: 'select',
        options: exports.ROLE_OPTIONS,
    },
    { key: 'projectId', label: 'Project ID', type: 'text' },
    {
        key: 'projectRole',
        label: 'Triggered by (project role)',
        type: 'select',
        options: [
            { value: 'owner', label: 'Owner' },
            { value: 'manager', label: 'Manager' },
            { value: 'member', label: 'Member' },
            { value: 'guest', label: 'Guest' },
        ],
    },
    { key: 'departmentId', label: 'Department ID', type: 'text' },
    { key: 'channelId', label: 'Channel ID', type: 'text' },
    {
        key: 'taskStatus',
        label: 'Task status',
        type: 'select',
        options: exports.TASK_STATUS_OPTIONS,
    },
    {
        key: 'taskPriority',
        label: 'Task priority',
        type: 'select',
        options: exports.TASK_PRIORITY_OPTIONS,
    },
    { key: 'assignee', label: 'Assignee (username)', type: 'text' },
    { key: 'dueDate', label: 'Due date', type: 'date' },
    {
        key: 'milestoneStatus',
        label: 'Milestone status',
        type: 'select',
        options: exports.MILESTONE_STATUS_OPTIONS,
    },
    { key: 'milestoneProgress', label: 'Milestone progress (%)', type: 'number' },
    {
        key: 'meetingStatus',
        label: 'Meeting status',
        type: 'select',
        options: [
            { value: 'Scheduled', label: 'Scheduled' },
            { value: 'Ongoing', label: 'Ongoing' },
            { value: 'Completed', label: 'Completed' },
            { value: 'Cancelled', label: 'Cancelled' },
        ],
    },
    {
        key: 'meetingOrganizer',
        label: 'Meeting organizer (username)',
        type: 'text',
    },
    { key: 'messageText', label: 'Message contains', type: 'text' },
    { key: 'mentionUser', label: 'Mentioned user (username)', type: 'text' },
    {
        key: 'userRole',
        label: 'New user role',
        type: 'select',
        options: exports.ROLE_OPTIONS,
    },
    { key: 'title', label: 'Entity title contains', type: 'text' },
];
exports.CONDITION_OPERATOR_META = [
    { key: 'eq', label: 'equals' },
    { key: 'neq', label: 'does not equal' },
    { key: 'in', label: 'is one of' },
    { key: 'contains', label: 'contains' },
    { key: 'gt', label: 'is greater than' },
    { key: 'gte', label: 'is at least' },
    { key: 'lt', label: 'is less than' },
    { key: 'lte', label: 'is at most' },
    { key: 'withinDays', label: 'is due within (days)' },
];
exports.ACTION_META = [
    {
        type: 'notify',
        label: 'Send notification',
        description: 'Create in-app notifications for one or more users.',
        configFields: [
            {
                key: 'users',
                label: 'Recipients',
                type: 'multiselect',
                required: true,
                hint: 'Pick users or tokens: assignee, creator, organizer, actor, members.',
                options: [
                    { value: 'assignee', label: 'Task assignee' },
                    { value: 'creator', label: 'Task creator' },
                    { value: 'organizer', label: 'Meeting organizer' },
                    { value: 'actor', label: 'Who triggered this' },
                    { value: 'members', label: 'Project members' },
                    { value: 'participants', label: 'Meeting participants' },
                ],
            },
            { key: 'title', label: 'Title', type: 'text', required: true },
            { key: 'description', label: 'Description', type: 'text' },
            {
                key: 'actionUrl',
                label: 'Action URL',
                type: 'text',
                placeholder: '/tasks',
            },
        ],
    },
    {
        type: 'chatMessage',
        label: 'Post chat message',
        description: 'Post a message to a conversation.',
        configFields: [
            {
                key: 'channelId',
                label: 'Channel',
                type: 'channel',
                required: true,
                placeholder: 'Use "source" for the triggering conversation',
            },
            { key: 'text', label: 'Message text', type: 'text', required: true },
        ],
    },
    {
        type: 'createTask',
        label: 'Create task',
        description: 'Create a new task.',
        configFields: [
            { key: 'title', label: 'Title', type: 'text', required: true },
            { key: 'description', label: 'Description', type: 'text' },
            {
                key: 'priority',
                label: 'Priority',
                type: 'select',
                options: exports.TASK_PRIORITY_OPTIONS,
            },
            {
                key: 'dueDate',
                label: 'Due date',
                type: 'date',
                placeholder: 'ISO date or "in:3" for 3 days',
            },
            {
                key: 'assignee',
                label: 'Assignee',
                type: 'text',
                placeholder: 'Username or assignee/creator',
            },
            { key: 'projectId', label: 'Project ID', type: 'text' },
        ],
    },
    {
        type: 'createReminder',
        label: 'Create reminder',
        description: 'Create a reminder for a user.',
        configFields: [
            { key: 'title', label: 'Title', type: 'text', required: true },
            {
                key: 'scheduledFor',
                label: 'When',
                type: 'text',
                required: true,
                placeholder: 'ISO date or "in:2" for 2 days',
            },
            {
                key: 'priority',
                label: 'Priority',
                type: 'select',
                options: [
                    { value: 'Low', label: 'Low' },
                    { value: 'Medium', label: 'Medium' },
                    { value: 'High', label: 'High' },
                ],
            },
            { key: 'notes', label: 'Notes', type: 'text' },
            {
                key: 'userId',
                label: 'For user',
                type: 'text',
                placeholder: 'Username or assignee/creator/actor',
            },
        ],
    },
    {
        type: 'updateTaskStatus',
        label: 'Update task status',
        description: 'Change the status of the triggering task.',
        configFields: [
            {
                key: 'taskId',
                label: 'Task ID',
                type: 'text',
                placeholder: 'Use "source" for the triggering task',
            },
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                required: true,
                options: exports.TASK_STATUS_OPTIONS,
            },
        ],
    },
    {
        type: 'updateMilestoneStatus',
        label: 'Update milestone status',
        description: 'Change the status of a milestone.',
        configFields: [
            {
                key: 'projectId',
                label: 'Project ID',
                type: 'text',
                placeholder: 'Use "source" for the triggering project',
            },
            {
                key: 'milestoneId',
                label: 'Milestone ID',
                type: 'text',
                placeholder: 'Use "source" for the triggering milestone',
            },
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                required: true,
                options: exports.MILESTONE_STATUS_OPTIONS,
            },
        ],
    },
    {
        type: 'aiSummary',
        label: 'Generate AI summary',
        description: 'Generate and store an AI summary (project or conversation) and notify recipients.',
        configFields: [
            {
                key: 'scope',
                label: 'Scope',
                type: 'select',
                required: true,
                options: [
                    { value: 'channel', label: 'Conversation summary' },
                    { value: 'project', label: 'Project summary' },
                ],
            },
            {
                key: 'channelId',
                label: 'Channel',
                type: 'channel',
                placeholder: 'Use "source" for the triggering conversation',
            },
            { key: 'projectId', label: 'Project ID', type: 'text' },
            {
                key: 'notifyUsers',
                label: 'Notify recipients',
                type: 'multiselect',
                options: [
                    { value: 'actor', label: 'Who triggered this' },
                    { value: 'members', label: 'Project members' },
                    { value: 'participants', label: 'Meeting participants' },
                ],
            },
        ],
    },
    {
        type: 'createTasksFromActionItems',
        label: 'Create tasks from action items',
        description: 'Generate a summary and create a task for each action item.',
        configFields: [
            {
                key: 'channelId',
                label: 'Channel',
                type: 'channel',
                placeholder: 'Use "source" for the triggering conversation',
            },
            { key: 'projectId', label: 'Project ID', type: 'text' },
            {
                key: 'assignee',
                label: 'Assignee',
                type: 'text',
                placeholder: 'Username or assignee/creator/actor',
            },
            { key: 'maxItems', label: 'Max tasks', type: 'number', placeholder: '5' },
        ],
    },
    {
        type: 'archiveDiscussion',
        label: 'Archive discussion',
        description: 'Freeze and archive the conversation.',
        configFields: [
            {
                key: 'channelId',
                label: 'Channel',
                type: 'channel',
                required: true,
                placeholder: 'Use "source" for the triggering conversation',
            },
        ],
    },
];
exports.WORKFLOW_TEMPLATES = [
    {
        id: 'overdue_task_notify',
        name: 'Overdue task → notify assignee & creator',
        description: 'When a task becomes overdue, remind the assignee and the creator.',
        workflow: {
            triggerType: 'task_overdue',
            triggerConfig: {},
            conditions: [],
            actions: [
                {
                    type: 'notify',
                    config: {
                        users: ['assignee', 'creator'],
                        title: 'Task overdue',
                        description: 'Task "{{title}}" is overdue and needs attention.',
                        actionUrl: '/tasks',
                    },
                },
            ],
        },
    },
    {
        id: 'meeting_ends_ai_summary',
        name: 'Meeting ends → AI summary & action items',
        description: 'When a meeting ends, generate an AI summary and create tasks from its action items.',
        workflow: {
            triggerType: 'meeting_ended',
            triggerConfig: {},
            conditions: [],
            actions: [
                {
                    type: 'aiSummary',
                    config: {
                        scope: 'channel',
                        channelId: 'source',
                        notifyUsers: ['actor'],
                    },
                },
                {
                    type: 'createTasksFromActionItems',
                    config: { channelId: 'source', maxItems: 5 },
                },
            ],
        },
    },
    {
        id: 'project_created_welcome',
        name: 'Project created → welcome message',
        description: 'When a project is created, post a welcome message in its channel.',
        workflow: {
            triggerType: 'project_created',
            triggerConfig: {},
            conditions: [],
            actions: [
                {
                    type: 'chatMessage',
                    config: {
                        channelId: 'source',
                        text: 'Welcome to the project "{{title}}"! Introduce yourself and get started.',
                    },
                },
            ],
        },
    },
    {
        id: 'milestone_delayed_notify',
        name: 'Milestone delayed → notify project lead',
        description: 'When a milestone is delayed, notify the person who triggered it.',
        workflow: {
            triggerType: 'milestone_delayed',
            triggerConfig: {},
            conditions: [],
            actions: [
                {
                    type: 'notify',
                    config: {
                        users: ['creator'],
                        title: 'Milestone delayed',
                        description: 'Milestone "{{title}}" is delayed and needs attention.',
                        actionUrl: '/projects',
                    },
                },
            ],
        },
    },
    {
        id: 'new_employee_welcome',
        name: 'New employee → welcome notification',
        description: 'When a new account joins, send a welcome notification.',
        workflow: {
            triggerType: 'user_joined',
            triggerConfig: {},
            conditions: [],
            actions: [
                {
                    type: 'notify',
                    config: {
                        users: ['actor'],
                        title: 'Welcome aboard!',
                        description: 'Thanks for joining the workspace.',
                    },
                },
            ],
        },
    },
];
//# sourceMappingURL=automation.types.js.map