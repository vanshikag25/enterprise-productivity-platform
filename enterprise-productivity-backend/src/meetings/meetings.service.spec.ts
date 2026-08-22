import { MeetingsService } from './meetings.service';

describe('MeetingsService', () => {
  it('builds a shareable meeting URL from a meeting code', () => {
    const service = new MeetingsService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    expect((service as any).buildMeetingUrl('PING1234')).toBe('/meet/PING1234');
  });

  it('does not include meeting_code in inserts when the database column is missing', async () => {
    const streamClient = {
      channel: jest.fn().mockReturnValue({
        create: jest.fn().mockResolvedValue({}),
        id: 'meeting-channel-id',
      }),
    };

    const db = {
      execute: jest.fn().mockResolvedValue({ rows: [] }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([]),
        }),
      }),
    };

    const service = new MeetingsService(
      db as any,
      { getClient: () => streamClient } as any,
      { createMany: jest.fn().mockResolvedValue([]) } as any,
      { confirmSourceMessage: jest.fn().mockResolvedValue(undefined) } as any,
    );

    jest.spyOn(service as any, 'meetingsSchemaHasMeetingUrl').mockResolvedValue(false);
    jest.spyOn(service as any, 'meetingsSchemaHasMeetingCode').mockResolvedValue(false);

    const fallbackSpy = jest.spyOn(service as any, 'insertMeetingRecordFallback').mockResolvedValue({
      id: 'meeting-id',
      title: 'Weekly sync',
      description: 'desc',
      agenda: 'Agenda',
      notes: 'Notes',
      attachments: [],
      recordingLink: null,
      meetingCode: null,
      meetingUrl: '/meet/ABCD1234',
      scheduledDate: new Date('2026-08-22T10:00:00.000Z'),
      startTime: '15:00',
      endTime: '16:00',
      organizerId: 'superadmin',
      participants: ['superadmin', 'demo1'],
      meetingStatus: 'Scheduled',
      meetingChatChannelId: 'meeting-channel-id',
      sourceChannelId: null,
      sourceMessageId: null,
      sourceSenderId: null,
      sourceChannelName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create('superadmin', {
      title: 'Weekly sync',
      description: 'desc',
      agenda: 'Agenda',
      notes: 'Notes',
      attachments: [],
      scheduledDate: new Date('2026-08-22T10:00:00.000Z').toISOString(),
      startTime: '15:00',
      endTime: '16:00',
      participants: ['superadmin', 'demo1'],
      meetingStatus: 'Scheduled',
    } as any);

    expect(result).toBeTruthy();
    expect(fallbackSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Weekly sync',
        meetingStatus: 'Scheduled',
      }),
    );
    expect(fallbackSpy.mock.calls[0][0]).not.toHaveProperty('meetingCode');
    expect(result.meetingUrl).toMatch(/^\/meet\//);
  });

  it('uses a raw SQL fallback for join when the live table is missing meeting_code', async () => {
    const db = {
      execute: jest.fn().mockResolvedValue({ rows: [{
        id: 'meeting-id',
        title: 'Weekly sync',
        description: 'desc',
        agenda: 'Agenda',
        notes: 'Notes',
        attachments: [],
        recording_link: null,
        meeting_code: null,
        meeting_url: '/meet/ABCD1234',
        scheduled_date: new Date('2026-08-22T10:00:00.000Z'),
        start_time: '15:00',
        end_time: '16:00',
        organizer_id: 'superadmin',
        participants: ['superadmin', 'demo1'],
        meeting_status: 'Scheduled',
        meeting_chat_channel_id: 'meeting-channel-id',
        source_channel_id: null,
        source_message_id: null,
        source_sender_id: null,
        source_channel_name: null,
        created_at: new Date(),
        updated_at: new Date(),
      }] }),
      update: jest.fn(),
    };

    const streamClient = {
      channel: jest.fn().mockReturnValue({
        addMembers: jest.fn().mockResolvedValue({}),
      }),
    };

    const service = new MeetingsService(
      db as any,
      { getClient: () => streamClient } as any,
      { createMany: jest.fn().mockResolvedValue([]) } as any,
      { confirmSourceMessage: jest.fn().mockResolvedValue(undefined) } as any,
    );

    jest.spyOn(service as any, 'findOne').mockResolvedValue({
      id: 'meeting-id',
      title: 'Weekly sync',
      description: 'desc',
      agenda: 'Agenda',
      notes: 'Notes',
      attachments: [],
      recordingLink: null,
      meetingCode: null,
      meetingUrl: '/meet/ABCD1234',
      scheduledDate: new Date('2026-08-22T10:00:00.000Z'),
      startTime: '15:00',
      endTime: '16:00',
      organizerId: 'superadmin',
      participants: ['superadmin'],
      meetingStatus: 'Scheduled',
      meetingChatChannelId: 'meeting-channel-id',
      sourceChannelId: null,
      sourceMessageId: null,
      sourceSenderId: null,
      sourceChannelName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    jest.spyOn(service as any, 'requireMeetingAccess').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'meetingsSchemaHasMeetingUrl').mockResolvedValue(true);
    jest.spyOn(service as any, 'meetingsSchemaHasMeetingCode').mockResolvedValue(false);

    const result = await service.join('meeting-id', 'demo1');

    expect(db.update).not.toHaveBeenCalled();
    expect(db.execute).toHaveBeenCalled();
    expect(result.participants).toEqual(['superadmin', 'demo1']);
  });
});
