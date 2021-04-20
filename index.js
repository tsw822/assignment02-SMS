const express = require('express');
const bodyParser = require("body-parser");
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const _ = require('underscore');

const port = process.env.PORT || parseInt(process.argv.pop()) || 3002;

server.listen(port, function () {
  console.log("Server listening at port %d", port);
});

const PopupMealEssentials = require("./PopupMealEssentials");
const e = require('express');
const { exception } = require('console');

// var id="12345A";
// var name = "Test";
// var address = "test address";
var paymentDetailReq = null;

// Create a new express application instance

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("www"));

let oSockets = {};
let oOrders = {};
let resScope;

app.post("/payment/", (req, res) => {
  console.log(req.body);
  var total = req.body.total;
  var orderId = req.body.orderId;
  var phone = req.body.phone;

  // console.log(req.body);
  function renderForm(){
    // your client id should be kept private
    const sClientID = process.env.SB_CLIENT_ID || 'put your client id here for testing ... Make sure that you delete it before committing'
    return(`
    <!DOCTYPE html>

    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1"> <!-- Ensures optimal rendering on mobile devices. -->
      <meta http-equiv="X-UA-Compatible" content="IE=edge" /> <!-- Optimal Internet Explorer compatibility -->
    </head>
    
    <body>
      <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
      <script
      src="https://www.paypal.com/sdk/js?client-id=${sClientID}"> // Required. Replace SB_CLIENT_ID with your sandbox client ID.
      </script>
      Thank you ${phone} for your order of $${total}.
      <div id="paypal-button-container"></div>

      <script>
        paypal.Buttons({
            createOrder: function(data, actions) {
              // This function sets up the details of the transaction, including the amount and line item details.
              return actions.order.create({
                purchase_units: [{
                  amount: {
                    value: '${total}'
                  }
                }]
              });
            },
            onApprove: function(data, actions) {
              // This function captures the funds from the transaction.
              return actions.order.capture().then(function(details) {
                // This function shows a transaction success message to your buyer.
                $.post(".", details, ()=>{
                  window.open("", "_self");
                  window.close(); 
                });
              });
            }
        
          }).render('#paypal-button-container');
        // This function displays Smart Payment Buttons on your web page.
      </script>

      <p>After your payment, please click the QR Code link below:</p>
      <a href="http://localhost:3002/QRCode">QR Code</a>
    
    </body>
        
    `);
    
  }
  res.end(renderForm());
});

app.post("/payment/:phone", (req, res) => {
  // this happens when the order is complete
  sFrom = req.params.phone;
  const aReply = oOrders[sFrom].handleInput(req.body);
  const oSocket = oSockets[sFrom];
  // send messages out of turn
  if (oSocket) {
  for (let n = 0; n < aReply.length; n++) {
      oSocket.emit('receive message', {
                    message: aReply[n]
                    });
    }
  } else 
    {
      throw new Exception("twilio code would go here");
    }
 

  if (oOrders[sFrom].isDone()) {
    delete oOrders[sFrom];
    delete oSockets[sFrom];
  }
  res.end();
});

app.get("/payment/:phone", (req, res) => {
  // this happens when the user clicks on the link in SMS
  const sFrom = req.params.phone;
  if (!oOrders.hasOwnProperty(sFrom)) {
    res.end("order already complete");
  } else {
    res.end(oOrders[sFrom].renderForm());
  }
});

app.get("/menu/:phone", (req, res) => {
  
  // this happens when the user clicks on the link in SMS
  res.redirect("http://127.0.0.1:5500/menu.html");
});

app.post("/sms", (req, res) => {
  // turn taking SMS
  let sFrom = req.body.From || req.body.from;
  let sUrl = `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.headers.host}${req.baseUrl}`;
  if (!oOrders.hasOwnProperty(sFrom)) {
    oOrders[sFrom] = new PopupMealEssentials(sFrom, sUrl);
  }
  if (oOrders[sFrom].isDone()) {
    delete oOrders[sFrom];
  }
  let sMessage = req.body.Body || req.body.body;
  let aReply = oOrders[sFrom].handleInput(sMessage);
  res.setHeader('content-type', 'text/xml');
  let sResponse = "<Response>";
  for (let n = 0; n < aReply.length; n++) {
    sResponse += "<Message>";
    sResponse += aReply[n];
    sResponse += "</Message>";
  }
  res.end(sResponse + "</Response>");
});

app.post("/",(req,res)=>{
  var obj = JSON.parse(JSON.stringify(req.body));
  paymentDetailReq = obj;
  
  // console.log(paymentDetailReq);
});

app.get("/QRCode/",(req,res)=>{

  if (!!paymentDetailReq){
    var obj = paymentDetailReq
    var id = obj.id;
    var target = obj.purchase_units[0].shipping;
    var name = target.name.full_name;
    var address = target.address.address_line_1 +" "+
                  target.address.admin_area_2 + " "+
                  target.address.postal_code;
    function renderQRCode(){
      return(`
      <!DOCTYPE html>
      <html lang="en">
      
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="ie=edge">
          <title class="title">Payment</title>
          <script type="text/javascript" src="qrcode.js"></script>
      </head>
      <body>
          <h1 class="title">You have completed your payment</h1>
          <p>Your order will be sent to</p>
          <p name="buyerName" id="buyerName"> ${name}</p>
          <p name="address" id="address">${address}</p>
          <p>Order QR Code is below, please keep that for receiving your order</p>
          <div id="placeHolder"></div>
          <script>
              var typeNumber = 5;
              var errorCorrectionLevel = 'L';
              var qr = qrcode(typeNumber, errorCorrectionLevel);
              qr.addData('${id}');
              qr.make();
              document.getElementById('placeHolder').innerHTML = qr.createImgTag();
          </script>
      </body>
      `);  
    }
    // paymentDetailReq=null;
    res.end(renderQRCode());
}
  else{
    res.end("Please pay first");
  }

});


app.get("/qrcode/:phone",(req,res)=>{
  sPhone = req.params.phone;
  function renderQRCode(){
    return(`
    <!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title class="title">Payment</title>
        <script type="text/javascript" src="/qrcode.js"></script>
    </head>
    <body>
        <h1 class="title">You have completed your payment</h1>
        <p>Order QR Code is below, please keep that for receiving your order</p>
        <div id="placeHolder"></div>
        <script>
            var typeNumber = 5;
            var errorCorrectionLevel = 'L';
            var qr = qrcode(typeNumber, errorCorrectionLevel);
            qr.addData('${sPhone}');
            qr.make();
            document.getElementById('placeHolder').innerHTML = qr.createImgTag();
        </script>
    </body>
    `);  
  }
  res.end(renderQRCode());

  // console.log(oOrders); 
  // console.log(req.body);
  // const sFrom = req.params.phone;
  // if (!oOrders.hasOwnProperty(sFrom)) {
  //   res.end("order already complete");
  // } else {
  //   res.end(oOrders[sFrom].renderForm());
  // }
});

app.post("/test",(req,res)=>{
  const socket = oSockets["SGwpLd1OkF"];
  // console.log(socket);
  for (let index = 0; index < 5; index++) {
        socket.emit('receive message', {
          message: "ok"
      });
    
  }
  res.end();
})

io.on('connection', function (socket) {
  // when the client emits 'receive message', this listens and executes
  socket.on('receive message', function (data) {
    // set up a socket to send messages to out of turn
    const sFrom = _.escape(data.from);
    oSockets[sFrom] = socket;
  });
});
