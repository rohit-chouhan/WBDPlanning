const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
// Serve static files from the 'dist' directory
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.send(`
  <html>
    <head>
      <script src="http://localhost:3000/dist/SmartFlatFileLoad.bundle.js"></script>
    </head>
    <body>
    <com-rohitchouhan-smartflatfileload></com-rohitchouhan-smartflatfileload>
    </body>
  </html>
  `);
});

app.listen(port, () => {
  console.log(`Server Started At : http://localhost:${port}`);
});
