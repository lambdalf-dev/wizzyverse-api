import { AntiCheatService } from '../lib/anti-cheat-service';
import { ScoreEntry } from '../types/score';

describe('AntiCheatService', () => {
  let antiCheatService: AntiCheatService;

  beforeEach(() => {
    antiCheatService = new AntiCheatService();
  });

  const createMockSession = (overrides: Partial<ScoreEntry> = {}): ScoreEntry => ({
    address: '0x1234567890123456789012345678901234567890',
    gameStartTime: new Date('2024-01-01T10:00:00.000Z'),
    clientStartTime: '2024-01-01T10:00:00.000Z',
    lastUpdate: new Date('2024-01-01T10:00:00.000Z'),
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ...overrides
  });

  describe('validateGameSession', () => {

    it('should validate a legitimate game session', () => {
      const session = createMockSession();
      const endTime = new Date('2024-01-01T10:05:00.000Z'); // 5 minutes later
      const endClientTime = '2024-01-01T10:05:00.000Z';
      const score = 300; // Reasonable score for 5 minutes

      const result = antiCheatService.validateGameSession(
        session,
        endClientTime,
        endTime,
        '192.168.1.1', // Same IP
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', // Same UA
        score
      );

      expect(result.isValid).toBe(true);
      expect(result.rejectionReason).toBeUndefined();
    });

    it('should reject session that is too long', () => {
      const session = createMockSession();
      const endTime = new Date('2024-01-01T10:35:00.000Z'); // 35 minutes later
      const endClientTime = '2024-01-01T10:35:00.000Z';
      const score = 1000;

      const result = antiCheatService.validateGameSession(
        session,
        endClientTime,
        endTime,
        '192.168.1.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        score
      );

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('session duration is too long');
    });

    it('should reject score that is too high for session duration', () => {
      const session = createMockSession();
      const endTime = new Date('2024-01-01T10:05:00.000Z'); // 5 minutes later
      const endClientTime = '2024-01-01T10:05:00.000Z';
      const score = 10000; // Impossible score for 5 minutes

      const result = antiCheatService.validateGameSession(
        session,
        endClientTime,
        endTime,
        '192.168.1.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        score
      );

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('score too high');
    });

    it('should reject score that is too low for session duration', () => {
      const session = createMockSession();
      const endTime = new Date('2024-01-01T10:05:00.000Z'); // 5 minutes later
      const endClientTime = '2024-01-01T10:05:00.000Z';
      const score = 10; // Impossible score for 5 minutes

      const result = antiCheatService.validateGameSession(
        session,
        endClientTime,
        endTime,
        '192.168.1.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        score
      );

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('score too low');
    });

    it('should reject invalid score values', () => {
      const session = createMockSession();
      const endTime = new Date('2024-01-01T10:05:00.000Z');
      const endClientTime = '2024-01-01T10:05:00.000Z';

      // Test various invalid score values
      const invalidScores = [undefined, null, NaN, 'not a number', {}];

      invalidScores.forEach(score => {
        const result = antiCheatService.validateGameSession(
          session,
          endClientTime,
          endTime,
          '192.168.1.1',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          score as any
        );

        expect(result.isValid).toBe(false);
        expect(result.rejectionReason).toBe('invalid score value');
      });
    });

    it('should reject IP change on desktop device', () => {
      const session = createMockSession({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
      const endTime = new Date('2024-01-01T10:05:00.000Z');
      const endClientTime = '2024-01-01T10:05:00.000Z';
      const score = 300;

      const result = antiCheatService.validateGameSession(
        session,
        endClientTime,
        endTime,
        '192.168.1.2', // Different IP
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        score
      );

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('suspicious IP address change on computer');
    });

    it('should allow IP change on mobile device', () => {
      const session = createMockSession({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      });
      const endTime = new Date('2024-01-01T10:05:00.000Z');
      const endClientTime = '2024-01-01T10:05:00.000Z';
      const score = 300;

      const result = antiCheatService.validateGameSession(
        session,
        endClientTime,
        endTime,
        '192.168.1.2', // Different IP
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        score
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject User Agent change', () => {
      const session = createMockSession();
      const endTime = new Date('2024-01-01T10:05:00.000Z');
      const endClientTime = '2024-01-01T10:05:00.000Z';
      const score = 300;

      const result = antiCheatService.validateGameSession(
        session,
        endClientTime,
        endTime,
        '192.168.1.1',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', // Different UA
        score
      );

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('User Agent don\'t match');
    });

    it('should reject future timestamps', () => {
      const session = createMockSession();
      const futureTime = new Date(Date.now() + 60000); // 1 minute in future
      const futureClientTime = futureTime.toISOString();
      const score = 300;

      const result = antiCheatService.validateGameSession(
        session,
        futureClientTime,
        futureTime,
        '192.168.1.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        score
      );

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('missing time data');
    });

    it('should reject inconsistent network latency', () => {
      const session = createMockSession({
        clientStartTime: '2024-01-01T10:00:00.000Z',
        gameStartTime: new Date('2024-01-01T10:00:01.000Z') // 1 second difference
      });
      const endTime = new Date('2024-01-01T10:05:00.000Z');
      const endClientTime = '2024-01-01T10:05:40.000Z'; // 40 second difference (creates 39s latency difference, exceeds 35s tolerance)
      const score = 300;

      const result = antiCheatService.validateGameSession(
        session,
        endClientTime,
        endTime,
        '192.168.1.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        score
      );

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('network delay don\'t match');
    });
  });

  describe('calculateScoreRange', () => {
    it('should calculate correct score range for 5-minute session', () => {
      const session = createMockSession();
      const endTime = new Date('2024-01-01T10:05:00.000Z');
      const durationMs = endTime.getTime() - session.gameStartTime.getTime();

      const result = antiCheatService.validateGameSession(
        session,
        '2024-01-01T10:05:00.000Z',
        endTime,
        '192.168.1.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        300
      );

      expect(result.isValid).toBe(true);
    });

    it('should calculate correct score range for 10-minute session', () => {
      const session = createMockSession();
      const endTime = new Date('2024-01-01T10:10:00.000Z');
      const durationMs = endTime.getTime() - session.gameStartTime.getTime();

      const result = antiCheatService.validateGameSession(
        session,
        '2024-01-01T10:10:00.000Z',
        endTime,
        '192.168.1.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        600
      );

      expect(result.isValid).toBe(true);
    });

    it('should handle very long sessions where game becomes impossible', () => {
      // Create a session that's long enough to trigger the break condition (intervalAtTime <= 1)
      // This happens after 15 * 150 = 2250 seconds (37.5 minutes) when intervals become 1ms
      const session = createMockSession();
      const endTime = new Date('2024-01-01T10:40:00.000Z'); // 40 minutes later
      const score = 1; // Very low score for such a long session

      const result = antiCheatService.validateGameSession(
        session,
        '2024-01-01T10:40:00.000Z',
        endTime,
        '192.168.1.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        score
      );

      // Should be invalid due to session being too long (over 30 minutes)
      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('session duration is too long');
    });
  });

  describe('validateTimestamps', () => {
    it('should reject non-chronological time data', () => {
      const session = createMockSession({
        gameStartTime: new Date('2024-01-01T10:05:00.000Z') // Start time is AFTER end time
      });
      const endTime = new Date('2024-01-01T10:00:00.000Z'); // End time is BEFORE start time
      const endClientTime = '2024-01-01T10:00:00.000Z';
      const score = 300;

      const result = antiCheatService.validateGameSession(
        session,
        endClientTime,
        endTime,
        '192.168.1.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        score
      );

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('time data is not chronological');
    });
  });
}); 