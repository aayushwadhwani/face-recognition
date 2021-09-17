const mongoose = require('mongoose');

const transaction_history_schema = mongoose.Schema({
    sender_account_number:{
        type: Number,
        required: true
    },
    reciever_account_number:{
        type: Number,
        required: true
    },
    amount:{
        type: Number,
        required: true
    },
    date:{
        type: Date,
        default: Date.now
    }
});

const transaction_history = mongoose.model('transaction_history',transaction_history_schema);

module.exports = transaction_history;