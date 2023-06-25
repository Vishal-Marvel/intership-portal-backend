const bookshelf = require('../connection')
const { v4: uuidv4 } = require('uuid');
const Student = require("./studentModel")

const StaffModel = bookshelf.model('staffs', {
    tableName: 'staffs',
    initialize: function (){
        this.on('creating', this.setID);
    },
    setID:async function(){
        const uuid = uuidv4(null, null, null);
        this.set('id', uuid.toString());
    },
    students: function() {
        return this.hasMany(Student, 'staff_id');
    },
});

module.exports = StaffModel;
