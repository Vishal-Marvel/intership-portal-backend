const bookshelf = require('../connection');
const Internship = require("./internshipModel")
const { v4: uuidv4 } = require('uuid');
const Staff = require('./staffModel')

const bcrypt = require('bcrypt');

const Student = bookshelf.model('Student', {
  tableName: 'students',
  initialize: function() {
    this.on('creating', this.encryptPassword);
    this.on('creating', this.setID);
    // this.on('saving', this.updatePasswordChangedAt);
  },
  internship: function() {
    return this.hasOne(Internship);
  },
  staff: function() {
    return this.belongsTo(Staff, 'staff_id');
  },
  setID:async function(){
    const uuid = uuidv4(null, null, null);
    this.set('id', uuid.toString());
    this.set('registered_date', new Date());

  },
  encryptPassword: async function() {
    if (!this.hasChanged('password')) {
      return;
    }
    const hashedPassword = await bcrypt.hash(this.get('password'), 10);
    this.set('password', hashedPassword);
  },
  verifyPassword: async function(candidatePassword) {
    const password = this.get('password');
    return await bcrypt.compare(candidatePassword, password);
  },


});

module.exports = Student;
