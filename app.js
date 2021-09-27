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
app.use(express.static(__dirname+'/'));
app.use(express.urlencoded({extended: true, limit:'50mb'}));
const isAuth = (req,res,next)=>{
    if(req.session.isAuth){
        next();
    }else{
        res.redirect('/user/login');
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
    res.render('homepage',{user_data:false});
});



//user section
app.get('/user/signup',(req,res)=>{
    res.render('user/sign_up',{errors:false,previous_data:false,user_data:false});
});

app.get('/user/login',(req,res)=>{
    res.render('user/login',{errors: false,previous_data:false,user_data:false});
});

app.post('/user/signup',async (req,res)=>{
    let errors = {};
    let str = '  sw';
    const {first_name,last_name,mobile_number,gender,age,email,account_number,password,confirm_password,pin}= req.body;
    if(first_name.trim().length == 0){
        errors['first_name'] = 'First name Cannot be empty';
    }
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
        errors['confirm_password'] = 'Password and Confirm password Did not match';
    }
    if(pin.length != 4){
        errors['pin'] = 'Pin has to 4 ditis long';
    }
    if(Object.keys(errors).length == 0){
        registerModel.findOne({email: email}).then(user=>{
            if(user){
                errors['email'] = 'User Already exists'
                res.render('user/sign_up',{errors,previous_data:req.body,user_data:false});
            }else{
                registerModel.findOne({account_number: account_number}).then(user=>{
                    if(user){
                        res.render('user/sign_up',{errors,previous_data:req.body,user_data:false});
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
        res.render('user/sign_up',{errors,previous_data:req.body,user_data:false});
    }
});

app.get('/user/face-detection',isAuth,async (req,res)=>{
    // console.log(req.session.isAuth.id);
    const id = req.session.isAuth.id;
    const user = await registerModel.findOne({_id:id});
    const account_number = user.account_number;
    res.render('user/face-detection',{account_number});
});

app.post('/user/face-detection',isAuth,async(req,res)=>{
    const update = await registerModel.updateOne({account_number: req.body.account_number},{face_url: req.body.image_link}).catch(err=>console.log(err));
    res.redirect('/dashboard/dashboard');
});

app.post('/user/login',async (req,res)=>{
    const {email, password} = req.body;
    let user = await registerModel.findOne({email});
    let errors = {};
    if(!user){
        errors['email'] = 'Email not found! Signup first';
    }
    if(user){
        if(password != user.password){
            errors['password'] = 'Incorrect Password';
        }
    }

    if(Object.keys(errors).length == 0){
        req.session.isAuth = {isAuth: true, id: user._id};
        const update_user = await registerModel.updateOne({email:email},{$set :{transaction_via_face: false}}).catch(err=> console.log(err));
        res.redirect('/dashboard/dashboard');
    }else{
        res.render('user/login',{errors,previous_data: req.body,user_data:false});
    }
});


//logout
app.post('/logout',(req,res)=>{
    req.session.destroy((err)=>{
        if(err) throw err;
        res.redirect('/');
    });
});

app.get('/logout',(req,res)=>{
    req.session.destroy((err)=>{
        if(err) throw err;
        res.redirect('/');
    });
});


//dashboard section
app.get('/dashboard/dashboard',isAuth,async (req,res)=>{
    let is_there = false;
    const user = req.session.isAuth.id;
    const user_id = user.valueOf();
    // console.log(typeof user_id);
    const user_data = await registerModel.findOne({_id: user_id});
    if(user_data.face_url){
        is_there = true;
    }
    res.render('dashboard/dashboard',{user_data,is_there});
});


//payment section
app.get('/payment/makeTransaction',isAuth,async (req,res)=>{
    let is_there = false;
    const id_obj = req.session.isAuth.id;
    const user_data = await registerModel.findOne({_id: id_obj});
    // console.log(user_data);
    if(user_data.face_url){
        is_there = true;
    }
    res.render('payment/do_a_transaction',{errors:false,user_data,is_there});
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
            amount: amount,
            via: 'Pin'
        });
        // console.log(modified_reciever_amount);
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
        data['on'] = history.date.toDateString();
        data['via'] = history.via;
        temp.push(data);
        data_to_send = temp;
    }
    res.render('payment/history',{transaction_history: data_to_send,user_data:true});
});

app.get('/payment/faceDetection',isAuth,async (req,res)=>{
    console.log(req.session.isAuth.id);
    const user_id = req.session.isAuth.id;
    const user_data = await registerModel.findOne({_id: user_id});
    if(!user_data.face_url){
        res.redirect('/dashboard/dashboard');
    }else{
        res.render('payment/detect_face',{user_data});
    }
});

app.post('/payment/faceDetection',async(req,res)=>{
    console.log(req.body);
    const {can_do_transaction, account_number} = req.body;
    if(can_do_transaction == 'true'){
        const update = await registerModel.updateOne({account_number: account_number},{transaction_via_face: true}).catch(err=>console.log(err));
        res.redirect('/payment/transactionFace');
    }else{
        const update = await registerModel.updateOne({account_number: account_number},{transaction_via_face: false}).catch(err=>console.log(err));
        res.redirect('/dashboard/dashboard');
    }
});

app.get('/payment/transactionFace',isAuth,async(req,res)=>{
    const user_id = req.session.isAuth.id;
    const user_data = await registerModel.findOne({_id: user_id});
    if(user_data.transaction_via_face){
        console.log('detected and came');
        res.render('payment/without_pin',{user_data,errors:false});
    }else{
        res.redirect('/dashboard/dashboard');
    }
});

app.post('/payment/transactionFace',async (req,res)=>{
    const {sender_email, sender_account_number, reciever_account_number, amount} = req.body;
    let errors = {};
    if(sender_account_number == reciever_account_number){
        errors['reciever_account_number'] = 'Cannot transfer to self';
    }
    const reciever_details = await registerModel.findOne({account_number: reciever_account_number});
    if(!reciever_details){
        errors['reciever_account_number'] = 'No such user found';
    }
    const sender_details = await registerModel.findOne({account_number: sender_account_number});
    if(Number(amount) <= 0){
        errors['amount'] = 'Amount cannot be zero';
    }
    console.log(amount);
    console.log(sender_details.current_balance);
    if(Number(amount) > Number(sender_details.current_balance)){
        errors['amount'] = 'Amount excedded current balance';
    }
    if(Object.keys(errors).length == 0){
        const sender_new_balance = Number(sender_details.current_balance) - Number(amount);
        const reciever_new_balance = Number(reciever_details.current_balance) + Number(amount);
        const addTrasaction = new transaction_history({
            sender_account_number: sender_account_number,
            reciever_account_number: reciever_account_number,
            amount: amount,
            via: 'Face Recognition'
        });
        addTrasaction.save().then(()=>{
            console.log('transaction done');
        }).catch(err=>console.log(err));
        const update_sender = await registerModel.updateOne({account_number: sender_account_number},{$set: {current_balance: sender_new_balance, transaction_via_face:false}},{upsert: true}).catch(err=> console.log(err));
        const update_reciever = await registerModel.updateOne({account_number: reciever_account_number},{$set: {current_balance: reciever_new_balance}},{upsert: true}).catch(err=> console.log(err));
        res.redirect('/dashboard/dashboard');
    }else{
        res.render('payment/without_pin',{user_data: sender_details, errors});
    }
});


//create port
app.listen(3000,()=>{
    console.log("Server Started at localhost:3000");
});