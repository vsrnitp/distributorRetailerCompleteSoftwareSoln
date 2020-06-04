const mongoose = require('mongoose');

const clientSpecificDemandSupplySchema = mongoose.Schema({
   dClientId:{
    type:String,
    required:true,
   },
   dQuantity:{
    type:Number,
    required:true,
  },
    dProductName:{
     type:String,
     required:true,
   },
   dProductId:{
    type:String,
    required:true,
  },
  dNetPrice:{
    type:Number,
    required:true
},
   dNetCgst:{
       type:Number,
       required:true
   },
   dNetSgst:{
        type:Number,
        required:true
   },
  dTotalPrice:{
      type:Number,
      required:true
  },
    date:{
        type:Date,
        default:Date.now()
    }
})

const clientSpecificDemandSupplyModel = mongoose.model('clientSpecificDemandSupplyModel',clientSpecificDemandSupplySchema);

module.exports = {clientSpecificDemandSupplyModel};