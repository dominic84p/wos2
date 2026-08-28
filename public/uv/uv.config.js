/* Ultraviolet Configuration pointing to Dedicated VPS Bare Server */
self.__uv$config = {
  prefix: '/uv/service/',
  bare: 'http://4.239.151.205/bare/',
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: '/uv/uv.handler.js',
  client: '/uv/uv.client.js',
  bundle: '/uv/uv.bundle.js',
  config: '/uv/uv.config.js',
  sw: '/uv/uv.sw.js',
};
