const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require("body-parser"); 
const fs = require('fs');
const url = require('url'); 
var converter = require('number-to-words');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');
const saltRounds = 10;
// initializing the APP.....
const app = express();

//setting up the view engine....
app.set("view engine","ejs");

//telling express where are we keeping our index.js...
app.set("views",__dirname+"/views");

//using body-parser...
app.use(bodyParser.urlencoded({extended:false}));
//using cookie parser...
app.use(cookieParser());

//setting up static folder...
app.use( express.static( "public" ) );

//some more settings.....
app.use(bodyParser.json());
app.use(cookieParser());



// connecting to the database (mongoDB)...
const databaseURL = 'mongodb+srv://vsrnitp:King123@cluster0-fy7sb.mongodb.net/test?retryWrites=true&w=majority';
//const databaseURL = 'mongodb+srv://admin:King123@cluster0-it7tz.mongodb.net/test?retryWrites=true&w=majority';
mongoose.connect(databaseURL,{useUnifiedTopology: true,useNewUrlParser:true})
.then(()=>{
    console.log('Database connected succesfully...')
}).catch((err)=>{
    console.log(err);
})

//bringing up the database models....
const {userRegModel} = require('./models/regModel');
const {stockItemModel} = require('./models/stockModel');
const {clientDataModel} = require('./models/clientData');
const {saleDataModel} = require('./models/saleData');
const {distributorRegModel} = require('./models/distributorRegModel');
const {clientSpecificDemandSupplyModel} = require('./models/clientSpecificDemandSupply');
const {distributorLoginTokenModel} = require('./models/distributorLoginToken');
const {retailClientDataModel} = require('./models/distributorRetailCustomer');
const {retailSaleDataModel} = require('./models/distributorSaleData');

// setting up the primary route....(For login only... separate route for register)
app.get('/',(req,res)=>{
    res.status(200).render("index");

})

//setting up the GET route for registration.....
app.get('/register',(req,res)=>{
    res.status(200).render("register");
})
// setting up post route for Registration....
app.post('/register',(req,res,next)=>{
    var userData = new userRegModel({
        email:req.body.email,
        password:req.body.password,
        repPassword:req.body.repPassword
    })
    //finding if the email is already registered...
    userRegModel.findOne({'email':req.body.email},(err,user)=>{
       if(err){res.send(err)}
       else if(user){res.send('User already exists.....Try logging in.')}
       else{
           if(req.body.password!==req.body.repPassword){
               res.send('Both passwords dont match...');
           }
           else{
               // hashing the password before saving it....
               bcrypt.hash(userData.password,saltRounds,(err,hash)=>{
                   if(err) res.send(err);
                   else{
                       userData.password=hash;
                       //saving regData to database....
                       userData.save((err,doc)=>{
                           if(err) res.status(400).send(err);
                           else{
                               res.status(400).send(userData+'Registration Successful , Go back to the login page...');
                           }
                       })
                   }
               })
           }
       }
    })
})

//setting up post route for login...
//NOTE:- Password will be saved in the cookie of the browser...
app.post('/login',(req,res)=>{
    const email = req.body.email;
    const password = req.body.password;

    //finding if user exist in the database...
    userRegModel.findOne({'email':email},(err,user)=>{
        if(err) res.send(err);
        else if(!user) res.send('No account exists with this email...Create one.');
        else{
            bcrypt.compare(password,user.password,(err,valid)=>{
                if(err)res.send(err)
                else if(valid){
                    //creating the cookie...
                    var token = jwt.sign(user._id.toHexString(),'secret');
                    res.cookie('userLoginToken',token);
                    //here user should be directed to the sales dashboard...
                    res.redirect(url.format({
                      pathname:"/dashboard",
                      query:{
                          email:req.body.email
                      }  
                    }))
                    
                }
                else{
                    res.send('Incorrect Password.')
                }
            })
        }
    })
})

// this route will deal with login as DISTRIBUTOR...(GET)
app.get('/loginAsDistributor',(req,res)=>{
    res.status(200).render("distributorLogin");
})
//POST route for distributor login....
app.post('/loginAsDistributor',(req,res)=>{
    var email = req.body.email;
    var password = req.body.password;
    
    distributorRegModel.findOne({"distributorEmail":email},(err,doc)=>{
        if(err) res.send(err);
        else if(!doc) res.send('User doesnt exist!');
        else{
            distributorRegModel.findOne({"distributorPassword":password},(error,user)=>{
                if(error) res.send(err);
                else if(!user) res.send('Incorrect Password.')
                else{
                    //creating and saving the distributor login token to database (not to cookies)....
                    var token = jwt.sign(user._id.toHexString(),'secret');
                    //saving the login token to the database....
                    var distributorLoginTokenData = new distributorLoginTokenModel({
                        token:token,
                        dEmail:email
                    })

                    distributorLoginTokenModel.findOne({"dEmail":email},(err1,doc1)=>{
                        if(err1) console.log(err1);
                        else if(!doc1){
                            
                            distributorLoginTokenData.save()
                        }
                    })
                    //here we will redirect to the distributor dashboard...
                    res.status(200).redirect('/distributorDashboard/'+user.distributorEmail);
                }
            })
        }
    })
    
    //res.send('Login route....')
})

// creating dashboard route (private) (GET) for distributor console....
app.get('/distributorDashboard/:id',(req,res)=>{
    var distributorEmail = req.params.id;
    distributorLoginTokenModel.findOne({"dEmail":distributorEmail},(err,doc)=>{
        if(err) res.send(err);
        else if(!doc) res.send('Distributor doesnt exist...');
        else{
            jwt.verify(doc.token,'secret',(err1,decode1)=>{
                if(err1) res.send('Unauthorized!');
                else{
                    //getting client id from client email ...
                    clientDataModel.findOne({"email":distributorEmail},(err2,doc2)=>{
                        if(err2) console.log(err2);
                        else{
                            var distributorId = doc2.clientId;
                    //now finding client specific demand supply model.....
                        clientSpecificDemandSupplyModel.find({"dClientId":distributorId},(err3,doc3)=>{
                            if(err3) res.send(err3);
                            else{
                                res.status(200).render("distributorDashboard",{dEmail:distributorEmail,dId:distributorId,dProductInfo:doc3});
                            }
                        })
                          
                        }
                    })
                    
                }
            })
        }
    })
})
// creating sell route (get) (private) for distributors:-(hasnt made private yet)
app.get('/distributorSell/:clientId/:productName/:quantity/:netPrice/:netCgst/:netSgst/:totalPrice/:productId',(req,res)=>{
    res.status(200).render("distributorSalesFinalPage",{dId:req.params.clientId,dProductName:req.params.productName,dAvailableQuantity:req.params.quantity,dNetPrice:req.params.netPrice,dNetCgst:req.params.netCgst,dNetSgst:req.params.netSgst,dTotalPrice:req.params.totalPrice,dProductId:req.params.productId});
})

// creating sell route (post) (private) for distributors:-(hasnt made private yet)
app.post('/distributorSell/sell',(req,res)=>{
    //getting all the data at one place....
    var customerName = req.body.custName;
    var retailCustomerId = req.body.custRetailId;
    var amountPaidByCustomer = req.body.custAmountPaid;
    var customerAddress = req.body.custAddress;
    var customerMobileNo= req.body.custMobNo;
    var customerOrderQuantity = req.body.custQuantity;
    var customerDateOfSell = req.body.custDateOfSell;
    var distributorId = req.body.clientId;
    var productName = req.body.productName;
    var productNetPrice = req.body.netPrice;
    var productNetCgst = req.body.netCgst;
    var productNetSgst = req.body.netSgst;
    var productTotalPrice = req.body.totalPrice;
    var netPayableAmount = parseFloat(productTotalPrice)*parseFloat(customerOrderQuantity);
    var remainingBalanceToBePaid = netPayableAmount-amountPaidByCustomer;
    var productAvailableQuantity = req.body.prodctAvailableQuantity;

    //making distributor sale data model.....
    var retailSaleData = new retailSaleDataModel({
        rCustomerName:customerName,
        rCustomerId:retailCustomerId,
        rAmountPaidByCustomer:amountPaidByCustomer,
        rCustomerAddress:customerAddress,
        rCustomerMobNo:customerMobileNo,
        rCustomerOrderQuantity:customerOrderQuantity,
        rCustomerDateOfSale:customerDateOfSell,
        rDistributorId:distributorId,
        rProductName:productName,
        rProductNetPrice:productNetPrice,
        rProductNetCgst:productNetCgst,
        rProductNetSgst:productNetSgst,
        rProductTotalPrice:productTotalPrice,
        rNetPayableAmount:netPayableAmount
    })

    //getting the product id....
    var myProductId = req.body.productId;
    
    //checking if the customer exist in the database......
    retailClientDataModel.findOne({"rClientId":retailCustomerId},(err,doc)=>{
        if(err) res.send(err);
        else if(!doc) res.send('Customer doesnt exist in database....Please add customer first!');
        else{
            //checking if desired quantity is available or not.....
            if(productAvailableQuantity<customerOrderQuantity){res.send('Insufficient Stock!')}
            else{
                // selling items and saving data here.....(firstly updating remaining balance of customer)
                retailClientDataModel.findOneAndUpdate({"rClientId":retailCustomerId},{$inc:{"rLeftBal":remainingBalanceToBePaid}},(err1,doc1)=>{
                    if(err1) res.send(err1);
                    else {
                        //updating the stock....
                       clientSpecificDemandSupplyModel.findOneAndUpdate({"dClientId":distributorId,"dProductId":myProductId},{$inc:{"dQuantity":-customerOrderQuantity}},(err3,doc3)=>{
                           if(err) res.send(err);
                           else{
                                 //saving data here and then redirecting.....
                        retailSaleData.save();
                        res.send('Saved...');
                           }
                       })
                       
                    }
                })
            }
        }
    })
})

//private route (get) to see the sale data (hasnt made private yet..);
app.get('/distributorSaleData/:id',(req,res)=>{
    //getting distributor id from distributor email...
    var distributorEmail = req.params.id;
    clientDataModel.findOne({"email":distributorEmail},(err,doc)=>{
        if(err) res.send(err);
        else if(!doc) res.send('Distributor doesnt exists.....!');
        else{
            var clientId = doc.clientId;
            //now we have the client id....now querrying the sales database...
            retailSaleDataModel.find({"rDistributorId":clientId},(err1,doc1)=>{
                if(err1) res.send(err);
                else if(!doc1) res.send('No sale has been made yet...!');
                else{
                    res.status(200).render("distributorSellData",{retailSaleData:doc1});
                }
            })
        }
})
})

//private route to get retailer unpaid balance (get)
app.get('/retailUnpaidBalance/:id',(req,res)=>{
    var distributorEmail = req.params.id;
   retailClientDataModel.find({"rDistributorEmail":distributorEmail},(err,doc)=>{
       if(err) res.send(err);
       else if(!doc) res.send('No available data');
       else {
           res.status(200).render("retailUnpaidBalance",{unpaidBalanceData:doc});
       }
   })
    //retailClientDataModel.find()
   // res.send('ok');
})

//private route to generate bill for retail selling...
app.post('/retailGenerateBill/:id',(req,res)=>{
    var retailCustomerId = req.body.retailCustId1;
    var dateOfSale = req.body.dateOfSale1;
    var distributorEmail = req.params.id;
   

    clientDataModel.findOne({"email":distributorEmail},(err,doc)=>{
        if(err) res.send(err);
        else if(!doc) res.send('Distributor not found....!');
        else{
            var distributorId = doc.clientId;
            //getting data....
            retailSaleDataModel.find({"rDistributorId":distributorId},(err1,doc1)=>{
                if(err1) res.send(err1);
                else{
                    retailSaleDataModel.find({"rCustomerId":retailCustomerId,"rCustomerDateOfSale":dateOfSale},(err2,doc2)=>{
                        if(err2) res.send(err2);
                        else if(!doc2) res.send('No data available...')
                        else{
                          // here will be the view of retailBill....
                          var apbc=0;
                          var npa =0;
                          var nra=0;
                          for(index in doc2){
                              apbc = parseFloat(apbc)+parseFloat(doc2[index].rAmountPaidByCustomer);
                              npa = parseFloat(npa)+parseFloat(doc2[index].rNetPayableAmount);
                          }
                          nra = npa - apbc;
                          var inWords = converter.toWords(npa);
                          // bringing the customer data...
                          retailClientDataModel.findOne({"rClientId":retailCustomerId},(err3,doc3)=>{
                              if(err3) res.send(err3);
                              else{
                                res.status(200).render("retailBill",{paidAmount:apbc,currUnsettled:nra,totalBill:npa,wordFig:inWords,billData:doc2,clientLog:doc3});
                              }
                          })
                        }
                    })
                }
            })
        }
})
    //res.send('ok');
})

// creating PRIVATE (POST) route for adding customer....(hasnt made private yet)
app.post('/add/retailCustomer/:id',(req,res)=>{
    var customerName = req.body.custName;
    var retailCustomerId = req.body.custRetailId;
    var amountRemaining = req.body.custAmountRemaining;
    var customerAddress = req.body.custAddress;
    var customerMobileNo= req.body.custMobNo;

    var distributorEmail = req.params.id;

    //creating data model.....
    var retailCustomerData = new retailClientDataModel({
        rName:customerName,
        rClientId:retailCustomerId,
        rLeftBal:amountRemaining,
        rAddress:customerAddress,
        rMobNo:customerMobileNo,
        rDistributorEmail:distributorEmail
    })

    retailClientDataModel.findOne({"rClientId":retailCustomerId},(err,doc)=>{
        if(err) res.send(err);
        else if(!doc){
            //saving the data...
            retailCustomerData.save();
            res.status(200).redirect('/distributorDashboard/'+distributorEmail);
        }
        else res.send('Customer already exists......!')
    })

    //res.send('ok');
})
// creating PRIVATE (POST) route for paying previous balance for retail customer....(hasnt made private yet)
app.post('/retailBalancePayment/:id',(req,res)=>{
    var dEmail = req.params.id;
    var customerId  = req.body.custIdForBalPayment;
    var payment = req.body.paymentByCust;

    //finding and updating the database....
    retailClientDataModel.findOneAndUpdate({"rDistributorEmail":dEmail,"rClientId":customerId},{$inc:{"rLeftBal":-payment}},(err,doc)=>{
        if(err) res.send(err);
        else{
            res.status(200).redirect('/distributorDashboard/'+dEmail);
        }
    })
})


//creating a PRIVATE rote for LOGOUT...
app.post('/logout',(req,res)=>{
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send('Unauthorized!');
        else{
            userRegModel.findOne({"_id":decode},(err,user)=>{
                if(err) res.send(err);
                else if(!user) res.status(404).send('Login first.')
                else{
                    res.clearCookie('userLoginToken',{path:'/'}).redirect('/');
                }
            })
        }
    })
})

//setting up PRIVATE route for sales dashboard....
app.get('/dashboard',(req,res)=>{
   // res.status(200).send('Welcome to your sales dashboard.Your email is '+req.query.email)
   //  res.status(200).render("dashboard",{user:req.query.email});

   const token = req.cookies.userLoginToken;
   jwt.verify(token,'secret',(err,decode)=>{
       if(err) res.status(401).send('Unauthorized!');
       else{
           userRegModel.findOne({"_id":decode},(err,user)=>{
               if(err) res.send(err);
               else if(!user) res.status(404).send('Login first.')
               else{
                   //sending dates too...
                 

let date_ob = new Date();

// current date
// adjust 0 before single digit date
let date = ("0" + date_ob.getDate()).slice(-2);

// current month
let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

// current year
let year = date_ob.getFullYear();

      // here we will populate the dashboard with stock items...
    
      stockItemModel.find().then(data => res.status(200).render("dashboard",{user:user.email,date:date,month:month,year:year,dataLoad:data}))
      .catch(err => console.log(err))
      

                  // res.status(200).render("dashboard",{user:req.query.email,date:date,month:month,year:year});
               }
           })
       }
   })
})

//setting up a PRIVATE route(POST) for adding items to stock...
app.post('/setStocks',(req,res)=>{
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send('Unauthorized!');
        else{
            userRegModel.findOne({"_id":decode},(err,user)=>{
                if(err) res.send(err);
                else if(!user) res.status(404).send('Login first.')
                else{
                    // calculating sgst,cgst and net price first...
                    var cgst = Math.floor((((req.body.price*9)/100)*100)/100);
                    var sgst = cgst;
                    var stockItemData = new stockItemModel({
                        productName:req.body.itemName.toLowerCase(),
                        quantity:req.body.quantity,
                        price:req.body.price,
                        cgst:cgst,
                        sgst:sgst,
                        netPrice:0
                        
                    })
                    var netCost = Math.round(stockItemData.price+cgst+sgst);
                    stockItemData.netPrice=Math.round(netCost);     
                    
                    // saving  this data to the database....
                    //name should be unique otherwise it will give errors...
                    stockItemData.save((err,doc)=>{
                        if(err) res.send(err);
                        else{
                            res.status(200).redirect('/dashboard');
                        }
                    })

                }
            })
        }
})
})
//setting up a PRIVATE route (GET) for updating stocks...
app.get('/updateStock/:id',(req,res)=>{
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send('Unauthorized!');
        else {
            var stockId = req.params.id;
            res.status(200).render("updateStock",{eachData:stockId});
        }
    })
})

//setting up a PRIVATE route(POST) for updating the stock...
app.post('/updateStock/:id',(req,res)=>{
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send('Unauthorized!');
        else{
            var itemId = req.params.id;
            var incrementData = req.body.incQuantity;
            var newerPrice = req.body.newPrice;
            var cgst = Math.floor((((newerPrice*9)/100)*100)/100);
            var sgst = cgst;
            var netCost = parseFloat(2*cgst)+parseFloat(newerPrice);

          /*  stockItemModel.findOneAndUpdate({_id :itemId},{price:newPrice},{cgst:cgst},{sgst:sgst},{netPrice:netCost}, {$inc : {'quantity' :incrementData }},(err,data)=>{
                if(err) res.send(err);
                else(res.send(data));
            })
            */
           stockItemModel.update({'_id':itemId},{$set:{'price':newerPrice,'cgst':cgst,'sgst':sgst,'netPrice':netCost}},(err,data)=>{
               if(err) res.send(err);
               else {
                   stockItemModel.update({'_id':itemId},{$inc:{'quantity':incrementData}},(err,data)=>{
                       if(err) res.send(err);
                       else res.status(200).redirect('/dashboard');
                   })
               }
           })
       
        
        }

    })
})


//creating a PRIVATE (POST) route for creating a client...
app.post('/createClient',(req,res)=>{
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send('Unauthorized!');
        else{
            // get the client data from form...
            var name = req.body.clientName;
            var clientId = req.body.clientId;
            var address = req.body.clientAddress;
            var mobNo = req.body.clientMobileNo;
            var email = req.body.clientEmail;
            var leftBal = req.body.clientRemainingBalance;

            //distributor identification and login data...
            var isDistributor = req.body.customerType.toUpperCase();
            var distributorEmail = email;
            var distributorPasswordUnhashed = req.body.distributorPassword;
            // saving distributor login details ....
            var distributorRegData = new distributorRegModel({
                distributorEmail:distributorEmail,
                distributorPassword:distributorPasswordUnhashed
            })
            distributorRegData.save((err,data)=>{
                if(err) console.log(err)
                else console.log(data);
            })
            // bring the model here and store the data....
            clientDataModel.findOne({'clientId':req.body.clientId},(err,client)=>{
                if(err) res.status(500).send(err);
                else if(client) res.status(401).send('Client alredy exists...');
                else{
                    var clientDataForSaving = new clientDataModel({
                        name:name,
                        clientId:clientId,
                        address:address,
                        mobNo:mobNo,
                        email:email,
                        customerType:isDistributor,
                        leftBal:leftBal
                    })
                    clientDataForSaving.save((err,doc)=>{
                        if(err) res.send(err);
                        else{
                            res.status(200).redirect('dashboard');
                        }
                    })
                }
            })
          
        }
    })
})

//creating PRIVATE route(POST) for bill clearance of clients....
app.post('/clearBill',(req,res)=>{

    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.send('Unauthorized!');
        else{

    var clientId = req.body.clientId;
    var balancePaid = req.body.balancePaid;

    clientDataModel.findOne({'clientId':clientId},(err,client)=>{
        if(err) res.send('Customer doesnt exist...');
        else if(client){
            if(balancePaid>client.leftBal)
              res.send('You cant pay more balance than due....');
              else{
                  clientDataModel.update({"clientId":clientId},{$inc:{'leftBal':-balancePaid}},(err,data)=>{
                      if(err) res.send(err);
                      else{
                          console.log(balancePaid+' '+client.leftBal);
                          res.status(200).redirect('/dashboard');
                      }
                  })
              }
        }
        else res.send('client doesnt exist..');
    })
         
}
})
})


// creating a PRIVATE (GET) route for list of clients....(and other details)
app.get('/clientList',(req,res)=>{
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.send('Unauthorized!');
        else{
            // here we need to send the data from backend to frontend.....
            clientDataModel.find().then(data=>{
                {res.status(200).render("clientLog",{clientData:data})}
            });
                 //{res.status(200).render("clientLog",{clientData:data})}
        }
    })
})

// creating a PRIVATE route (POST) for search....
app.post('/search',(req,res)=>{
    const token=req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send('Unauthorized!');
        else{
            var searchQuery = req.body.searchQuery;
            //finding in the database...
            //creating text index....
            
            stockItemModel.find({ $text: { $search: searchQuery } },(err,data)=>{
                if(err) res.send(err);
                else if(!data) res.send('Product doesnt exist.Try searching with correct name.');
                else{
                      var searchData = data;
                      res.status(200).render("salesFinalPage",{outputData:searchData});
                      
                }
            })
        }
    })
})


//set up a PRIVATE route (GET) for sale.......

app.get('/sale',(req,res)=>{
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send('Unauthorized!');
        else{
        
            res.status(200).render("salesPage");
        }
    })
})


// now setting up PRIVATE routes(GET as well as POST) for sell....
app.get('/sell/:id',(req,res)=>{
    var id = req.params.id;
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send(err);
        else{
            // finding all the details of the product...
            stockItemModel.findOne({_id:id},(err,data)=>{
                if(err) res.status(404).send(err)
                else if(data){
                    var productName = data.productName;
                    var availableQuantity = parseFloat(data.quantity);
                    var price = parseFloat(data.price);
                    var cgst = parseFloat(data.cgst);
                    var sgst = parseFloat(data.sgst);
                    var pid = data._id;

                    // calculating net payble price....
                  //  var netPrice = price*quantity;
                  //  var netCgst =  cgst*quantity;
                   // var netSgst =  netCgst;

                    //calculating final payable cost...
                    //var finalCost = parseFloat(netPrice)+parseFloat(netSgst)+parseFloat(netCgst);

                    //sending data to the frontend...
                    res.status(200).render("sellDetails",{pName:productName,availQuantity:availableQuantity,price:price,cgst:cgst,sgst:sgst,pid:pid});

                   // console.log(netPrice);
                }
                else{
                    res.send('Product not found...')
                }
            })
        }
    })

   // res.render("sellDetails");
})

//setting up PRIVATE route (POST) for sale...
app.post('/sell',(req,res)=>{
    const token = req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(200).send('Unauthorized!');
        else{
     
    var clientId = req.body.clientId;
    var quantity = parseFloat(req.body.quantity);
    var productName = req.body.pName;
    var productId = req.body.pid;
    var payment = req.body.payment;
    var saleDate = req.body.saleDate.toString();
    //these wont be stored....
    var quantityAvailable = parseFloat(req.body.availQuantity);
    var price = parseFloat(req.body.price);
    var cgst = parseFloat(req.body.cgst);
    var sgst = parseFloat(req.body.sgst);

    // some calculation here......
    var netPrice = quantity*price;
    var netCgst = quantity*cgst;
    var netSgst = netCgst;
    var netPayableAmount = (2*netCgst)+parseFloat(netPrice);


    // doing some check...
    if(quantity>quantityAvailable){res.send('STOCK DOESNT HAS SUFFICIENT QUANTITY')}
    else{
        clientDataModel.findOne({'clientId':clientId},(err,clientData)=>{
            if(err) res.send(err);
            else if(!clientData) res.send('No client exists with this clientId....Try creating client first...');
            else{
                 if(payment>parseFloat(netPayableAmount)+parseFloat(clientData.leftBal)){
                     res.send('You cant pay more.....');
                 }
                 else{
                     var remainingAmount = parseFloat(netPayableAmount)-parseFloat(payment);

                    var saleDataForSaving = new saleDataModel({
                        clientId:clientId,
                        quantity:quantity,
                        productName:productName,
                        productId:productId,
                        netPrice:netPrice,
                        netCgst:netCgst,
                        netSgst:netSgst,
                        netPayableAmount:netPayableAmount,
                        amountPaid:payment,
                        remainingAmount:remainingAmount,
                        saleDate:saleDate
                    })

                    //distributor specific demand supply data.....
                    var distributorClientId = clientId;
                    var distributorQuantity = quantity;
                    var distributorProductName = productName;
                    var distributorProductId = productId;
                    var distributorNetPrice  = netPrice;
                    var distributorNetCgst = netCgst;
                    var distributorNetSgst = netSgst;
                    var distributorTotalPrice = parseFloat(2*netCgst)+parseFloat(netPrice);

                    //creating data model...
                    var distributorSpecificData = new clientSpecificDemandSupplyModel({
                    dClientId:distributorClientId,
                    dQuantity:distributorQuantity,
                    dProductName:distributorProductName,
                    dProductId:distributorProductId,
                    dNetPrice:distributorNetPrice,
                    dNetCgst:distributorNetCgst,
                    dNetSgst:distributorNetSgst,
                    dTotalPrice:distributorTotalPrice
                    })
                    //checking if distributor exists.....
                    //if that product already exists to the distributor than update quantity
                    //else update the stock...




                    //saving sell data.....
                    saleDataForSaving.save((err,doc)=>{
                        if(err)res.send(err);
                        else{
                            //updating the stock....
                            stockItemModel.update({'_id':productId},{$inc:{'quantity':-quantity}},(err,newQuant)=>{
                                if(err) res.send(err);
                                else{
                                    //updating the unpaid balance of the client....
                                    clientDataModel.update({'clientId':clientId},{$inc:{'leftBal': remainingAmount}},(err,fDoc)=>{
                                        if(err) res.send(err);
                                        else{
                                            clientDataModel.findOne({"clientId":clientId,"customerType":'D'},(err,dData)=>{
                                                if(err) console.log(err)
                                                else if(dData){
                                                    clientSpecificDemandSupplyModel.findOne({"dProductId":distributorProductId,"dClientId":clientId},(err1,pData)=>{
                                                        if(err1) console.log(err)
                                                        else if(!pData){
                                                         distributorSpecificData.save();
                                                         res.status(200).redirect('/sale');
                                                        }
                                                        else{
                                                            clientSpecificDemandSupplyModel.findOneAndUpdate({"dClientId":clientId,"dProductId":distributorProductId},{$inc:{'dQuantity':quantity}},(err2,finalDoc)=>{
                                                                if(err2) res.send(err2)
                                                                else{
                                                                    console.log('success');
                                                                res.status(200).redirect('/sale');
                                                                }
                                                            })
                                                        }
                                                    })
                                                }
                                                else res.status(200).redirect('/sale');
                                            })
                                            
                                        }
                                    })
                                }
                            })
                        }
                    })
                 }
            }
        })
    }
    

       
}
})


})

//PRIVATE route (POST) for bill generation...
app.post('/billGenerate',(req,res)=>{
    const token =req.cookies.userLoginToken;
    jwt.verify(token,'secret',(err,decode)=>{
        if(err) res.status(401).send('Unauthorized!');
        else{
            var clientId = req.body.clientId;
            var date = req.body.date.toString();

              saleDataModel.find({"clientId":clientId,"saleDate":date},(err,doc)=>{
                if(err) res.send(err);
                else{
                    clientDataModel.findOne({"clientId":clientId},(err,clientData)=>{
                        if(err) res.send(err);
                        else if(clientData){
                            var paidNow = 0;
                            var totalCostOfItems=0;
                            for (const index in doc) {  
                                paidNow=paidNow+doc[index].amountPaid;
                              }
                              for (const i in doc) {  
                                totalCostOfItems=totalCostOfItems+doc[i].netPayableAmount;
                              }
                              var currentUnsettledAmount = parseFloat(totalCostOfItems)-parseFloat(paidNow);
                              //converting number to words..
                              var inWords = converter.toWords(totalCostOfItems);
                            res.status(200).render("bill",{billData:doc,clientLog:clientData,paidAmount:paidNow,totalBill:totalCostOfItems,currUnsettled:currentUnsettledAmount,wordFig:inWords});
                         
                            // getting the pdf of the document.....(bill)

                        }
                        else{res.send('No client data available...')}
                    })
                    // here find by date and generate bill.....
                   /**/
                }
            })
        }
    })
})




// starting the server..
const port = process.env.PORT || 8080;
app.listen(port,()=>{
    console.log(`Server is up and running at port ${port}`);
})