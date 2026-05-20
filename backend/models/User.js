const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  employeeId: {
    type: String,
    required: [true, 'Please add an Employee ID'],
    unique: true,
    uppercase: true,
    trim: true
  },
  gmail: {
    type: String,
    required: [true, 'Please add a Gmail address'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please use a valid email address'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false // Password won't be returned in queries by default
  },
  role: {
    type: String,
    enum: ['superadmin', 'hod', 'supervisor', 'employee', 'user'],
    default: 'user',
    lowercase: true
  },
  department: {
    type: String,
    default: 'NONE', // comma-separated dept keys e.g. "fgmw,pmw,rmw"
  },
  shift: {
    type: String,
    default: 'NONE', // comma-separated shifts e.g. "1,2,3"
  },
  dob: {
    type: Date
  }
}, {
  timestamps: true 
});

// --- ENCRYPTION MIDDLEWARE ---
UserSchema.pre('save', async function() {
  // 1. Only hash if the password is new or changed
  if (!this.isModified('password')) {
    return; 
  }

  try {
    // 2. Generate salt and hash
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    // No next() needed here when using async without the next parameter
  } catch (err) {
    // If there is an error, throw it so Mongoose catches it
    throw new Error(err);
  } 
}); 

// --- PASSWORD MATCHING METHOD ---
UserSchema.methods.matchPassword = async function(enteredPassword) {
  // Note: this.password will only exist if you used .select('+password') in the controller
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema); 