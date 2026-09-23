const app = require('./app');
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`[${process.env.SERVER_NAME || 'server'}] listening on port ${PORT}`);
});
