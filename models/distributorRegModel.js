const mongoose = require('mongoose');

const distributorRegSchema = mongoose.Schema({
    distributorEmail:{
        type:String,
        required:true,
        trim:true,
        unique:1
    },
    distributorPassword:{
        type:String,
        required:true
    },
    date:{
        type:Date,
        default:Date.now()
    }
})

const distributorRegModel = mongoose.model('distributorRegModel',distributorRegSchema);

module.exports = {distributorRegModel};