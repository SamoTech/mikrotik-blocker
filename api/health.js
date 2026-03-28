module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ status: 'ok', time: new Date().toISOString(), runtime: 'vercel-serverless' });
};
