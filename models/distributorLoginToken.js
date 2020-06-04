const mongoose = require('mongoose');

const distributorLoginTokenSchema = mongoose.Schema({
      token:{
        type:String,
        require:true
      },
      dEmail:{
        type:String,
        require:true
      },
    date:{
        type:Date,
        default:Date.now()
    }
})

const distributorLoginTokenModel = mongoose.model('distributorLoginTokenModel',distributorLoginTokenSchema);

module.exports = {distributorLoginTokenModel};