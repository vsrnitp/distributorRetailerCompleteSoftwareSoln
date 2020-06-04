const mongoose = require('mongoose');

const retailSaleDataSchema = mongoose.Schema({
   rCustomerName:{
       type:String,
       require:true
   },
   rCustomerId:{
       type:String,
       require:true
   },
   rAmountPaidByCustomer:{
       type:Number
   },
   rCustomerAddress:{
       type:String
   },
   rCustomerMobNo:{
       type:Number
   },
   rCustomerOrderQuantity:{
       type:Number
   },
   rCustomerDateOfSale:{
       type:String
   },
   rDistributorId:{
       type:String
   },
   rProductName:{
       type:String
   },
   rProductNetPrice:{
       type:Number
   },
   rProductNetCgst:{
       type:Number
   },
   rProductNetSgst:{
       type:Number
   },
   rProductTotalPrice:{
       type:Number
   },
   rNetPayableAmount:{
       type:Number
   }
})
//saleDataSchema.index({productName:"text"});
const retailSaleDataModel = mongoose.model('retailSaleDataModel',retailSaleDataSchema);

module.exports = {retailSaleDataModel};