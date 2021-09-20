//requireness
const express = require('express');
const mongoose = require('mongoose');
const body_parser = require('body-parser');
const key = require('./config/keys.js');;
const session = require('express-session');
const mongodbSession = require('connect-mongodb-session')(session);
const app = express();
const registerModel = require('./Schema/details.js');
const transaction_history = require('./Schema/transaction_history.js');
const db = mongoose.connect(key.mngoURI, { useNewUrlParser: true,useUnifiedTopology: true}).then(()=>{
    console.log('Connected to mongodb successfully');
}).catch(err=>console.log(err));
const store = new mongodbSession({
    uri: key.mngoURI,
    collection: 'mySessions'
});


//middlewears
app.use(express.urlencoded({extended: true}));
const isAuth = (req,res,next)=>{
    if(req.session.isAuth){
        next();
    }else{
        res.redirect('/user/signup');
    }
};
app.use(session({
    secret: 'This is secret',
    resave: false,
    saveUninitialized: false,
    store: store
}));


app.set('view engine','ejs');


//homepage section
app.get('/',(req,res)=>{
    res.render('homepage');
});



//user section
app.get('/user/signup',(req,res)=>{
    res.render('user/sign_up');
});

app.get('/user/login',(req,res)=>{
    res.render('user/login');
});

app.post('/user/signup',async (req,res)=>{
    let errors = {};
    const {first_name,last_name,mobile_number,gender,age,email,account_number,password,confirm_password,pin}= req.body;
    if(mobile_number.length != 10){
        errors['mobile_number'] = 'Mobile Number should be 10 digits long';
    }
    if(Number(age) < 18){
        errors['age'] = 'Age should be atleast 18 years to register';
    }
    if(account_number.length != 6){
        errors['account_number'] = 'Account Number Should be 6 digits long';
    }
    if(password.length < 8){
        errors['password'] = 'Password should have atleast 8 characters';
    }
    if(password != confirm_password){
        console.log(password);
        console.log(confirm_password);
        errors['password'] = 'Password and Confirm password Did not match';
    }
    if(pin.length != 4){
        errors['pin'] = 'Pin has to 4 ditis long';
    }
    console.log(errors);
    if(Object.keys(errors).length == 0){
        registerModel.findOne({email: email}).then(user=>{
            if(user){
                errors['email'] = 'User Already exists'
                console.log(errors);
                res.render('user/sign_up');
            }else{
                registerModel.findOne({account_number: account_number}).then(user=>{
                    if(user){
                        res.render('user/sign_up');
                    };
                });
                const newUser = new registerModel({
                    first_name,
                    last_name,
                    contact_number: mobile_number,
                    gender,
                    age,
                    email,
                    account_number,
                    password,
                    pin
                });

                newUser.save().then(()=>{
                    console.log('saved successfully');
                    res.redirect('./login');
                }).catch(err=> console.log(err));
            }
        });
    }else{
        res.render('user/sign_up');
    }
});

app.post('/user/login',async (req,res)=>{
    const {email, password} = req.body;
    let user = await registerModel.findOne({email});
    if(!user){
        return res.redirect('/user/login');
    }
    if(password != user.password){
        return res.redirect('/user/login');
    }

    req.session.isAuth = {isAuth: true, id: user._id};
    res.redirect('/dashboard/dashboard');
});


//logout
app.post('/logout',(req,res)=>{
    req.session.destroy((err)=>{
        if(err) throw err;
        res.redirect('/');
    });
});


//dashboard section
app.get('/dashboard/dashboard',isAuth,async (req,res)=>{
    const user = req.session.isAuth.id;
    const user_id = user.valueOf();
    console.log(typeof user_id);
    const user_data = await registerModel.findOne({_id: user_id});
    console.log(user_data);
    res.render('dashboard/dashboard',{user_data});
});


//payment section
app.get('/payment/makeTransaction',isAuth,async (req,res)=>{
    const id_obj = req.session.isAuth.id;
    const user_data = await registerModel.findOne({_id: id_obj});
    console.log(user_data);
    res.render('payment/do_a_transaction',{errors:false,user_data});
});

app.post('/payment/makeTransaction',async (req,res)=>{
    // console.log(req.body);
    const {sender_account_number, reciever_account_number, amount, pin} = req.body;
    const sender_data = await registerModel.findOne({account_number: sender_account_number});
    const reciever_data = await registerModel.findOne({account_number: reciever_account_number});
    const errors = {};

    if(!reciever_data){
        errors['reciever_account_number'] = 'Cannot find such user in our bank';
    }
    if(sender_account_number == reciever_account_number){
        errors['reciever_account_number'] = 'Cannot transfer to yourself';
    }
    if(Number(sender_data.current_balance < Number(amount))){
        errors['amount'] = 'Insuffisient balance';
    }

    if(Number(amount) <= 0){
        errors['amount'] = 'Amount cannot be negative or 0';
    }

    if(pin != sender_data.pin){
        errors['pin'] = 'Wrong Pin';
    }
    if(Object.keys(errors).length > 0){
        res.render('payment/do_a_transaction',{user_data: sender_data,errors});
    }else{
        const modified_sender_amount = Number(sender_data.current_balance) - Number(amount);
        const modified_reciever_amount = Number(reciever_data.current_balance) + Number(amount);
        const update_reciever = registerModel.updateOne({account_number: reciever_account_number},{$set: {current_balance: modified_reciever_amount}},{upsert:true})
        .catch(err=> console.log(err));
        const update_sender = registerModel.updateOne({account_number: sender_account_number},{$set: {current_balance: modified_sender_amount}},{upsert:true})
        .catch(err=> console.log(err));
        const addTrasaction = new transaction_history({
            sender_account_number: sender_account_number,
            reciever_account_number: reciever_account_number,
            amount: amount
        });
        console.log(modified_reciever_amount);
        addTrasaction.save().then(()=>{
            console.log('transaction done');
        }).catch(err=>console.log(err));
        res.redirect('/dashboard/dashboard');
    }
});

app.get('/payment/history',isAuth,async (req,res)=>{
    const id = req.session.isAuth.id;
    const user_data = await registerModel.findOne({_id: id});
    const user_account_number = user_data.account_number;
    const sending_history = await transaction_history.find({sender_account_number: user_account_number});
    let data_to_send = [];
    for(let history of sending_history){
        let data = {};
        let temp = data_to_send;
        let acc_number = history.reciever_account_number;
        let user_data = await registerModel.findOne({ account_number: acc_number });
        data['reciever_acc_number'] = acc_number;
        data['reciever_name'] = user_data.first_name + " " + user_data.last_name;
        data['Amount'] = history.amount;
        data['on'] = history.date;
        temp.push(data);
        data_to_send = temp;
    }
    console.log(data_to_send);
    res.render('payment/history',{transaction_history: data_to_send});
});

//create port
app.listen(3000,()=>{
    console.log("Server Started at localhost:3000");
});