// /**
//  * infra/loadBalancer.js
//  * Simple round-robin load balancer distributing requests to server1/2/3,
//  * matching the diagram: client -> rate limiting -> load balancer -> servers.
//  *
//  * NOTE: this is a lightweight dev/demo load balancer. In real production
//  * you'd normally use nginx, an AWS ALB, Cloudflare, etc. This file exists
//  * so you can `node infra/loadBalancer.js` and hit one port (8080) locally
//  * while the 3 servers run behind it.
//  *
//  * Run with: node infra/loadBalancer.js
//  * (after starting server1 on 5001, server2 on 5002, server3 on 5003)
//  */
// require('dotenv').config();
// const http = require('http');
// const httpProxy = require('http-proxy');

// const targets = (process.env.BACKEND_TARGETS || 'http://localhost:5001,http://localhost:5002,http://localhost:5003').split(',');
// const PORT = process.env.LB_PORT || 8080;

// const proxy = httpProxy.createProxyServer({});
// let i = 0;

// const server = http.createServer((req, res) => {
//   const target = targets[i % targets.length];
//   i += 1;
//   proxy.web(req, res, { target, changeOrigin: true }, (err) => {
//     console.error('proxy error ->', target, err.message);
//     res.writeHead(502);
//     res.end('bad gateway');
//   });
// });

// server.listen(PORT, () => {
//   console.log(`[load-balancer] listening on ${PORT}, forwarding to: ${targets.join(', ')}`);
// });




/**
 * infra/loadBalancer.js
 * Simple round-robin load balancer distributing requests to server1/2/3,
 * matching the diagram: client -> rate limiting -> load balancer -> servers.
 *
 * NOTE: this is a lightweight dev/demo load balancer. In real production
 * you'd normally use nginx, an AWS ALB, Cloudflare, etc. This file exists
 * so you can `node infra/loadBalancer.js` and hit one port (8080) locally
 * while the 3 servers run behind it.
 *
 * Run with: node infra/loadBalancer.js
 * (after starting server1 on 5001, server2 on 5002, server3 on 5003)
 */
require('dotenv').config();
const http = require('http');
const httpProxy = require('http-proxy');

const targets = (process.env.BACKEND_TARGETS || 'http://localhost:5001,http://localhost:5002,http://localhost:5003').split(',');
const PORT = process.env.LB_PORT || 8081;

const proxy = httpProxy.createProxyServer({});
let i = 0;

const server = http.createServer((req, res) => {
  const target = targets[i % targets.length];
  i += 1;
  console.log(`[load-balancer] ${req.method} ${req.url}  ->  ${target}`);
  proxy.web(req, res, { target, changeOrigin: true }, (err) => {
    console.error('proxy error ->', target, err.message);
    res.writeHead(502);
    res.end('bad gateway');
  });
});

server.listen(PORT, () => {
  console.log(`[load-balancer] listening on ${PORT}, forwarding to: ${targets.join(', ')}`);
});