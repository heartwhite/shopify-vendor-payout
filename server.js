require('isomorphic-fetch');
const dotenv = require('dotenv');
const Koa = require('koa');
const KoaRouter = require('koa-router');
const koaBody = require('koa-body');
const next = require('next');
const { default: createShopifyAuth } = require('@shopify/koa-shopify-auth');
const CORS = require('@koa/cors');
const { verifyRequest } = require('@shopify/koa-shopify-auth');
const session = require('koa-session');
const axios = require('axios');
const xlsx = require('xlsx');
const fs = require('fs');

dotenv.config();
const { default: graphQLProxy } = require('@shopify/koa-shopify-graphql-proxy');
const { ApiVersion } = require('@shopify/koa-shopify-graphql-proxy');

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const { SHOPIFY_API_SECRET_KEY, SHOPIFY_API_KEY } = process.env;

const server = new Koa();
const router = new KoaRouter();

const products = [{ image1: 'test' }];

router.get('/api/products', koaBody(), async (ctx) => {
  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  ctx.set('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
  try {
    ctx.body = {
      status: 'success',
      data: products,
    };
  } catch (error) {
    console.error(error);
  }
});

router.post('/api/products', koaBody(), async (ctx) => {
  try {
    const body = ctx.request.body;
    products.push(body);
    ctx.body = 'item added';
  } catch (error) {
    console.log(error);
  }
});

router.post('/api/orders', koaBody(), async (ctx) => {
  try {
    const body = ctx.request.body;
    const response = await axios.get(body.url);
    ctx.body = response.data;
  } catch (error) {
    console.log('******ERROR*******', error);
  }
});
router.post('/upload', koaBody(), (ctx) => {
  const newWB = xlsx.utils.book_new();
  const newWS = xlsx.utils.json_to_sheet(ctx.request.body.dataArray);
  xlsx.utils.book_append_sheet(newWB, newWS, 'New Data');
  const stream = xlsx.stream.to_csv(newWS);
  stream.pipe(fs.createWriteStream(`./public/${ctx.request.body.name}.csv`));
  ctx.body = 'it is ok';
});

// Router middelware
server.use(CORS({ origin: '*' }));
server.use(router.allowedMethods({}));

server.use(router.routes());
app.prepare().then(() => {
  server.use(session({ sameSite: 'none', secure: true }, server));
  server.keys = [SHOPIFY_API_SECRET_KEY];

  server.use(
    createShopifyAuth({
      apiKey: SHOPIFY_API_KEY,
      secret: SHOPIFY_API_SECRET_KEY,
      scopes: [
        'read_products',
        'write_products',
        'read_script_tags',
        'write_script_tags',
        'read_orders',
      ],
      afterAuth(ctx) {
        const { shop, accessToken } = ctx.session;
        ctx.cookies.set('shopOrigin', shop, {
          httpOnly: false,
          secure: true,
          sameSite: 'none',
        });
        ctx.redirect('/');
      },
    }),
  );

  server.use(graphQLProxy({ version: ApiVersion.July20 }));
  server.use(verifyRequest());

  server.use(async (ctx) => {
    await handle(ctx.req, ctx.res);
    ctx.respond = false;
    ctx.res.statusCode = 200;
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
