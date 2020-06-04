const mongoose = require('mongoose');

const retailClientDataSchema = mongoose.Schema({
    rName:{
        type:String,
        required:true,
        trim:true,
    },
    rDistributorEmail:{
        type:String,
        require:true
    },
    rClientId:{
        type:String,
        required:true,
        unique:1
    },
    rLeftBal:{
        type:Number,
        required:true
    },
   rAddress:{
        type:String,
        required:true
    },
    rMobNo:{
        type:Number,
        required:true
    },
    date:{
        type:Date,
        default:Date.now()
    }
})

const retailClientDataModel = mongoose.model('retailClientDataModel',retailClientDataSchema);

module.exports = {retailClientDataModel};