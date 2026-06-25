import { OpenAPIObject } from '@nestjs/swagger';
import { RedocOptions } from '../interfaces';

const HEX_COLOR = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

type Spec =
  | {
      type: 'string';
      optional?: true;
      default?: string;
      uri?: true;
      regex?: RegExp;
    }
  | { type: 'boolean'; optional?: true; default?: boolean }
  | { type: 'any'; optional?: true; default?: unknown }
  | { type: 'object'; optional?: true; keys: Record<string, Spec> }
  | { type: 'array'; optional?: true; item: Spec };

function buildSpec(document: OpenAPIObject): Spec {
  return {
    type: 'object',
    keys: {
      redocVersion: { type: 'string', default: 'latest' },
      title: {
        type: 'string',
        optional: true,
        default: document.info ? document.info.title : 'Swagger documentation',
      },
      favicon: { type: 'string', optional: true },
      logo: {
        type: 'object',
        optional: true,
        keys: {
          url: { type: 'string', optional: true, uri: true },
          backgroundColor: { type: 'string', optional: true, regex: HEX_COLOR },
          altText: { type: 'string', optional: true },
          href: { type: 'string', optional: true, uri: true },
        },
      },
      theme: { type: 'any', optional: true },
      untrustedSpec: { type: 'boolean', optional: true, default: false },
      supressWarnings: { type: 'boolean', optional: true, default: true },
      hideHostname: { type: 'boolean', optional: true, default: false },
      expandResponses: { type: 'string', optional: true },
      requiredPropsFirst: { type: 'boolean', optional: true, default: true },
      sortPropsAlphabetically: {
        type: 'boolean',
        optional: true,
        default: true,
      },
      showExtensions: { type: 'any', optional: true, default: false },
      noAutoAuth: { type: 'boolean', optional: true, default: true },
      pathInMiddlePanel: { type: 'boolean', optional: true, default: false },
      hideLoading: { type: 'boolean', optional: true, default: false },
      nativeScrollbars: { type: 'boolean', optional: true, default: false },
      hideDownloadButton: { type: 'boolean', optional: true, default: false },
      disableSearch: { type: 'boolean', optional: true, default: false },
      onlyRequiredInSamples: {
        type: 'boolean',
        optional: true,
        default: false,
      },
      docName: { type: 'string', optional: true, default: 'swagger' },
      auth: {
        type: 'object',
        optional: true,
        keys: {
          enabled: { type: 'boolean', optional: true, default: false },
          user: { type: 'string', default: 'admin' },
          password: { type: 'string', default: '123' },
        },
      },
      tagGroups: {
        type: 'array',
        optional: true,
        item: {
          type: 'object',
          keys: {
            name: { type: 'string' },
            tags: { type: 'array', item: { type: 'string' } },
          },
        },
      },
    },
  };
}

function validate(spec: Spec, value: unknown, path: string): unknown {
  if (value === undefined) {
    if ('default' in spec && spec.default !== undefined) {
      return spec.default;
    }
    return undefined;
  }

  switch (spec.type) {
    case 'any':
      return value;
    case 'string': {
      if (typeof value !== 'string') {
        throw new TypeError(`"${path}" must be a string`);
      }
      if (spec.uri) {
        try {
          new URL(value);
        } catch {
          throw new TypeError(`"${path}" must be a valid uri`);
        }
      }
      if (spec.regex && !spec.regex.test(value)) {
        throw new TypeError(
          `"${path}" with value "${value}" fails to match the required pattern: ${spec.regex}`,
        );
      }
      return value;
    }
    case 'boolean': {
      if (typeof value !== 'boolean') {
        throw new TypeError(`"${path}" must be a boolean`);
      }
      return value;
    }
    case 'object': {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`"${path}" must be of type object`);
      }
      const input = value as Record<string, unknown>;
      for (const key of Object.keys(input)) {
        if (!(key in spec.keys)) {
          throw new TypeError(
            `"${path ? `${path}.` : ''}${key}" is not allowed`,
          );
        }
      }
      const out: Record<string, unknown> = {};
      for (const [key, childSpec] of Object.entries(spec.keys)) {
        const child = validate(
          childSpec,
          input[key],
          path ? `${path}.${key}` : key,
        );
        if (child !== undefined) {
          out[key] = child;
        }
      }
      return out;
    }
    case 'array': {
      if (!Array.isArray(value)) {
        throw new TypeError(`"${path}" must be an array`);
      }
      return value.map((item, index) =>
        validate(spec.item, item, `${path}[${index}]`),
      );
    }
  }
}

export const schema = (document: OpenAPIObject) => ({
  validateAsync: async (options: unknown): Promise<RedocOptions> =>
    validate(buildSpec(document), options, '') as RedocOptions,
});
