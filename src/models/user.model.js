const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');



const userSchema = new mongoose.Schema({
  name : {
    type: String,
    unique: true,
    required: [true, 'Name is required for creating a account'],
  },
  email:{
    type: String,
    required: [true, 'Email is required'],
    unique: [true, 'Email already exists'],
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required for creating a account.'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },
  systemUser:{
    type: Boolean,
    deafult: false,
    immutable: true,
    select: false
  }
}, {
  timestamps: true
});


userSchema.pre('save', async function() {
  if(!this.isModified("password")){
    return;
  }

  const hash = await bcrypt.hash(this.password, 10);
  this.password = hash;
  return;
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

const userModel = mongoose.model('User', userSchema);

module.exports = userModel;