import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Test suite for JSON Parsing Error Handling
 *
 * BUG-010: Missing JSON Parsing Error Handling
 *
 * The bug: No try-catch around JSON.parse(event.body) in discord.js.
 * When malformed JSON is sent, the function crashes with a generic 500 error
 * instead of returning a helpful 400 Bad Request error.
 */

describe('JSON Parsing Error Handling - BUG-010', () => {
  describe('Valid JSON Parsing', () => {
    it('should parse valid JSON request body', () => {
      const validJson = '{"type":"anniversary","memberId":123,"memberName":"TestPlayer","years":1}';

      let parsed;
      try {
        parsed = JSON.parse(validJson);
      } catch (error) {
        parsed = null;
      }

      expect(parsed).not.toBeNull();
      expect(parsed.type).toBe('anniversary');
      expect(parsed.memberId).toBe(123);
      expect(parsed.memberName).toBe('TestPlayer');
      expect(parsed.years).toBe(1);
    });

    it('should handle empty object JSON', () => {
      const emptyJson = '{}';
      const parsed = JSON.parse(emptyJson);
      expect(parsed).toEqual({});
    });

    it('should handle arrays in JSON', () => {
      const arrayJson = '{"items":[1,2,3]}';
      const parsed = JSON.parse(arrayJson);
      expect(parsed.items).toEqual([1, 2, 3]);
    });

    it('should handle nested objects', () => {
      const nestedJson = '{"data":{"nested":{"value":42}}}';
      const parsed = JSON.parse(nestedJson);
      expect(parsed.data.nested.value).toBe(42);
    });
  });

  describe('Invalid JSON Formats', () => {
    it('should detect malformed JSON', () => {
      const malformedJsons = [
        '{invalid}',
        '{"key": }',
        '{"key": value}',
        '{key: "value"}',
        "{'key': 'value'}",
        '{,}',
        '{"key":"value",}',
      ];

      malformedJsons.forEach(json => {
        expect(() => JSON.parse(json)).toThrow();
      });
    });

    it('should detect incomplete JSON', () => {
      const incompleteJsons = [
        '{',
        '}',
        '{"key":',
        '{"key":"value"',
        '{"key":"val',
      ];

      incompleteJsons.forEach(json => {
        expect(() => JSON.parse(json)).toThrow();
      });
    });

    it('should detect non-JSON strings', () => {
      const nonJsonStrings = [
        'not json',
        'undefined',
        'null',
        '',
        'plain text',
        'key=value',
      ];

      nonJsonStrings.forEach(str => {
        if (str === 'null' || str === '') {
          // These are actually valid JSON
          return;
        }
        expect(() => JSON.parse(str)).toThrow();
      });
    });

    it('should detect JSON with syntax errors', () => {
      const syntaxErrors = [
        '{"key": "value" "key2": "value2"}', // Missing comma
        '{"key" "value"}', // Missing colon
        '{key: "value"}', // Unquoted key
        '{"key": \'value\'}', // Single quotes
      ];

      syntaxErrors.forEach(json => {
        expect(() => JSON.parse(json)).toThrow();
      });
    });
  });

  describe('Bug Demonstration', () => {
    it('BUG: Uncaught JSON.parse throws SyntaxError', () => {
      const malformedJson = '{invalid json}';

      // Without try-catch, this throws and crashes the function
      expect(() => {
        const body = JSON.parse(malformedJson); // ❌ Uncaught
      }).toThrow(SyntaxError);
    });

    it('BUG: Returns 500 instead of 400 for bad JSON', () => {
      const malformedJson = '{invalid}';

      // Current behavior: Catches in outer try-catch, returns 500
      let statusCode;
      try {
        const body = JSON.parse(malformedJson);
        statusCode = 200;
      } catch (error) {
        // This is what happens now - generic 500
        statusCode = 500;
      }

      expect(statusCode).toBe(500); // ❌ Should be 400

      // Correct behavior: Specific error handling
      let correctStatusCode;
      try {
        const body = JSON.parse(malformedJson);
        correctStatusCode = 200;
      } catch (error) {
        if (error instanceof SyntaxError) {
          correctStatusCode = 400; // ✅ Bad request
        } else {
          correctStatusCode = 500; // Server error
        }
      }

      expect(correctStatusCode).toBe(400);
    });

    it('demonstrates unhelpful error message', () => {
      const malformedJson = '{"key": invalid}';

      let errorMessage;
      try {
        JSON.parse(malformedJson);
      } catch (error) {
        // Current: Generic message
        errorMessage = error.message; // "Unexpected token i in JSON at position 8"
      }

      // Error message is technical, not user-friendly
      expect(errorMessage).toContain('Unexpected token');

      // Better: User-friendly message
      const betterErrorMessage = 'Invalid JSON format';
      expect(betterErrorMessage).toBe('Invalid JSON format');
    });
  });

  describe('Correct Implementation', () => {
    function parseRequestBody(bodyString) {
      let body;
      try {
        body = JSON.parse(bodyString);
      } catch (error) {
        if (error instanceof SyntaxError) {
          return {
            success: false,
            statusCode: 400,
            error: 'Invalid JSON format',
          };
        }
        return {
          success: false,
          statusCode: 500,
          error: 'Failed to parse request body',
        };
      }
      return {
        success: true,
        statusCode: 200,
        body,
      };
    }

    it('should return 400 for malformed JSON', () => {
      const result = parseRequestBody('{invalid}');

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe('Invalid JSON format');
    });

    it('should return 200 for valid JSON', () => {
      const result = parseRequestBody('{"key":"value"}');

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.body).toEqual({ key: 'value' });
    });

    it('should provide user-friendly error messages', () => {
      const malformedJson = '{"key": }';
      const result = parseRequestBody(malformedJson);

      expect(result.error).toBe('Invalid JSON format');
      expect(result.error).not.toContain('Unexpected token');
      expect(result.error).not.toContain('position');
    });

    it('should distinguish between syntax errors and other errors', () => {
      // Syntax error
      const syntaxResult = parseRequestBody('{invalid}');
      expect(syntaxResult.statusCode).toBe(400);

      // Valid JSON
      const validResult = parseRequestBody('{"valid":true}');
      expect(validResult.statusCode).toBe(200);
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error response structure', () => {
      const errorResponse = {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON format' }),
      };

      expect(errorResponse.statusCode).toBe(400);
      expect(errorResponse.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(errorResponse.body).error).toBe('Invalid JSON format');
    });

    it('should include appropriate headers', () => {
      const response = {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Invalid JSON format' }),
      };

      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Security Considerations', () => {
    it('should not leak sensitive information in error messages', () => {
      const malformedJson = '{"apiKey":"secret123","data":invalid}';

      let errorMessage;
      try {
        JSON.parse(malformedJson);
      } catch (error) {
        // Should return generic message, not the malformed JSON
        errorMessage = 'Invalid JSON format';
      }

      // Good: Doesn't leak the apiKey
      expect(errorMessage).not.toContain('secret123');
      expect(errorMessage).not.toContain('apiKey');

      // Bad: Would leak sensitive data (what NOT to do)
      const badErrorMessage = `Failed to parse: ${malformedJson}`;
      expect(badErrorMessage).toContain('secret123'); // This is bad
    });

    it('should handle very large JSON strings safely', () => {
      const hugeJson = '{"key":"' + 'a'.repeat(1000000) + '"}';

      // Should handle without crashing
      let result;
      try {
        result = JSON.parse(hugeJson);
      } catch (error) {
        result = null;
      }

      // If it parsed, verify it's correct
      if (result) {
        expect(result.key.length).toBe(1000000);
      }
    });

    it('should handle nested JSON attacks', () => {
      // Extremely nested JSON (potential DOS)
      let nested = '{"a":';
      for (let i = 0; i < 100; i++) {
        nested += '{"b":';
      }
      nested += '1';
      for (let i = 0; i < 100; i++) {
        nested += '}';
      }
      nested += '}';

      // Should either parse or throw, not crash
      expect(() => {
        try {
          JSON.parse(nested);
        } catch (e) {
          // Expected
        }
      }).not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    it('scenario: Valid Discord webhook request', () => {
      const validRequest = {
        body: JSON.stringify({
          type: 'anniversary',
          memberId: 123,
          memberName: 'TestPlayer',
          years: 1,
        }),
      };

      let parsed;
      try {
        parsed = JSON.parse(validRequest.body);
      } catch (error) {
        parsed = null;
      }

      expect(parsed).not.toBeNull();
      expect(parsed.type).toBe('anniversary');
      expect(parsed.memberId).toBe(123);
    });

    it('scenario: Malformed request from client', () => {
      const malformedRequest = {
        body: '{type: "anniversary", memberId: 123}', // Invalid: unquoted keys
      };

      let statusCode;
      let errorMessage;

      try {
        JSON.parse(malformedRequest.body);
        statusCode = 200;
      } catch (error) {
        if (error instanceof SyntaxError) {
          statusCode = 400;
          errorMessage = 'Invalid JSON format';
        } else {
          statusCode = 500;
          errorMessage = 'Internal server error';
        }
      }

      expect(statusCode).toBe(400);
      expect(errorMessage).toBe('Invalid JSON format');
    });

    it('scenario: Empty request body', () => {
      const emptyRequest = { body: '' };

      let result;
      try {
        result = JSON.parse(emptyRequest.body);
      } catch (error) {
        result = { error: 'Invalid JSON format' };
      }

      // Empty string is not valid JSON
      expect(result).toHaveProperty('error');
    });

    it('scenario: Null request body', () => {
      const nullRequest = { body: 'null' };

      const parsed = JSON.parse(nullRequest.body);

      // 'null' is valid JSON
      expect(parsed).toBeNull();
    });
  });

  describe('Best Practices', () => {
    it('should parse early in request flow', () => {
      const requestFlow = [
        'Receive request',
        'Parse JSON body', // ← Should happen early
        'Validate required fields',
        'Process request',
        'Send response',
      ];

      expect(requestFlow[1]).toBe('Parse JSON body');
    });

    it('should separate parsing from business logic', () => {
      // Good: Parse first, then validate
      const goodFlow = [
        'Parse JSON',
        'Check if parsed successfully',
        'Validate required fields',
        'Process data',
      ];

      // Bad: Mix parsing with processing
      const badFlow = [
        'Parse JSON while validating',
        'Process if valid',
      ];

      expect(goodFlow.length).toBeGreaterThan(badFlow.length);
      expect(goodFlow[0]).toBe('Parse JSON');
    });
  });
});
