import 'reflect-metadata';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { schema } from './options.model';

describe('options.models.ts', () => {
  it('should work for a swagger document without document.info', async () => {
    const module = await Test.createTestingModule({}).compile();
    const app = module.createNestApplication();
    const swaggerDoc = SwaggerModule.createDocument(app, {} as any);
    expect(schema(swaggerDoc)).toBeTruthy();
  });
  it('should work for a swagger document with document.info.title', async () => {
    const module = await Test.createTestingModule({}).compile();
    const app = module.createNestApplication();
    const document = new DocumentBuilder().setTitle('a title').build();
    const swaggerDoc = SwaggerModule.createDocument(app, document);
    expect(schema(swaggerDoc)).toBeTruthy();
  });

  describe('validation behavior', () => {
    let doc: ReturnType<typeof SwaggerModule.createDocument>;

    beforeEach(async () => {
      const module = await Test.createTestingModule({}).compile();
      const app = module.createNestApplication();
      const builder = new DocumentBuilder().setTitle('a title').build();
      doc = SwaggerModule.createDocument(app, builder);
    });

    it('applies all scalar defaults for an empty object', async () => {
      const result = (await schema(doc).validateAsync({})) as Record<
        string,
        unknown
      >;
      expect(result.redocVersion).toBe('latest');
      expect(result.title).toBe('a title');
      expect(result.untrustedSpec).toBe(false);
      expect(result.supressWarnings).toBe(true);
      expect(result.requiredPropsFirst).toBe(true);
      expect(result.sortPropsAlphabetically).toBe(true);
      expect(result.showExtensions).toBe(false);
      expect(result.noAutoAuth).toBe(true);
      expect(result.docName).toBe('swagger');
      expect(result.logo).toBeUndefined();
      expect(result.auth).toBeUndefined();
      expect(result.tagGroups).toBeUndefined();
    });

    it('fills nested auth defaults when auth is provided empty', async () => {
      const result = (await schema(doc).validateAsync({ auth: {} })) as Record<
        string,
        unknown
      >;
      expect(result.auth).toEqual({
        enabled: false,
        user: 'admin',
        password: '123',
      });
    });

    it('keeps provided auth values and fills the rest', async () => {
      const result = (await schema(doc).validateAsync({
        auth: { enabled: true, user: 'bob' },
      })) as Record<string, unknown>;
      expect(result.auth).toEqual({
        enabled: true,
        user: 'bob',
        password: '123',
      });
    });

    it('rejects an unknown top-level key', async () => {
      await expect(schema(doc).validateAsync({ nope: 1 })).rejects.toThrow(
        '"nope" is not allowed',
      );
    });

    it('rejects an unknown nested key', async () => {
      await expect(
        schema(doc).validateAsync({ logo: { extra: 1 } }),
      ).rejects.toThrow('"logo.extra" is not allowed');
    });

    it('rejects a non-boolean with the joi-style message', async () => {
      await expect(
        schema(doc).validateAsync({ untrustedSpec: 'no' }),
      ).rejects.toThrow('"untrustedSpec" must be a boolean');
    });

    it('rejects an invalid logo url with the exact joi message', async () => {
      await expect(
        schema(doc).validateAsync({ logo: { url: 'notaUrl' } }),
      ).rejects.toThrow('"logo.url" must be a valid uri');
    });

    it('accepts a valid logo url', async () => {
      const result = (await schema(doc).validateAsync({
        logo: { url: 'http://localhost:3333/test.png' },
      })) as Record<string, unknown>;
      expect((result.logo as { url: string }).url).toBe(
        'http://localhost:3333/test.png',
      );
    });

    it('rejects a logo backgroundColor that is not a hex color', async () => {
      await expect(
        schema(doc).validateAsync({ logo: { backgroundColor: 'notHex' } }),
      ).rejects.toThrow(
        '"logo.backgroundColor" with value "notHex" fails to match the required pattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/',
      );
    });

    it('accepts valid hex colors', async () => {
      const result = (await schema(doc).validateAsync({
        logo: { backgroundColor: '#008080' },
      })) as Record<string, unknown>;
      expect((result.logo as { backgroundColor: string }).backgroundColor).toBe(
        '#008080',
      );
    });

    it('rejects a non-string tagGroups item name', async () => {
      await expect(
        schema(doc).validateAsync({ tagGroups: [{ name: 5, tags: ['a'] }] }),
      ).rejects.toThrow('"tagGroups[0].name" must be a string');
    });

    it('accepts well-formed tagGroups', async () => {
      const result = (await schema(doc).validateAsync({
        tagGroups: [{ name: 'g', tags: ['a', 'b'] }],
      })) as Record<string, unknown>;
      expect(result.tagGroups).toEqual([{ name: 'g', tags: ['a', 'b'] }]);
    });

    it('preserves an arbitrary theme object without rejecting unknown keys', async () => {
      const result = (await schema(doc).validateAsync({
        theme: { nestedRandom: 1 },
      })) as Record<string, unknown>;
      expect(result.theme).toEqual({ nestedRandom: 1 });
    });

    it('rejects a non-string favicon as TypeError', async () => {
      await expect(
        schema(doc).validateAsync({ favicon: false }),
      ).rejects.toThrow(TypeError);
      await expect(
        schema(doc).validateAsync({ favicon: false }),
      ).rejects.toThrow('"favicon" must be a string');
    });
  });
});
