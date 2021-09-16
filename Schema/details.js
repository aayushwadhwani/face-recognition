const mongoose = require('mongoose');

const detailsSchema = mongoose.Schema({
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String
    },
    contact_number: {
        type: Number,
        required: true
    },
    gender: {
        type: String,
        required: true
    },
    age:{
        type: Number,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    account_number: {
        type: Number,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    pin: {
        type: Number,
        required: true
    },
    current_balance: {
        type: Number,
        default: 10000
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

const details = mongoose.model('details',detailsSchema);

module.exports = details;