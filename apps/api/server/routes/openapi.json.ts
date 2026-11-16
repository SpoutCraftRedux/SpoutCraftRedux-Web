const p = (name: string, description: string) => ({ name, in: 'path', required: true, description, schema: { type: 'string' } })
const project = p('project', 'spoutcraftredux-server or spoutcraftredux-fabric')
const version = p('version', 'Minecraft version, e.g. 26.3')
const build = p('build', 'Build number or "latest"')

export default defineEventHandler(() => ({
  openapi: '3.1.0',
  info: { title: 'SpoutCraft Redux Downloads API', version: '2.0.0', description: 'Builds of the SpoutCraft Redux server and client.' },
  servers: [{ url: 'https://api.spoutcraftredux.org' }],
  paths: {
    '/v2': { get: { summary: 'List projects', responses: { 200: { description: 'Projects' } } } },
    '/v2/{project}': { get: { summary: 'List versions of a project', parameters: [project], responses: { 200: { description: 'Versions' } } } },
    '/v2/{project}/{version}': {
      get: { summary: 'List builds of a version', parameters: [project, version], responses: { 200: { description: 'Builds' } } },
      post: {
        summary: 'Upload a build (CI only)',
        parameters: [project, version],
        security: [{ bearer: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  build: { type: 'string' },
                  result: { type: 'string', enum: ['SUCCESS', 'FAILURE'] },
                  duration: { type: 'integer' },
                  timestamp: { type: 'integer' },
                  commits: { type: 'string', description: 'JSON array of {author,email,description,hash,timestamp}' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Created' }, 401: { description: 'Unauthorized' }, 409: { description: 'Build exists' } }
      }
    },
    '/v2/{project}/{version}/{build}': { get: { summary: 'Build details', parameters: [project, version, build], responses: { 200: { description: 'Build' } } } },
    '/v2/{project}/{version}/{build}/download': { get: { summary: 'Download the jar', parameters: [project, version, build], responses: { 200: { description: 'Jar file' } } } }
  },
  components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } }
}))
