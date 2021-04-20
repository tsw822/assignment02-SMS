const Order = require("./Order");

const OrderState = Object.freeze({
    WELCOMING:   Symbol("welcoming"),
    FOOD:   Symbol("food"),
    TOFU:   Symbol("tofu"),
    SOUP:  Symbol("soup"),
    PAYMENT: Symbol("payment")
});

module.exports = class PopupMealEssentials extends Order{
    constructor(sNumber, sUrl){
        super(sNumber, sUrl);
        this.stateCur = OrderState.WELCOMING;
        this.sType = "";
        this.sFood = "";
        this.sSpicyTofu = "";
        this.sSoup = "";
        this.nTotal = 0;
    }
    handleInput(sInput){
        let aReturn = [];
        switch(this.stateCur){
            case OrderState.WELCOMING:
                this.stateCur = OrderState.FOOD;
                aReturn.push("Welcome to POPUP MEALS Waterloo.");
                aReturn.push(`For the menu of popup meals please tap:`);
                aReturn.push(`${this.sUrl}/menu/${this.sNumber}/`);
                if(sInput.toLowerCase() == "hot"){
                  this.sType = "spicy";
                }else if(sInput.toLowerCase() == "yum") {
                  this.sType = "normal";
                } else {
                  this.stateCur = OrderState.WELCOMING;
                  aReturn.push("Please type HOT if you want spicy meal or YUM if you want non-spicy meal.");
                  break;
                }
                aReturn.push("What Main course would you like CHICKEN, OTHERS, or NO?");
                break;
            case OrderState.FOOD:
                if(sInput.toLowerCase()!= "no"){
                  this.sFood = sInput;
                }
                if(this.sType == "spicy"){
                    this.stateCur = OrderState.TOFU;
                    aReturn.push("Would you like spicy Tofo?");
                }else{
                    this.stateCur = OrderState.SOUP;
                    aReturn.push("Would you like meat ball SOUP for your meal?");
                }
                break;
            case OrderState.TOFU:
                this.stateCur = OrderState.SOUP
                if(sInput.toLowerCase()!= "no"){
                  this.sSpicyTofu = "spicy Tofo";
                }
                aReturn.push("Would you like meat ball SOUP for your meal?");
                break;
            case OrderState.SOUP:
                if(sInput.toLowerCase() != "no"){
                    this.sSoup = sInput;
                }
                aReturn.push("Thank-you for your order of");

                if(this.sType == "spicy" && this.sFood.toLowerCase() == "chicken"){
                  aReturn.push("spicy chicken meal");
                  this.nTotal += 13.99;
                }else if(this.sType == "spicy" && this.sFood.toLowerCase() == "others"){
                  aReturn.push("delecious spicy meal");
                  this.nTotal += 16.99
                }else if(this.sType == "normal" && this.sFood.toLowerCase() == "chicken"){
                  aReturn.push("delecious chicken meal");
                  this.nTotal += 13.99;
                }else if(this.sType == "normal" && this.sFood.toLowerCase() == "others"){
                  aReturn.push("delecious non-spicy meal");
                  this.nTotal += 16.99
                }
                if(this.sSpicyTofu){
                  aReturn.push(this.sSpicyTofu);
                  this.nTotal += 6.99;
                }
                if(this.sSoup){
                  aReturn.push(this.sSoup);
                  this.nTotal += 5.99;
                }

                aReturn.push(`Your total comes to ${this.nTotal}`);
                if(this.nTotal >0){
                    this.stateCur = OrderState.PAYMENT;
                    this.nOrder = this.nTotal;
                    aReturn.push(`Please pay for your order here`);
                    aReturn.push(`${this.sUrl}/payment/${this.sNumber}/`);
                    }
                else{
                    aReturn.push("Thank-you, but your order beyond our service.Welcome your new order.");
                    this.isDone(true);
                    this.stateCur = OrderState.WELCOMING;
                }
                break;
            case OrderState.PAYMENT:
                var obj = JSON.parse(JSON.stringify(sInput));
                var target = obj.purchase_units[0].shipping;
                var name = target.name.full_name;
                var address = target.address.address_line_1 +" "+
                              target.address.admin_area_2 + " "+
                              target.address.postal_code;
                this.isDone(true);
                let d = new Date(); 
                d.setMinutes(d.getMinutes() + 20);
                aReturn.push(`Please pick it up at ${d.toTimeString()} for ${name} to ${address}`);
                aReturn.push(`Please check and save QR Code below for receiving your order.`);
                aReturn.push(`${this.sUrl}/qrcode/${this.sNumber}/`);
                aReturn.push(`We will text you from 519-222-2222 when your order is ready or if we have questions.`)
                break;
        }
        return aReturn;
    }
    renderForm(){
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
        Thank you ${this.sNumber} for your order of $${this.nOrder}.
        <div id="paypal-button-container"></div>
  
        <script>
          paypal.Buttons({
              createOrder: function(data, actions) {
                // This function sets up the details of the transaction, including the amount and line item details.
                return actions.order.create({
                  purchase_units: [{
                    amount: {
                      value: '${this.nOrder}'
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
      
      </body>
          
      `);
  
    }
}
